import "fake-indexeddb/auto";
import test from "node:test";
import assert from "node:assert/strict";
import { Repository, readDraft, writeDraft } from "../lib/repository.ts";
import {
  uid,
  emptyArchive,
  type Beverage,
  type Tasting,
} from "../lib/domain.ts";
const config = { supabaseUrl: "", supabaseKey: "", mapStyle: "" };
const beverage = (): Beverage => ({
  id: uid(),
  category: "tea",
  name: "포랑산",
  producer: "",
  subtype: "Sheng Pu-erh",
  year: 2006,
  metadata: {},
  origin_ids: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});
const tasting = (bid: string): Tasting => ({
  id: uid(),
  beverage_id: bid,
  tasted_on: null,
  notes: "한 줄의 기록",
  drinking_location: "",
  sensory: {},
  observations: {},
  brewing: {},
  aromas: ["나무 향"],
  infusions: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});
test("IndexedDB transaction persists first record and photo after repository recreation; repeat is independent", async () => {
  const r = new Repository(config);
  const b = beverage();
  const t = tasting(b.id);
  await r.save({
    beverage: b,
    tasting: t,
    origins: [],
    photos: [
      {
        id: uid(),
        beverage_id: null,
        tasting_id: t.id,
        url: "data:image/jpeg;base64,eA==",
        sort_order: 0,
        is_cover: true,
      },
    ],
  });
  const reopened = new Repository(config);
  let a = await reopened.load();
  assert.equal(a.beverages.find((x) => x.id === b.id)?.name, "포랑산");
  assert.equal(
    a.photos.find((x) => x.tasting_id === t.id)?.url,
    "data:image/jpeg;base64,eA==",
  );
  const t2 = {
    ...tasting(b.id),
    notes: "두 번째",
    infusions: [1, 2, 3].map((n) => ({
      id: uid(),
      infusion_number: n,
      duration_seconds: n * 15,
      temperature: null,
      aroma: "",
      taste: "맛" + n,
      notes: "",
    })),
  };
  await reopened.save({ beverage: b, tasting: t2, origins: [], photos: [] });
  a = await new Repository(config).load();
  assert.equal(a.beverages.filter((x) => x.id === b.id).length, 1);
  assert.equal(a.tastings.filter((x) => x.beverage_id === b.id).length, 2);
  assert.equal(a.tastings.find((x) => x.id === t.id)?.notes, "한 줄의 기록");
  assert.equal(
    a.tastings.find((x) => x.id === t2.id)?.infusions[2].duration_seconds,
    45,
  );
  assert.deepEqual(a.tastings.find((x) => x.id === t.id)?.sensory, {});
  await reopened.remove("tasting", t2.id);
  assert.equal(
    (await reopened.load()).tastings.some((x) => x.id === t2.id),
    false,
  );
  await reopened.remove("beverage", b.id);
  a = await reopened.load();
  assert.equal(
    a.photos.some((x) => x.tasting_id === t.id),
    false,
  );
  assert.equal(
    a.tastings.some((x) => x.id === t.id),
    false,
  );
});
test("Concurrent saves to IndexedDB preserve both records", async () => {
  const r = new Repository(config);
  const b1 = beverage(),
    b2 = beverage();
  await Promise.all([
    r.save({ beverage: b1, tasting: tasting(b1.id), origins: [], photos: [] }),
    r.save({ beverage: b2, tasting: tasting(b2.id), origins: [], photos: [] }),
  ]);
  const a = await r.load();
  assert(a.beverages.some((b) => b.id === b1.id));
  assert(a.beverages.some((b) => b.id === b2.id));
  await r.remove("beverage", b1.id);
  await r.remove("beverage", b2.id);
});
test("Invalid save does not partially create a beverage", async () => {
  const r = new Repository(config);
  const b = beverage();
  await assert.rejects(() =>
    r.save({
      beverage: b,
      tasting: { ...tasting(b.id), sensory: { body: 9 } },
      origins: [],
      photos: [],
    }),
  );
  assert.equal(
    (await r.load()).beverages.some((x) => x.id === b.id),
    false,
  );
});
test("Draft recovery retains photos and notes and clears explicitly", async () => {
  const draft = { notes: "메모", photos: ["data:image/jpeg;base64,eA=="] };
  await writeDraft("test-user:new", draft);
  assert.deepEqual(await readDraft("test-user:new"), draft);
  assert.equal(await readDraft("other-user:new"), null);
  await writeDraft("test-user:new", null);
  assert.equal(await readDraft("test-user:new"), null);
});
