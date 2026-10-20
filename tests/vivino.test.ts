import "fake-indexeddb/auto";
import test from "node:test";
import assert from "node:assert/strict";
import { zipSync, strToU8 } from "fflate";
import {
  parseCSV,
  readVivinoCSV,
  readVivinoFile,
  planVivinoImport,
  mergeImport,
  vivinoPhotoLink,
  type VivinoRow,
} from "../lib/vivino.ts";
import { emptyArchive } from "../lib/domain.ts";
import { Repository } from "../lib/repository.ts";
const opts = {
  includeWithoutNotes: true,
  includePhotoLinks: true,
  useScanDate: false,
  namespace: "tests",
};
const row = (patch: Partial<VivinoRow> = {}): VivinoRow =>
  ({
    Winery: "Test winery",
    "Wine name": "Test wine",
    Vintage: "2020",
    Country: "France",
    Region: "Alsace",
    "Regional wine style": "Alsace white",
    "Average rating": "4.2",
    "Your rating": "5",
    "Your review": "",
    "Personal Note": "원문 메모\n두 번째 줄",
    "Wine type": "White Wine",
    "Link to wine": "https://www.vivino.com/wines/123",
    "Scan date": "2026-09-10 13:57:54",
    "Label image": "https://images.vivino.com/labels/test_123.jpg",
    ...patch,
  }) as VivinoRow;
