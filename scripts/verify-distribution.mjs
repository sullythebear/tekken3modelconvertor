import assert from 'node:assert/strict';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {extractFile} from '@electron/asar';
import path from 'node:path';
try {
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const asar = 'release/win-unpacked/resources/app.asar';
// ASAR traverses directories using the host path separator. On Windows a
// slash-delimited multi-level directory would be treated as one header key.
const extract = file => extractFile(asar, path.normalize(file));
const hashes = {};
for (const file of ['dist/app.js', 'dist/index.html', 'dist/style.css', 'src/desktop/main.cjs', 'src/desktop/preload.cjs', 'src/core/backup.mjs', 'src/core/disc-image.mjs']) {
  const packaged = extract(file), current = await readFile(file);
  assert.ok(packaged.equals(current), `Packaged ${file} differs from workspace`);
  hashes[file] = createHash('sha256').update(packaged).digest('hex');
}
const bundledPackage = JSON.parse(extract('package.json').toString());
for (const key of ['name', 'version', 'main', 'type', 'dependencies']) assert.deepEqual(bundledPackage[key], pkg[key], `Packaged package field ${key}`);
assert.match(extract('dist/index.html').toString(), new RegExp(pkg.version.replaceAll('.', '\\.')));
const inner = await readFile('release/win-unpacked/Tekken 3 Conversion Studio.exe');
function machine(bytes) {
  assert.equal(bytes.readUInt16LE(0), 0x5a4d, 'MZ header');
  const offset = bytes.readUInt32LE(0x3c);
  assert.equal(bytes.readUInt32LE(offset), 0x4550, 'PE signature');
  return bytes.readUInt16LE(offset + 4);
}
assert.equal(machine(inner), 0x8664, 'Windows application must be AMD64');
const portable = await readFile(`release/Tekken3ConversionStudio-${pkg.version}-x64.exe`);
assert.ok([0x14c, 0x8664].includes(machine(portable)), 'Portable launcher must be x86/x64 Windows PE');
await mkdir('artifacts/distribution', {recursive: true});
await writeFile('artifacts/distribution/verification.json', JSON.stringify({
  version: pkg.version, status: 'PASS', hashes,
  innerMachine: 'AMD64', portablePE: 'valid', windowsExecution: 'NOT TESTED',
  note: 'Archive contents and PE structure validation do not prove Windows execution or game compatibility.',
}, null, 2));
console.log(`Distribution ${pkg.version}: packaged renderer, version, IPC, backup module and Windows PE headers verified.`);

} catch (error) {
  if (process.env.GITHUB_ACTIONS) {
    const message=String(error.stack??error).replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A');
    console.error(`::error title=Windows package verification::${message}`);
  } else console.error(error);
  process.exitCode=1;
}
