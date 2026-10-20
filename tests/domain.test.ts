import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyArchive,
  applyTasting,
  deleteBeverage,
  aromaSuggestions,
  validateRecord,
  validateOrigin,
  matches,
  noFilters,
  exportArchive,
  type Beverage,
  type Tasting,
  type Origin,
} from "../lib/domain.ts";
const beverage = (): Beverage => ({
  id: "b1",
  category: "tea",
  name: "포랑산 노수차",
  producer: "",
  year: 2006,
  subtype: "Sheng Pu-erh",
  metadata: {},
  origin_ids: [],
  created_at: "2026-10-19",
  updated_at: "2026-10-19",
});
const tasting = (id = "t1"): Tasting => ({
  id,
  beverage_id: "b1",
  tasted_on: "2026-10-19",
  notes: "나무 향이 나고 부드럽다",
  sensory: {},
  observations: {},
  brewing: {},
  aromas: [],
  infusions: [],
  drinking_location: "Seoul",
  created_at: "2026-10-19",
  updated_at: "2026-10-19",
});
test("First record then repeat tasting reuses one beverage, preserves notes and unset sensory", () => {
  let a = applyTasting(emptyArchive(), beverage(), tasting(), [], []);
  a = applyTasting(
    a,
    beverage(),
    { ...tasting("t2"), notes: "두 번째", aromas: ["난향"] },
    [],
    [],
  );
  assert.equal(a.beverages.length, 1);
  assert.equal(a.tastings.length, 2);
  assert.equal(a.tastings[0].notes, "나무 향이 나고 부드럽다");
  assert.deepEqual(a.tastings[1].sensory, {});
  assert.deepEqual(a.tastings[0].infusions, []);
});
test("Editing one tasting and three infusions preserves other experiences", () => {
  const b = beverage();
  let a = applyTasting(emptyArchive(), b, tasting(), [], []);
  a = applyTasting(a, b, tasting("t2"), [], []);
  const t = {
    ...tasting(),
    infusions: [1, 2, 3].map((n) => ({
      id: "i" + n,
      infusion_number: n,
      duration_seconds: n * 10,
      temperature: null,
      aroma: "",
      taste: "우림" + n,
      notes: "",
    })),
  };
  a = applyTasting(a, b, t, [], []);
  assert.equal(a.tastings.length, 2);
  assert.equal(
    a.tastings.find((t) => t.id === "t1")?.infusions[2].duration_seconds,
    30,
  );
  assert.equal(a.tastings.find((t) => t.id === "t2")?.infusions.length, 0);
});
test("Wine color and sparkling suggestions combine without destroying custom selections", () => {
  const s = aromaSuggestions("wine", "White", {
    color: "White",
    sparkling: true,
  });
  assert(s.includes("Lemon"));
  assert(s.includes("Brioche"));
  assert(!s.includes("Leather"));
  assert(aromaSuggestions("tea", "Shou Pu-erh", {}).includes("Earth"));
  assert(aromaSuggestions("tea", "Green", {}).includes("Grass"));
});
test("Unset sensory stays absent and invalid scores are rejected", () => {
  assert.doesNotThrow(() => validateRecord(beverage(), tasting()));
  for (const score of [0, 6, 2.5])
    assert.throws(() =>
      validateRecord(beverage(), { ...tasting(), sensory: { body: score } }),
    );
});
test("Search matches Korean notes, origins, aroma and intersects filters", () => {
  const o: Origin = {
    id: "o1",
    country: "China",
    region: "Yunnan",
    subregion: "Bulangshan",
    display_name: "포랑산",
    latitude: 22,
    longitude: 100,
    confirmed: true,
    precision: "region",
  };
  const b = { ...beverage(), origin_ids: ["o1"] };
  const a = applyTasting(
    emptyArchive(),
    b,
    { ...tasting(), aromas: ["Honey"] },
    [o],
    [],
  );
  for (const q of ["부드럽다", "포랑산", "YUNNAN", "honey"])
    assert(matches(a, b, q, noFilters()));
  assert(!matches(a, b, "Honey", { ...noFilters(), category: "wine" }));
  assert(!matches(a, b, "Honey", { ...noFilters(), photo: true }));
  assert(
    matches(a, b, "Honey", { ...noFilters(), country: "China", year: "2006" }),
  );
});
test("Invalid and unconfirmed coordinates are rejected; no coordinates allowed", () => {
  const o: Origin = {
    id: "o",
    country: "China",
    region: "Yunnan",
    subregion: "",
    display_name: "",
    latitude: null,
    longitude: null,
    confirmed: false,
    precision: "unresolved",
  };
  assert.doesNotThrow(() => validateOrigin(o));
  assert.throws(() => validateOrigin({ ...o, latitude: 22, longitude: 100 }));
  assert.throws(() =>
    validateOrigin({ ...o, latitude: 91, longitude: 100, confirmed: true }),
  );
  assert.throws(() => validateOrigin({ ...o, latitude: 22 }));
});
test("Beverage delete cascades only linked tastings and photos", () => {
  let a = applyTasting(
    emptyArchive(),
    beverage(),
    tasting(),
    [],
    [
      {
        id: "p",
        beverage_id: null,
        tasting_id: "t1",
        url: "data:image/jpeg;base64,eA==",
        is_cover: true,
        sort_order: 0,
      },
    ],
  );
  a = applyTasting(
    a,
    { ...beverage(), id: "b2" },
    { ...tasting("t2"), beverage_id: "b2" },
    [],
    [],
  );
  a = deleteBeverage(a, "b1");
  assert.deepEqual(
    a.beverages.map((b) => b.id),
    ["b2"],
  );
  assert.deepEqual(
    a.tastings.map((t) => t.id),
    ["t2"],
  );
  assert.equal(a.photos.length, 0);
});
test("Export accurately declares actual photo data versus private references", () => {
  const a = emptyArchive();
  a.photos = [
    {
      id: "p",
      beverage_id: null,
      tasting_id: "t",
      url: "https://example.com/signed",
      storage_path: "user/p.jpg",
      is_cover: true,
      sort_order: 0,
    },
  ];
  assert.equal(exportArchive(a).photos_included, false);
  a.photos[0].url = "data:image/jpeg;base64,eA==";
  assert.equal(exportArchive(a).photos_included, true);
});
