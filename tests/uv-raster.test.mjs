import test from "node:test";
import assert from "node:assert/strict";
import { uvRasterLookup } from "../src/core/uv-raster.js";
const p = (x, y) => ({ x, y });
test("UV pixel-centre lookup completely covers a split square with deterministic diagonal ties", () => {
  const a = [p(0, 0), p(1, 0), p(0, 1)],
    b = [p(1, 0), p(1, 1), p(0, 1)],
    r = uvRasterLookup([a, b], 8);
  assert.equal(r.filter((v) => v === 0).length, 36);
  assert.equal(r.filter((v) => v === 1).length, 28);
  assert.ok(r.every((v) => v >= 0));
  assert.deepEqual(uvRasterLookup([[...a].reverse(), [...b].reverse()], 8), r);
});
test("UV overlap uses the first source face and degenerate or out-of-tile charts remain empty", () => {
  const a = [p(0, 0), p(1, 0), p(0, 1)],
    r = uvRasterLookup([a, a], 8);
  assert.ok(r.every((v) => v !== 1));
  assert.ok(
    uvRasterLookup([[p(0.5, 0.5), p(0.5, 0.5), p(0.5, 0.5)]], 8).every(
      (v) => v === -1,
    ),
  );
  assert.ok(
    uvRasterLookup([[p(2, 2), p(3, 2), p(2, 3)]], 8).every((v) => v === -1),
  );
});
test("UV raster clips large charts to actual target pixels without discarding covered boundaries", () => {
  assert.ok(
    uvRasterLookup([[p(-1, -1), p(3, -1), p(-1, 3)]], 8).every((v) => v === 0),
  );
  assert.throws(() => uvRasterLookup([], 0), /dimensions/);
});
