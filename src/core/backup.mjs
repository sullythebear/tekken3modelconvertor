import {
  readFile,
  writeFile,
  mkdir,
  rename,
  lstat,
  realpath,
  unlink,
} from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
export const sha256 = (b) => createHash("sha256").update(b).digest("hex");
async function confined(root, relative) {
  if (
    path.isAbsolute(relative) ||
    relative.split(/[\\/]/).some((p) => p === ".." || p === "")
  )
    throw Error("Unsafe relative path");
  const base = await realpath(root),
    target = path.resolve(base, relative);
  if (!target.startsWith(base + path.sep)) throw Error("Outside installation");
  let current = base;
  for (const part of relative.split(/[\\/]/)) {
    current = path.join(current, part);
    const st = await lstat(current);
    if (st.isSymbolicLink()) throw Error("Symlinks are not accepted");
  }
  return target;
}
async function atomic(target, data) {
  const temp = target + ".t3cs-" + randomUUID();
  try {
    await writeFile(temp, data, { flag: "wx" });
    await rename(temp, target);
  } finally {
    await unlink(temp).catch(() => {});
  }
}
export async function applyPatch(root, backupRoot, plan) {
  if (!plan.length) throw Error("Empty patch plan");
  const resolved = [],
    names = new Set();
  for (const e of plan) {
    if (names.has(e.path)) throw Error("Duplicate patch target");
    names.add(e.path);
    const target = await confined(root, e.path),
      before = await readFile(target);
    if (sha256(before) !== e.expectedSha256)
      throw Error(`Installation changed: ${e.path}`);
    resolved.push({
      target,
      before,
      after: new Uint8Array(e.data),
      path: e.path,
    });
  }
  const backup = path.join(backupRoot, "t3cs-" + randomUUID());
  await mkdir(backup, { recursive: true });
  const manifest = { version: 1, entries: [] };
  for (let i = 0; i < resolved.length; i++) {
    const e = resolved[i];
    await writeFile(path.join(backup, `${i}.bin`), e.before, { flag: "wx" });
    manifest.entries.push({
      path: e.path,
      backup: `${i}.bin`,
      before: sha256(e.before),
      after: sha256(e.after),
    });
  }
  await writeFile(
    path.join(backup, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    { flag: "wx" },
  );
  const done = [];
  try {
    for (const e of resolved) {
      if (sha256(await readFile(e.target)) !== sha256(e.before))
        throw Error("Concurrent installation change");
      await atomic(e.target, e.after);
      done.push(e);
    }
  } catch (e) {
    for (const x of done.reverse()) await atomic(x.target, x.before);
    throw e;
  }
  return backup;
}
export async function restorePatch(root, backup) {
  const manifest = JSON.parse(
    await readFile(path.join(backup, "manifest.json"), "utf8"),
  );
  if (
    manifest.version !== 1 ||
    !Array.isArray(manifest.entries) ||
    !manifest.entries.length
  )
    throw Error("Invalid backup manifest");
  const pending = [],
    names = new Set();
  for (const e of manifest.entries) {
    if (names.has(e.path)) throw Error("Duplicate restore target");
    names.add(e.path);
    if (!/^\d+\.bin$/.test(e.backup)) throw Error("Unsafe backup filename");
    const target = await confined(root, e.path),
      before = await readFile(path.join(backup, e.backup)),
      current = await readFile(target);
    if (sha256(before) !== e.before) throw Error("Corrupt backup");
    if (sha256(current) !== e.after)
      throw Error(`Refusing to overwrite changed file: ${e.path}`);
    pending.push({ target, before, current });
  }
  const done = [];
  try {
    for (const e of pending) {
      await atomic(e.target, e.before);
      done.push(e);
    }
  } catch (e) {
    for (const e of done.reverse()) await atomic(e.target, e.current);
    throw e;
  }
  return pending.length;
}

// Restore a validated two-file game backup. Existing target files get a reversible backup.
export async function restoreGameFiles(root, backupRoot, entries) {
  const expected = new Set(["SLUS_004.02", "TEKKEN3.BNS"]);
  if (
    entries.length !== 2 ||
    entries.some((e) => !expected.delete(e.name)) ||
    expected.size
  )
    throw Error("Backup must contain exactly the original executable and BNS");
  const base = await realpath(root),
    existing = [],
    created = [];
  for (const e of entries) {
    if (sha256(e.data) !== e.sha256) throw Error("Game backup hash mismatch");
    const target = path.join(base, e.name);
    let stat;
    try {
      stat = await lstat(target);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (stat) {
      if (!stat.isFile() || stat.isSymbolicLink())
        throw Error("Unsafe existing restore target");
      existing.push({
        path: e.name,
        expectedSha256: sha256(await readFile(target)),
        data: e.data,
      });
    }
  }
  let backup = null;
  try {
    if (existing.length) backup = await applyPatch(base, backupRoot, existing);
    for (const e of entries)
      if (!existing.some((x) => x.path === e.name)) {
        const target = path.join(base, e.name);
        await writeFile(target, e.data, { flag: "wx" });
        created.push(target);
      }
    return { restored: 2, replaced: existing.length, rollbackBackup: backup };
  } catch (error) {
    for (const p of created) await unlink(p);
    if (backup) await restorePatch(base, backup);
    throw error;
  }
}
