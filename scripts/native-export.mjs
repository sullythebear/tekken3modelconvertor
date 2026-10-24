import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { buildNativeCandidate } from "../src/core/exporter.js";
const args = Object.fromEntries(
  process.argv.slice(2).reduce((a, value, i, all) => {
    if (value.startsWith("--")) a.push([value.slice(2), all[i + 1]]);
    return a;
  }, []),
);
for (const name of ["donor", "parts", "model-id", "out"])
  if (!args[name])
    throw Error(
      `Missing --${name}. Input parts must be already calibrated into donor-local frames. This tool does not retarget source meshes.`,
    );
const donor = new Uint8Array(await readFile(args.donor)),
  profile = JSON.parse(await readFile(args.parts, "utf8")),
  hash = createHash("sha256").update(donor).digest("hex");
if (profile.donorSha256 !== hash)
  throw Error("Calibration profile does not match donor SHA256");
if (profile.coordinateSpace !== "tekken3-donor-local")
  throw Error("Expected calibrated donor-local coordinates");
const textures = [];
if (args.textures)
  for (const name of (await readdir(args.textures)).sort())
    if (name.endsWith(".tim"))
      textures.push(
        new Uint8Array(await readFile(path.join(args.textures, name))),
      );
const result = buildNativeCandidate({
  donor,
  modelId: Number(args["model-id"]),
  parts: profile.parts,
  textureTiles: textures,
  maxBytes: donor.length,
});
await mkdir(args.out, { recursive: true });
await writeFile(path.join(args.out, "candidate.3dm"), result.native.model);
await writeFile(
  path.join(args.out, "candidate.relocs"),
  result.native.relocations,
);
await writeFile(
  path.join(args.out, "candidate-model.bin"),
  result.container.bytes,
);
await writeFile(
  path.join(args.out, "manifest.json"),
  JSON.stringify(
    {
      ...result.manifest,
      donorSha256: hash,
      calibrationProvenance: profile.provenance ?? "unspecified",
    },
    null,
    2,
  ),
);
console.log(
  `Wrote native STRUCTURAL CANDIDATE: ${result.native.bytes} bytes, ${result.native.packetBytes} packet bytes. Not game-verified; do not install as a playable mod.`,
);
