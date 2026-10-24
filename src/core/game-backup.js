import { zipSync, unzipSync, strToU8 } from "fflate";
import { digest } from "./bind.js";
const NAMES = ["SLUS_004.02", "TEKKEN3.BNS"];
export async function backupGameFiles({ executable, bns }) {
  const data = [executable, bns],
    manifest = {
      schema: "t3cs-game-backup/1",
      files: await Promise.all(
        NAMES.map(async (name, i) => ({
          name,
          bytes: data[i].length,
          sha256: await digest(data[i]),
        })),
      ),
    };
  return zipSync(
    {
      ...Object.fromEntries(NAMES.map((name, i) => [name, data[i]])),
      "manifest.json": strToU8(JSON.stringify(manifest, null, 2)),
    },
    { level: 1 },
  );
}
export async function readGameBackup(input) {
  let total = 0;
  const zip = unzipSync(input, {
    filter: (file) => {
      if (![...NAMES, "manifest.json"].includes(file.name))
        throw Error("Unexpected file in game backup");
      total += file.originalSize;
      if (!Number.isFinite(total) || total > 1024 ** 3)
        throw Error("Game backup exceeds the 1 GiB restore limit");
      return true;
    },
  });
  if (Object.keys(zip).length !== 3 || !zip["manifest.json"])
    throw Error("Incomplete game backup");
  const manifest = JSON.parse(new TextDecoder().decode(zip["manifest.json"]));
  if (manifest.schema !== "t3cs-game-backup/1" || manifest.files?.length !== 2)
    throw Error("Invalid backup schema");
  return Promise.all(
    NAMES.map(async (name) => {
      const record = manifest.files.find((f) => f.name === name),
        data = zip[name];
      if (
        !record ||
        !data ||
        data.length !== record.bytes ||
        (await digest(data)) !== record.sha256
      )
        throw Error("Corrupt game backup");
      return { name, data, sha256: record.sha256 };
    }),
  );
}
