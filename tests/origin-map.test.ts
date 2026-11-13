import test from "node:test";
import assert from "node:assert/strict";
import { originMapPosition } from "../lib/origin-map.ts";
import type { Origin } from "../lib/domain.ts";

function origin(changes: Partial<Origin> = {}): Origin {
  return {
    id: "origin-1", country: "France", region: "Bourgogne", subregion: "",
    display_name: "Bourgogne", latitude: null, longitude: null,
    precision: "unresolved", confirmed: false, ...changes,
  };
}

test("Imported region without confirmed coordinates appears as an approximate map point", () => {
  const item = origin();
  const pos = originMapPosition(item);
  assert.equal(pos?.source, "region");
  assert.deepEqual(pos?.coordinates, [4.8, 47.05]);
  assert.equal(item.confirmed, false);
  assert.equal(item.latitude, null);
});

test("Unrecognized subregion falls back to known larger region", () => {
  const pos = originMapPosition(origin({
    country: "China", region: "Yunnan", subregion: "Baiying Shan",
  }));
  assert.equal(pos?.source, "region");
  assert.deepEqual(pos?.coordinates, [101.5, 24.3]);
});

test("Country marker is approximate when region is unknown", () => {
  assert.equal(originMapPosition(origin({ region: "Vin de France" }))?.source, "country");
});

test("Saved verified coordinates take priority over any approximation", () => {
  const pos = originMapPosition(origin({
    latitude: 47.2, longitude: 4.1, confirmed: true, precision: "exact",
  }));
  assert.equal(pos?.source, "confirmed");
  assert.deepEqual(pos?.coordinates, [4.1, 47.2]);
});

test("Unknown location does not create a fabricated marker", () => {
  assert.equal(originMapPosition(origin({ country: "Unknown", region: "" })), null);
});
