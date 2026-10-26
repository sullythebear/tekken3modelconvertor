import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdtemp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as THREE from "three";
import { binaryFBX } from "../scripts/fixtures.mjs";
import { patchFBX } from "../scripts/extended-loader-patches.mjs";
const original = await readFile(
  new URL(
    "../node_modules/three/examples/jsm/loaders/FBXLoader.js",
    import.meta.url,
  ),
  "utf8",
);
await mkdir("artifacts/loader-tests", { recursive: true });
const folder = await mkdtemp(path.resolve("artifacts/loader-tests/lifetime-"));
after(async () => rm(folder, { recursive: true, force: true }));
async function loader(releaseParseState) {
  const text =
    patchFBX(original, { releaseParseState })
      .replaceAll(
        "'../libs/fflate.module.js'",
        "'three/addons/libs/fflate.module.js'",
      )
      .replaceAll(
        "'../curves/NURBSCurve.js'",
        "'three/addons/curves/NURBSCurve.js'",
      ) +
    "\nexport function testState(){return {fbxTree,connections,sceneGraph};}\n";
  const file = path.join(
    folder,
    releaseParseState ? "released.mjs" : "legacy.mjs",
  );
  await writeFile(file, text);
  return import(pathToFileURL(file).href);
}
const freed = await loader(true),
  legacy = await loader(false);
const bytes = (version = 7400, options = {}) => {
  const b = binaryFBX(version, 12, options);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};
function snapshot(root) {
  root.updateMatrixWorld(true);
  const list = [];
  root.traverse((n) => {
    if (!n.isMesh) return;
    list.push({
      name: n.name,
      attributes: Object.fromEntries(
        Object.entries(n.geometry.attributes).map(([k, a]) => [
          k,
          { itemSize: a.itemSize, array: Array.from(a.array) },
        ]),
      ),
      index: n.geometry.index ? Array.from(n.geometry.index.array) : null,
      bones: n.skeleton?.bones.map((b) => b.name),
      inverses: n.skeleton?.boneInverses.map((m) => m.toArray()),
      clips: root.animations.map((a) => a.toJSON()),
    });
  });
  return list;
}
for (const version of [7400, 7500, 7700])
  test(`FBX ${version} releases temporary parse state while retaining all twelve influences and the returned scene`, () => {
    const before = legacy.FBXLoader.prototype.parse.call(
        new legacy.FBXLoader(),
        bytes(version),
        "",
      ),
      expected = snapshot(before),
      root = new freed.FBXLoader().parse(bytes(version), "");
    assert.deepEqual(snapshot(root), expected);
    assert.ok(
      expected.some((m) => m.attributes.joints_2 && m.attributes.weights_2),
    );
    assert.deepEqual(freed.testState(), {
      fbxTree: undefined,
      connections: undefined,
      sceneGraph: undefined,
    });
    assert.ok(legacy.testState().fbxTree.Objects);
    const saved = snapshot(root);
    new freed.FBXLoader().parse(bytes(version), "");
    assert.deepEqual(
      snapshot(root),
      saved,
      "Subsequent parsing must not dispose the earlier returned scene",
    );
  });
test("A downstream texture-loader failure releases raw state and permits the next valid FBX import", () => {
  const manager = new THREE.LoadingManager();
  manager.addHandler(/\.png$/, {
    path: "",
    setPath(p) {
      this.path = p;
      return this;
    },
    load() {
      assert.ok(freed.testState().fbxTree.Objects);
      assert.ok(freed.testState().connections instanceof Map);
      throw Error("Authored texture dependency failed");
    },
  });
  assert.throws(
    () =>
      new freed.FBXLoader(manager).parse(
        bytes(7400, { linkedTexture: true }),
        "",
      ),
    /Authored texture dependency failed/,
  );
  assert.deepEqual(freed.testState(), {
    fbxTree: undefined,
    connections: undefined,
    sceneGraph: undefined,
  });
  assert.ok(
    snapshot(new freed.FBXLoader().parse(bytes(), ""))[0].attributes.weights_2,
  );
});
test("Deferred source texture hydration remains attached to the returned material after parse globals are released", async () => {
  const manager = new THREE.LoadingManager();
  let texture, finish;
  const hydrated = new Promise((resolve) => (finish = resolve));
  manager.addHandler(/\.png$/, {
    path: "",
    setPath(p) {
      this.path = p;
      return this;
    },
    load() {
      texture = new THREE.Texture();
      setImmediate(() => {
        texture.image = {
          width: 1,
          height: 1,
          data: new Uint8Array([200, 150, 100, 255]),
        };
        texture.needsUpdate = true;
        finish();
      });
      return texture;
    },
  });
  const root = new freed.FBXLoader(manager).parse(
    bytes(7500, { linkedTexture: true }),
    "",
  );
  assert.equal(freed.testState().fbxTree, undefined);
  await hydrated;
  let maps = [];
  root.traverse((n) => {
    if (n.isMesh)
      maps.push(
        ...(Array.isArray(n.material) ? n.material : [n.material]).map(
          (m) => m.map,
        ),
      );
  });
  assert.ok(maps.includes(texture));
  assert.deepEqual(Array.from(texture.image.data), [200, 150, 100, 255]);
  assert.ok(snapshot(root)[0].attributes.weights_2);
});
test("An upstream FBX loader change fails the guarded build patch instead of silently retaining or corrupting state", () => {
  assert.throws(
    () =>
      patchFBX(
        original.replace(
          "return new FBXTreeParser( textureLoader, this.manager, this.trimAnimationClips ).parse( fbxTree );",
          "return changedUpstreamParser();",
        ),
      ),
    /no longer matches/,
  );
});
