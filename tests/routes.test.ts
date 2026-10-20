import test from "node:test";
import assert from "node:assert/strict";
import { parseRouteHash, routeHash } from "../web/route.ts";
test("Pages routes preserve detail IDs, query and back navigation fragments", () => {
  assert.deepEqual(parseRouteHash("#/tastings/new?beverage=abc"), {
    pathname: "/tastings/new",
    search: "beverage=abc",
  });
  assert.equal(routeHash("/beverages/abc"), "#/beverages/abc");
  assert.equal(
    parseRouteHash("#/tastings/abc/edit").pathname,
    "/tastings/abc/edit",
  );
});
test("Supabase auth fragments are not treated as application routes or altered", () => {
  const hash = "#access_token=private&refresh_token=private&type=magiclink";
  assert.deepEqual(parseRouteHash(hash), { pathname: "/archive", search: "" });
  assert.deepEqual(parseRouteHash(""), { pathname: "/archive", search: "" });
  assert.throws(() => routeHash("//external.test"));
  assert.throws(() => routeHash("https://external.test"));
});
