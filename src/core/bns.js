import { digest } from "./bind.js";
import { decodeDonor, decodeTextureArchive } from "./donor.js";
import { DONORS } from "./native.js";
// Format facts from the documented retail USA revision; no original game bytes are embedded.
export const USA_DISC = Object.freeze({
  id: "SLUS-00402",
  exeSha256: "fbda8b68e5799dbef4af39a161783bc670c15b0aa0e87dce65e210717da19b8c",
  entryPC: 0x80079c70,
  loadAddress: 0x80010000,
  textSize: 0x121000,
  tableOffset: 0x14c00,
  entryCount: 303,
  modelSizeOffset: 0x8629c,
  sectorSize: 2048,
});
function verify(ok, message) {
  if (!ok) throw Error(message);
}
export async function readDiscTable(executable, { profile = USA_DISC } = {}) {
  const exe =
      executable instanceof Uint8Array
        ? executable
        : new Uint8Array(executable),
    view = new DataView(exe.buffer, exe.byteOffset, exe.byteLength),
    hash = await digest(exe);
  verify(
    hash === profile.exeSha256,
    "Executable SHA-256 is not the supported original USA SLUS_004.02 revision",
  );
  verify(
    new TextDecoder().decode(exe.slice(0, 8)) === "PS-X EXE",
    "Not a PS-X executable",
  );
  verify(
    exe.length >= profile.tableOffset + profile.entryCount * 8,
    "Executable BNS table is truncated",
  );
  verify(
    view.getUint32(0x10, true) === profile.entryPC &&
      view.getUint32(0x18, true) === profile.loadAddress &&
      view.getUint32(0x1c, true) === profile.textSize,
    "Executable load header differs from the selected disc profile",
  );
  const entries = Array.from({ length: profile.entryCount }, (_, id) => {
    const sector = view.getUint32(profile.tableOffset + id * 8, true),
      size = view.getUint32(profile.tableOffset + id * 8 + 4, true);
    return { id, sector, size, offset: sector * profile.sectorSize };
  });
  for (let i = 1; i < entries.length; i++)
    verify(
      entries[i].offset >=
        entries[i - 1].offset +
          Math.ceil(entries[i - 1].size / profile.sectorSize) *
            profile.sectorSize,
      "BNS table records overlap or run backwards",
    );
  return {
    entries,
    exeSha256: hash,
    retailExecutableVerified: profile === USA_DISC,
    profile,
  };
}
export async function inspectDiscAssets({
  executable,
  bns,
  donorId = "nina-p1-us",
  profile = USA_DISC,
}) {
  const table = await readDiscTable(executable, { profile }),
    bytes = bns instanceof Uint8Array ? bns : new Uint8Array(bns),
    donor = DONORS.find((d) => d.id === donorId);
  verify(donor, "Unsupported donor slot");
  for (const e of table.entries)
    verify(
      e.offset + e.size <= bytes.length,
      `BNS record ${e.id} lies beyond the selected file`,
    );
  const selected = table.entries[donor.modelRecord],
    textures = table.entries[donor.textureRecord],
    vh = table.entries[donor.modelRecord + 1],
    exeView = new DataView(
      executable.buffer,
      executable.byteOffset,
      executable.byteLength,
    ),
    sizeOffset = profile.modelSizeOffset + donor.modelId * 12;
  verify(
    sizeOffset + 12 <= executable.length,
    "Donor capacity table is truncated",
  );
  verify(
    exeView.getUint32(sizeOffset, true) === selected.size &&
      exeView.getUint32(sizeOffset + 4, true) === vh.size &&
      exeView.getUint32(sizeOffset + 8, true) === textures.size,
    "Executable donor capacities do not match BNS records",
  );
  const model = bytes.slice(selected.offset, selected.offset + selected.size),
    arc = bytes.slice(textures.offset, textures.offset + textures.size);
  decodeDonor(model);
  decodeTextureArchive(arc);
  return {
    table,
    donor,
    model,
    arc,
    report: {
      disc: profile.id,
      retailExecutableVerified: table.retailExecutableVerified,
      assetAuthenticityVerified: false,
      recordBoundToExecutable: true,
      modelRecord: selected.id,
      textureRecord: textures.id,
      modelBytes: selected.size,
      textureBytes: textures.size,
      modelSha256: await digest(model),
      arcSha256: await digest(arc),
    },
  };
}
export async function patchDiscCopy({
  executable,
  bns,
  candidate,
  donorId = "nina-p1-us",
  profile = USA_DISC,
}) {
  const assets = await inspectDiscAssets({ executable, bns, donorId, profile });
  verify(
    candidate.report.donorSha256 === assets.report.modelSha256,
    "Candidate does not match the model in the selected game archive",
  );
  verify(
    candidate.model.length <= assets.model.length,
    "Candidate exceeds the executable donor capacity",
  );
  verify(
    candidate.arc.length === assets.arc.length,
    "Candidate texture ARC changes its BNS record size",
  );
  const decoded = decodeDonor(candidate.model);
  verify(
    decoded.report.packetBytes <= 31000,
    "Candidate exceeds the provisional native packet budget",
  );
  decodeTextureArchive(candidate.arc);
  const patched = bns.slice(),
    modelEntry = assets.table.entries[assets.donor.modelRecord],
    arcEntry = assets.table.entries[assets.donor.textureRecord];
  patched.fill(0, modelEntry.offset, modelEntry.offset + modelEntry.size);
  patched.set(candidate.model, modelEntry.offset);
  patched.set(candidate.arc, arcEntry.offset);
  return {
    bytes: patched,
    manifest: {
      schema: "t3cs-bns-copy/1",
      disc: assets.report,
      originalBnsSha256: await digest(bns),
      patchedBnsSha256: await digest(patched),
      changedRecords: [modelEntry.id, arcEntry.id],
      executableChanged: false,
      recordOffsetsChanged: false,
      sourceModified: false,
      gameVerified: false,
      limitations: [
        "Only a standalone BNS copy is generated; no ISO sector ECC/EDC or disc reconstruction is performed.",
        "This does not install an Expanded custom-character loader.",
        "Native gameplay and animations remain untested.",
      ],
    },
  };
}