const csv = (rs: VivinoRow[]) => {
  const hs = Object.keys(rs[0]);
  const cell = (v: string) => '"' + v.replaceAll('"', '""') + '"';
  return (
    hs.map(cell).join(",") +
    "\r\n" +
    rs.map((r) => hs.map((h) => cell(r[h] || "")).join(",")).join("\r\n")
  );
};
test("RFC4180 parsing preserves Korean multiline notes, commas, escaped quotes and trailing cells", () => {
  const note = '  향, 맛은 "좋음"\n다음 줄\r\n끝  ';
  const rs = readVivinoCSV("\uFEFF" + csv([row({ "Personal Note": note })]));
  assert.equal(rs[0]["Personal Note"], note);
  assert.deepEqual(parseCSV("a,b,\r\n1,2,\r\n"), [
    ["a", "b", ""],
    ["1", "2", ""],
  ]);
  assert.throws(() => parseCSV('a,"unclosed'));
  assert.throws(() => readVivinoCSV("name,note\na,b"));
});
test("ZIP reads only full_wine_list.csv and never needs account, login or profile data", async () => {
  const archive = zipSync({
    "vivino_data/full_wine_list.csv": strToU8(csv([row()])),
    "vivino_data/user_profile.csv": strToU8("private,ignore"),
    "vivino_data/last_login_information.csv": strToU8("do not process"),
  });
  const file = new File([new Uint8Array(archive)], "export.zip");
  const rs = await readVivinoFile(file);
  assert.equal(rs.length, 1);
  assert.equal(rs[0]["Personal Note"], "원문 메모\n두 번째 줄");
});
test("Default import preserves exact personal notes, empty sensory and unknown tasting dates", async () => {
  const note = '  Personal Memo\n원문 "표현", 그대로  ';
  const p = await planVivinoImport(
    [row({ "Personal Note": note })],
    emptyArchive(),
    opts,
  );
  const t = p.additions.tastings[0];
  assert.equal(t.notes, note);
  assert.equal(t.source?.personal_note, note);
  assert.equal(t.source?.scan_date, "2026-09-10 13:57:54");
  assert.equal(t.tasted_on, null);
  assert.deepEqual(t.sensory, {});
  assert.equal(p.additions.origins[0].latitude, null);
  assert.equal(p.additions.beverages[0].metadata.color, "White");
  assert.equal(
    Object.keys(t).some((k) => /rating|score/i.test(k)),
    false,
  );
});
test("Explicit source ID + vintage links repeat notes but separates different vintages and similar names", async () => {
  const p = await planVivinoImport(
    [
      row(),
      row({ "Personal Note": "다른 날의 메모" }),
      row({ Vintage: "2021" }),
      row({ "Link to wine": "https://www.vivino.com/wines/456" }),
    ],
    emptyArchive(),
    opts,
  );
  assert.equal(p.additions.beverages.length, 3);
  assert.equal(p.additions.tastings.length, 4);
  assert.equal(
    p.additions.tastings[0].beverage_id,
    p.additions.tastings[1].beverage_id,
  );
});
test("Unlabelled scans skipped; note-free named wines are products without invented tasting experiences", async () => {
  const p = await planVivinoImport(
    [
      row({ "Personal Note": "" }),
      row({ "Wine name": "", "Link to wine": "", "Personal Note": "" }),
    ],
    emptyArchive(),
    opts,
  );
  assert.equal(p.report.unnamedRows, 1);
  assert.equal(p.additions.beverages.length, 1);
  assert.equal(p.additions.tastings.length, 0);
  assert.equal(p.additions.photos[0].beverage_id, p.additions.beverages[0].id);
  const notesOnly = await planVivinoImport(
    [row({ "Personal Note": "" })],
    emptyArchive(),
    { ...opts, includeWithoutNotes: false },
  );
  assert.equal(notesOnly.additions.beverages.length, 0);
});
test("Reimport skips existing records and preserves user edits even if community ratings change", async () => {
  const p = await planVivinoImport([row()], emptyArchive(), opts);
  const a = mergeImport(emptyArchive(), p.additions);
  a.tastings[0].notes = "사용자가 수정한 메모";
  a.beverages[0].name = "수정한 제품명";
  const second = await planVivinoImport(
    [row({ "Average rating": "4.8" })],
    a,
    opts,
  );
  assert.equal(second.report.newBeverages, 0);
  assert.equal(second.report.newTastings, 0);
  assert.equal(second.report.newPhotos, 0);
  assert.equal(second.report.existingNoteRows, 1);
  assert.equal(
    mergeImport(a, second.additions).tastings[0].notes,
    "사용자가 수정한 메모",
  );
});
test("Both personal note and review preserved separately; scan date opt-in only; Sparkling does not imply a color", async () => {
  const p = await planVivinoImport(
    [row({ "Your review": "Review original", "Wine type": "Sparkling" })],
    emptyArchive(),
    { ...opts, useScanDate: true },
  );
  const t = p.additions.tastings[0];
  assert(t.notes.includes("Review original"));
  assert.equal(t.source?.review, "Review original");
  assert.equal(t.tasted_on, "2026-09-10");
  assert.equal(p.additions.beverages[0].metadata.sparkling, true);
  assert.equal(p.additions.beverages[0].metadata.color, undefined);
});
test("Image links restricted to Vivino labels; IDs separated between account namespaces", async () => {
  assert.equal(vivinoPhotoLink("https://evil.test/x.jpg"), null);
  assert.equal(vivinoPhotoLink("javascript:alert(1)"), null);
  assert.equal(
    vivinoPhotoLink("https://images.vivino.com.evil.test/labels/a.jpg"),
    null,
  );
  assert.equal(
    vivinoPhotoLink("https://images.vivino.com/labels/test_123.jpg"),
    "https://images.vivino.com/labels/test_123.jpg",
  );
  const a = await planVivinoImport([row()], emptyArchive(), opts);
  const b = await planVivinoImport([row()], emptyArchive(), {
    ...opts,
    namespace: "another-user",
  });
  assert.notEqual(a.additions.beverages[0].id, b.additions.beverages[0].id);
});
test("Browser import persists after reopening; reimport is idempotent and invalid plan rolls back", async () => {
  const r = new Repository({ supabaseUrl: "", supabaseKey: "", mapStyle: "" });
  const p = await planVivinoImport([row()], await r.load(), {
    ...opts,
    namespace: "persistence-test",
  });
  await r.importVivino(p);
  let a = await new Repository({
    supabaseUrl: "",
    supabaseKey: "",
    mapStyle: "",
  }).load();
  assert(a.tastings.some((t) => t.id === p.additions.tastings[0].id));
  const second = await planVivinoImport([row()], a, {
    ...opts,
    namespace: "persistence-test",
  });
  await r.importVivino(second);
  a = await r.load();
  assert.equal(
    a.tastings.filter((t) => t.id === p.additions.tastings[0].id).length,
    1,
  );
  const invalid = structuredClone(p);
  invalid.additions.beverages[0].id = crypto.randomUUID();
  invalid.additions.tastings[0].beverage_id = "missing";
  await assert.rejects(() => r.importVivino(invalid));
  assert.equal(
    (await r.load()).beverages.some(
      (b) => b.id === invalid.additions.beverages[0].id,
    ),
    false,
  );
  for (const b of p.additions.beverages) await r.remove("beverage", b.id);
});
