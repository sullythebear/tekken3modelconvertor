import { readFile, writeFile } from "node:fs/promises";
const read = async (n) =>
  JSON.parse(await readFile(`public-review/${n}.json`, "utf8"));
const project = await read("windows-nikki-project"),
  portable = await read("windows-portable"),
  phase = (n) => project.phases?.find((p) => p.name === n)?.durationMs;
const mib = (n) => (n == null ? "unavailable" : (n / 1024 ** 2).toFixed(1)),
  gib = (n) => (n == null ? "unavailable" : (n / 1024 ** 2).toFixed(3)),
  ms = (n) => (n == null ? "not reached" : n.toFixed(0)),
  sampled = (project.samples?.length ?? 0) > 0;
const text = `# Windows development review receipts

Commit: ${process.env.GITHUB_SHA ?? "local"}

Portable EXE: ${portable.status}; packaged=${portable.packaged}; version=${portable.version}.

Private Nikki project: ${project.status}; packaged=${project.packaged ?? "not reached"}. All 24 original assets byte-verified: ${project.exactAssetReadback ?? false}. Temporary data removed: ${project.privateTemporaryFilesRemoved}.

First conversion: ${ms(phase("convert-before-save"))} ms; save: ${ms(phase("save"))} ms; reopen: ${ms(phase("reopen"))} ms. ZIP: ${project.zipBytes ?? "not created"} bytes.

Byte-identical raw asset storage reused on reopen: ${project.rawAssetReuse?.reusedFiles ?? "not reached"} files / ${project.rawAssetReuse?.reusedBytes ?? "not measured"} bytes. This counts actual shared raw buffers; it is not an RSS reduction claim.

Sum of app working sets: ${gib(sampled ? project.peakAppWorkingSetKiB : null)} GiB. Sum of app private committed bytes: ${gib(sampled ? project.peakAppPrivateBytesKiB : null)} GiB. Separate test harness RSS: ${mib(sampled ? project.peakHarnessRssBytes : null)} MiB.

Working sets may count shared pages multiple times. Private committed bytes exclude shared allocations but are not unique resident RAM. These are measured peaks of different counters, not a hardware minimum or a controlled performance benchmark.

For comparison the published dev.8 packaged-run receipt measured 3,397,128 KiB summed working sets and 3,210,504 KiB private committed bytes, separate harness RSS 660,111,360 bytes, first conversion 6,749 ms, save 5,183 ms and reopen 6,984 ms. ZIP: 49,789,433 bytes. These exact baseline numbers were read from the published dev.8 Visual-Review.zip, not reconstructed from rounded GiB. One run per version cannot establish a statistically reliable memory improvement.

No original source models, textures, project ZIPs, secret URLs or game files are included. Native fixtures are not proof of Tekken gameplay. Artistic approval remains pending.
`;
const rows = (project.phaseMemory ?? [])
  .map(
    (p) =>
      `| ${p.phase} | ${p.samples} | ${gib(p.appWorkingSetKiB)} | ${gib(p.appPrivateCommittedKiB)} |`,
  )
  .join("\n");
await writeFile(
  "public-review/WINDOWS-STATUS.md",
  text +
    "\n## Same sampled counters by phase\n\n| Phase | Samples | App working sets GiB | App private committed GiB |\n|---|---:|---:|---:|\n" +
    rows +
    "\n\nNo samples means unavailable, not zero memory. Synchronous harness verification can block its sampler. These are phase summaries of the same 250 ms samples, not a different measurement method.\n",
);
console.log("Sanitized Windows status receipt generated.");
