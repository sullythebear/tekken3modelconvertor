import {diagnoseMaterialVisibility} from '../core/material-visibility.js';
import {installWorkspace} from './workspace.js';
import {sceneIntegrity} from '../core/mesh-integrity.js';
import {snapshotProjectMapping,restoreProjectMapping} from '../core/skeleton.js';
import {optimizeGameCandidate} from '../core/game-optimization.js';
import {configureSkinning} from '../core/skinning.js';
import {readDonorPackage} from "../core/donor-package.js";
import {ART_PRESETS,artSettings} from '../core/art-director.js';
import {reuseExactProjectAssets} from '../core/project-assets.js';
import {readStudioProject,writeStudioProject} from '../core/studio-project.js';
import {measureStyleReference} from '../core/style-reference.js';
import {simulationModel} from './ps1-preview.js';
import {writeT3CM, readT3CM} from "../core/exporter.js";
import * as THREE from "three";
import { TGALoader } from "three/addons/loaders/TGALoader.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { zipSync, strToU8 } from "fflate";
import {
  importCharacter,
  collectMaterials,
  describeMaterials,
  disposeScene,
} from "../core/importer.js";
import { convertCharacter } from "../core/converter.js";
import { bakeAtlas } from "../core/atlas.js";
import {
  deformationProbe, ROWS, applySkeletonMapping, resetSkeletonMapping,
  exportSkeletonMapping, importSkeletonMapping,
} from "../core/skeleton.js";
import { read3DMK, DONORS, gameExportGate } from "../core/native.js";
import { backupGameFiles, readGameBackup } from "../core/game-backup.js";
import { inspectDiscAssets, patchDiscCopy } from "../core/bns.js";
import { readARC } from "../core/ps1.js";
import { nativePoseFrames, nativeBoneSegments } from "../core/native-motion.js";
import { decodeDonor, decodeTextureArchive, donorPreview } from "../core/donor.js";
import { estimateDonorBind } from "../core/bind-estimator.js";
import { parseBindProfile } from "../core/bind.js";
import { reconstructOnDonor } from "../core/template.js";
import {installLandmarkEditor} from './landmark-editor.js';
import { View } from "./view.js";
import {
  nativeSyntheticFixture,
  nativeHumanoidFixture,
} from "../core/fixture-native.js";
import { syntheticCharacter } from "../core/fixture.js";
const $ = (id) => document.getElementById(id),
  sourceView = new View($("original")),
  resultView = new View($("result"));
const simulationView=new View($("simulation"));
let artProfile={preset:'authentic',...ART_PRESETS.authentic,regions:{},corrections:{}};
let artTimer,artDirty=false;
$('art-camera').onchange=()=>{if($('art-camera').value==='face'&&source?.skeleton.mapping.head){const target=source.skeleton.mapping.head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.075,.06));sourceView.controls.target.copy(target);sourceView.camera.position.copy(target).add(new THREE.Vector3(0,.025,.62));sourceView.controls.update();}else sourceView.reset(Number($('art-camera').value)||0);resultView.sync(sourceView);simulationView.sync(sourceView);};
$('art-mesh-apply').onclick=()=>{if(!$('art-mesh').value)return;artProfile.meshRoles??={};artProfile.meshRoles[$('art-mesh').value]=$('art-region').value;artChanged();};
$('reference-measure').onclick=()=>$('reference-files').click();
$('reference-files').onchange=async e=>{try{const files=[...e.target.files],model=files.find(f=>/\.3dm$/i.test(f.name)),arc=files.find(f=>/\.arc$/i.test(f.name));if(!model||!arc)throw Error('Choose a model .3dm and texture .arc');const measured=await measureStyleReference(new Uint8Array(await model.arrayBuffer()),new Uint8Array(await arc.arrayBuffer()),model.name);artProfile.reference=measured;await save('style-reference.json',strToU8(JSON.stringify(measured,null,2)));status(`Measured ${measured.triangles} reference triangles; world proportions need calibrated frames.`,1);}catch(e){showError(e);}};
function artChanged(){if(source&&!busy){if(nativeMode)returnSourcePose();clearNativeCandidate();artDirty=!!converted;setBusy(false);if(artDirty)status('Art settings changed; reconvert before export.');if($("art-live").checked){clearTimeout(artTimer);artTimer=setTimeout(()=>runConvert(),450);}}}
for(const [key,label]of [['stylization','Polygon stylization'],['face','Face preservation'],['angular','Angular body shaping'],['pixelation','Texture pixelation'],['hair','Hair preservation']]){
 const labelNode=document.createElement('label'),input=document.createElement('input'),output=document.createElement('output');
 input.type='range';input.min=0;input.max=100;input.id='art-'+key;input.value=artProfile[key];output.textContent=input.value+'%';labelNode.append(label,output);
 input.oninput=()=>{artProfile[key]=Number(input.value);output.textContent=input.value+'%';artChanged();};$("art-controls").append(labelNode,input);
}
function refreshArt(){$('hair-method').value=artProfile.hairMethod??'auto';$('art-occlusion').checked=!!artProfile.occlusionCleanup;$('art-filter').value=artProfile.filter??'nearest';$('art-colorlevels').value=String(artProfile.colorLevels??0);$('art-flat').checked=!!artProfile.flat;$('art-dither').checked=!!artProfile.dither;for(const key of ['stylization','face','angular','pixelation','hair']){$('art-'+key).value=artProfile[key];$('art-'+key).previousElementSibling.querySelector('output').textContent=artProfile[key]+'%';}}
function materialSnapshot(){return [...collectMaterials(source.root)].map(m=>({name:m.name,color:m.color?.toArray(),vertexColors:m.vertexColors,alphaTest:m.alphaTest,opacity:m.opacity,normalScale:m.normalScale?.toArray(),maps:Object.fromEntries(['map','alphaMap','normalMap','specularMap'].map(k=>[k,m[k]?{name:m[k].name||null}:null]))}));}
async function restoreMaterials(states){if(!states)return;const mats=[...collectMaterials(source.root)];if(states.length!==mats.length)throw Error('Project material structure differs');for(let i=0;i<mats.length;i++){
 const m=mats[i],s=states[i];if(s.name!==m.name)throw Error('Project material identity differs');
 if(s.color?.length===3&&s.color.every(Number.isFinite))m.color.fromArray(s.color);m.vertexColors=!!s.vertexColors;
 for(const key of ['opacity','alphaTest'])if(Number.isFinite(s[key])&&s[key]>=0&&s[key]<=1)m[key]=s[key];
 if(s.normalScale?.length===2&&s.normalScale.every(Number.isFinite))m.normalScale?.fromArray(s.normalScale);
 for(const key of ['map','alphaMap','normalMap','specularMap']){
  const state=s.maps?.[key];if(state==null){m[key]=null;continue;}const name=typeof state==='string'?state:state.name;if(!name){if(!m[key])throw Error('Project embedded texture was not restored');continue;}if(m[key]?.name===name)continue;
  const file=files.find(f=>f.name===name);if(!file)throw Error('Project texture missing: '+name);
  const url=URL.createObjectURL(new Blob([file.data]));try{const texture=await (/\.tga$/i.test(name)?new TGALoader():new THREE.TextureLoader()).loadAsync(url);texture.name=name;texture.colorSpace=['map','specularMap'].includes(key)?THREE.SRGBColorSpace:THREE.NoColorSpace;m[key]=texture;}finally{URL.revokeObjectURL(url);}
 }m.needsUpdate=true;
}materialControls();}
$("art-preset").onchange=()=>{if(ART_PRESETS[$('art-preset').value]){artProfile={...artProfile,...ART_PRESETS[$('art-preset').value],preset:$('art-preset').value};refreshArt();}artChanged();};
for(const id of ['art-priority','art-scale','art-remove'])$(id).onchange=()=>{const region=$('art-region').value;artProfile.regions[region]=Number($('art-priority').value);artProfile.corrections[region]={scale:Number($('art-scale').value),remove:$('art-remove').checked};artChanged();};
$('art-region').onchange=()=>{const r=$('art-region').value;$('art-priority').value=artProfile.regions[r]??1;$('art-scale').value=artProfile.corrections[r]?.scale??1;$('art-remove').checked=artProfile.corrections[r]?.remove??false;};
for(const id of ['art-dither','art-flat'])$(id).onchange=()=>{artProfile[id==='art-flat'?'flat':'dither']=$(id).checked;artChanged();};
$('art-filter').onchange=()=>{artProfile.filter=$('art-filter').value;artChanged();};
$('art-colorlevels').onchange=()=>{artProfile.colorLevels=Number($('art-colorlevels').value);artChanged();};
$('art-occlusion').onchange=()=>{artProfile.occlusionCleanup=$('art-occlusion').checked;artChanged();};
function rebuildSimulation(){if(!converted)return;if(simulationView.root)for(const m of collectMaterials(simulationView.root))m.dispose();simulationView.setModel(simulationModel(atlas?.root??converted.root,{snap:$('preview-snap').checked,affine:$('preview-affine').checked,gouraud:$('preview-gouraud').checked}),reference);simulationView.sync(sourceView);}
for(const id of ['preview-snap','preview-affine','preview-gouraud'])$(id).onchange=rebuildSimulation;
$('art-resolution').onchange=()=>simulationView.setResolution($('art-resolution').checked?[320,240]:null);
$('art-save').onclick=()=>save('art-profile.json',strToU8(JSON.stringify({schema:'t3cs-art/1',settings:artSettings(artProfile)},null,2)));
$('art-open').onclick=()=>$('art-profile-file').click();
$('art-profile-file').onchange=async e=>{try{const p=JSON.parse(await e.target.files[0].text());if(p.schema!=='t3cs-art/1')throw Error('Invalid art profile');artProfile=artSettings(p.settings);$('art-preset').value=artProfile.preset;refreshArt();artChanged();}catch(e){showError(e);}};
$('project-save').onclick=async()=>{if(!source||busy)return;setBusy(true);status('Saving project…');try{await new Promise(resolve=>setTimeout(resolve,0));const bytes=writeStudioProject(files,{art:artProfile,preset:$('art-preset').value,mapping:snapshotProjectMapping(source.root),selected:$('model-select').value,materials:materialSnapshot()});await save('character-project.zip',bytes);status(`Project saved (${(bytes.length/1024**2).toFixed(1)} MiB).`,1);}catch(e){showError(e);}finally{setBusy(false);}};
$('project-open').onclick=()=>$('project-file').click();
$('project-file').onchange=async e=>{try{if(e.target.files[0].size>512*1024**2)throw Error('Project exceeds 512 MiB');const p=readStudioProject(new Uint8Array(await e.target.files[0].arrayBuffer()));const reuse=reuseExactProjectAssets(p.records,files);p.records=reuse.records;projectAssetReuse={reusedFiles:reuse.reusedFiles,reusedBytes:reuse.reusedBytes};await load(p.records,p.selected);artProfile=artSettings(p.art);$('art-preset').value=p.preset;refreshArt();source.skeleton=restoreProjectMapping(source.root,p.mapping);await restoreMaterials(p.materials);$('art-flat').checked=!!artProfile.flat;$('art-dither').checked=!!artProfile.dither;$('art-region').onchange();status('Project restored; convert to rebuild outputs.',1);}catch(e){showError(e);}};
let projectAssetReuse = null;
let source = null,
  converted = null,
  atlas = null,
  files = [],
  donor = null,
  busy = false,
  controller = null,
  syncing = false,
  reference = null;
for (const a of [sourceView,resultView,simulationView])
  a.controls.addEventListener("change", () => {
    if (syncing) return;
    syncing = true;
    a.render();
    for(const b of [sourceView,resultView,simulationView])if(b!==a)b.sync(a);
    syncing = false;
  });
let nativeBind = null,
  nativeCandidate = null,
  nativeMode = false,
  gameData = null;
let playback = null;
function stopPlayback() {
  if (!playback) return;
  cancelAnimationFrame(playback.frame);
  for (const { mixer, root } of playback.mixers) {
    mixer.stopAllAction();
    mixer.uncacheRoot(root);
  }
  playback = null;
  $("play-animation").textContent = "Play source clip";
  sourceView.render();
  resultView.render();
}
$("play-animation").onclick = () => {
  if (playback) {
    stopPlayback();
    return;
  }
  const clip = source?.animations[Number($("animation").value)];
  if (!clip) return;
  const mixers = [source.root, atlas?.root ?? converted?.root,simulationView.root]
    .filter(Boolean)
    .map((root) => ({ root, mixer: new THREE.AnimationMixer(root) }));
  for (const { mixer } of mixers) mixer.clipAction(clip).play();
  playback = { mixers, frame: 0, last: performance.now() };
  $("play-animation").textContent = "Stop source clip";
  const tick = (now) => {
    if (!playback) return;
    const dt = Math.min(0.1, (now - playback.last) / 1000);
    playback.last = now;
    for (const { mixer } of playback.mixers) mixer.update(dt);
    sourceView.render();
    resultView.render();
    simulationView.render();
    playback.frame = requestAnimationFrame(tick);
  };
  playback.frame = requestAnimationFrame(tick);
};
function status(text, fraction = 0) {
  $("status").textContent = text;
  $("progress").value = fraction;
}
function setBusy(value) {
  busy = value;
  $('head').disabled=value||$('art-preset').value!=='baseline';
  for(const node of document.querySelectorAll('input[id^="art-"], select[id^="art-"], button[id^="art-"], #project-save, #project-open, #reference-measure'))node.disabled=value;
  $("import").disabled = value;
  $("donor").disabled = value;
  $("donor-slot").disabled = value;
  $("add-textures").disabled = value || !source;
  $("convert").disabled = value || !source;
  $("model-select").disabled = value || !source;
  $("export").disabled = value || !converted || artDirty;
  $("probe").disabled = value || !source;
  $("cancel").hidden = !value;
  for (const id of ["mapping-apply", "mapping-reset", "mapping-save", "mapping-load"])
    $(id).disabled = value || !source || nativeMode;
  for (const select of $("mapping-editor").querySelectorAll("select"))
    select.disabled = value || nativeMode;
  $("bind-profile").disabled = value || !donor;
  $("estimate-bind").disabled = value || !donor;
  $("native-build").disabled = value || !source || !donor || !nativeBind || artDirty || ($('art-preset').value!=='baseline'&&!converted);
  $("native-export").disabled = value || !nativeCandidate;
  $("expanded-export").disabled = value || !nativeCandidate;
  $("native-pose").disabled = value || !nativeCandidate || !nativeMode;
  $("bns-export").disabled = value || !nativeCandidate || !gameData;
  $("game-files").disabled = value;
  $("disc-image").disabled = value;
  $("donor-extract").disabled = value || !gameData || !donor;
  $("game-backup").disabled = value || !gameData;
  $("game-restore").disabled = value;
  for (const input of $("materials").querySelectorAll("input, select")) input.disabled = value;
  if (nativeMode) {
    $("export").disabled = true;
    $("play-animation").disabled = true;
    $("probe").disabled = true;
  } else if (source)
    $("play-animation").disabled = source.animations.length === 0;
}
function showError(e) {
  status(e.message);
  message(e.message, "error");
  console.error(e);
}
function message(text, type = "warning") {
  const p = document.createElement("p");
  p.className = type;
  p.textContent = text;
  $("messages").append(p);
}
function technical() {
  if (!source) return;
  const stats =
    nativeMode && nativeCandidate
      ? {
          ...source.stats,
          triangles: nativeCandidate.report.topology.triangles,
        }
      : (converted?.stats ?? source.stats);
  $("stat-triangles").textContent = stats.triangles.toLocaleString();
  $("stat-materials").textContent = source.stats.materials;
  $("stat-bones").textContent = source.skeleton.report.boneCount;
  $("stat-vram").textContent = atlas
    ? ((atlas.textureBytes + atlas.paletteBytes) / 1024).toFixed(1) + " KiB"
    : "—";
  $("source-count").textContent =
    source.stats.triangles.toLocaleString() + " triangles";
  $("source-label").textContent = nativeMode ? "SOURCE · DONOR BIND" : "SOURCE";
  $("result-label").textContent = nativeMode
    ? ($("native-pose").value === "bind" ? "NATIVE DONOR CANDIDATE" : `NATIVE · ${$("native-pose").value.toUpperCase()} DIAGNOSTIC`)
    : "PS1 PREPARATION";
  $("converted-count").textContent =
    nativeMode && nativeCandidate
      ? nativeCandidate.report.topology.triangles + " native triangles"
      : converted
        ? converted.stats.triangles.toLocaleString() + " triangles"
        : "— triangles";
  $("validation-state").textContent = nativeMode
    ? "NATIVE CANDIDATE · GAME UNVERIFIED"
    : converted
      ? converted.settings.art ? (converted.stats.triangles>converted.settings.triangles?'ART EXPERIMENT · BUDGET EXCEEDED':'ART EXPERIMENT · ART/GAME UNVERIFIED') : "PREPARED · GAME UNVERIFIED"
      : "IMPORTED";
  $("messages").replaceChildren();
  for (const text of [
    ...new Set([
      ...(converted?.warnings ?? source.warnings),
      ...(atlas?.warnings ?? []),
    ]),
  ])
    message(text);
  if (nativeMode && nativeCandidate)
    for (const text of nativeCandidate.report.limitations) message(text);
  for (const error of gameExportGate({ donor }).errors) message(error, "error");
  $("bone-map").replaceChildren();
  for (const b of source.skeleton.report.mapping) {
    const row = document.createElement("div");
    row.className = "bone-row";
    const name = document.createElement("span"),
      mapped = document.createElement("span");
    name.textContent = b.name;
    mapped.textContent = `${b.role} → row ${nativeMode ? (nativeCandidate?.profile.roleRows[b.role] ?? b.row) : b.row}`;
    row.append(name, mapped);
    $("bone-map").append(row);
  }
  if (source.skeleton.report.missing.length) {
    const p = document.createElement("p");
    p.textContent = "Unresolved: " + source.skeleton.report.missing.join(", ");
    $("bone-map").append(p);
  }
  mappingControls();
  $("report").textContent = JSON.stringify(report(), null, 2);
}
function mappingControls() {
  const editor = $("mapping-editor");
  editor.replaceChildren();
  if (!source) return;
  const rig = source.skeleton;
  for (const role of Object.keys(ROWS)) {
    const label = document.createElement("label"), select = document.createElement("select");
    label.textContent = role;
    select.dataset.role = role;
    select.setAttribute("aria-label", `Source bone for ${role}`);
    select.add(new Option("Unmapped", ""));
    for (const [index, bone] of rig.bones.entries())
      select.add(new Option(`${index}: ${bone.name || "Unnamed bone"}`, String(index)));
    const index = rig.bones.indexOf(rig.mapping[role]);
    select.value = index < 0 ? "" : String(index);
    select.disabled = busy || nativeMode;
    label.append(select);
    editor.append(label);
  }
}
function changeMapping(update) {
  if (!source || busy || nativeMode) return;
  stopPlayback();
  // An invalid selection leaves both mapping and existing candidates intact.
  const next = update();
  returnSourcePose();
  clearNativeCandidate();
  if (converted) disposeScene(converted.root);
  if (atlas) disposeScene(atlas.root);
  converted = atlas = null;
  source.skeleton = next;
  resultView.clearModel();
  $("empty-result").hidden = false;
  $("pose-report").replaceChildren();
  technical();
  setBusy(false);
  status("Source mapping updated. Convert again to rebuild geometry and donor mapping.", 1);
}
$("mapping-apply").onclick = () => {
  try {
    changeMapping(() => applySkeletonMapping(source.root, Object.fromEntries(
      [...$("mapping-editor").querySelectorAll("select")]
        .filter(s => s.value !== "").map(s => [s.dataset.role, Number(s.value)]),
    )));
  } catch (e) { showError(e); }
};
$("mapping-reset").onclick = () => {
  try { changeMapping(() => resetSkeletonMapping(source.root)); }
  catch (e) { showError(e); }
};
$("mapping-save").onclick = async () => {
  if (!source || busy || nativeMode) return;
  try {
    stopPlayback();
    await save("source-skeleton-mapping.json", strToU8(JSON.stringify(exportSkeletonMapping(source.root), null, 2)));
  } catch (e) { showError(e); }
};
async function loadSourceMapping(json) {
  changeMapping(() => importSkeletonMapping(source.root, json));
}
$("mapping-load").onclick = async () => {
  if (!source || busy || nativeMode) return;
  try {
    if (window.studio) {
      const records = await window.studio.openBindProfile();
      if (records.length) await loadSourceMapping(JSON.parse(new TextDecoder().decode(records[0].data)));
    } else $("mapping-file").click();
  } catch (e) { showError(e); }
};
$("mapping-file").onchange = async e => {
  try {
    if (e.target.files.length) await loadSourceMapping(JSON.parse(await e.target.files[0].text()));
  } catch (err) { showError(err); }
  e.target.value = "";
};
function report() {
  return {
    schema: "t3cs-preparation/1",
    viewMode: nativeMode
      ? "retargeted source and native donor candidate"
      : "original source and preparation",
    nativeCandidate: nativeCandidate?.report ?? null,
    nativeDiagnosticPose: nativeMode ? $("native-pose").value : null,
    source: source
      ? {
          stats: source.stats,
          files: source.files,
          skeleton: source.skeleton.report,
          weights: source.weights,
          skinning: source.skinning,
          materials: describeMaterials(source.root),
          warnings: source.warnings,
        }
      : null,
    conversion: converted
      ? {
          stats: converted.stats,
          optimization: converted.optimization,
          materials:describeMaterials(converted.root),
          warnings: converted.warnings,
          regions: converted.report,
          settings: converted.settings,
          poses: converted.poses,
          quality: converted.quality,
        }
      : null,
    atlas: atlas
      ? {
          warnings: atlas.warnings,
          textureBytes: atlas.textureBytes,
          paletteBytes: atlas.paletteBytes,
          readbackStats: atlas.readbackStats,
          tiles: atlas.tiles.map(({ material, clut, x, y, width, height, palette, sourceSkinBake, sourceCoverage }) => ({
            material,
            clut,
            x,
            y,
            width,
            height,
            bitDepth:palette.length===256?8:4,
            ...(sourceSkinBake?{sourceSkinBake}:{}),
            ...(sourceCoverage?{sourceCoverage}:{}),
          })),
        }
      : null,
    donor: donor?.report ?? null,
    exportGate: gameExportGate({ donor }),
    gameVerified: false,
    limitations: [
      "No donor bind calibration or runtime patch has been verified.",
      "No in-game animation checks have run.",
      "Source rig diagnostics are not donor animation tests.",
      "Atlas bake approximates normal shading; metallic/specular maps are not physically baked.",
    ],
  };
}
async function load(records, selected) {
  stopPlayback();
  if (busy) return;
  setBusy(true);
  status("Importing model and loading textures…", 0.1);
  let next;
  try {
    next = await importCharacter(records, selected);
    if (next.stats.meshes === 0) throw Error("No renderable mesh in source.");
    if (source) source.dispose();
    if (converted) disposeScene(converted.root);
    if (atlas) disposeScene(atlas.root);
    clearNativeCandidate();
    source = next;
    artDirty=false;
    $('art-mesh').replaceChildren();source.root.traverse(m=>{if(m.isMesh)$('art-mesh').add(new Option(m.name,m.name));});
    converted = null;
    atlas = null;
    files = records;
    reference = new THREE.Box3().setFromObject(source.root);
    sourceView.setModel(source.root, reference);
    resultView.clearModel();if(simulationView.root)for(const m of collectMaterials(simulationView.root))m.dispose();simulationView.clearModel();
    $("empty-original").hidden = true;
    $("empty-result").hidden = false;
    sourceView.reset();
    resultView.sync(sourceView);
    $("project-name").textContent =
      selected ??
      records.find((f) => /\.(fbx|obj|glb|gltf)$/i.test(f.name))?.name ??
      "Character";
    $("asset-list").replaceChildren();
    for (const f of source.files) {
      const row = document.createElement("div");
      row.className = "asset";
      row.title = f.name;
      const tag = document.createElement("small");
      tag.textContent = f.role.toUpperCase();
      row.append(tag, document.createTextNode(f.name));
      $("asset-list").append(row);
    }
    $("model-select").replaceChildren();
    for (const f of records.filter((f) =>
      /\.(fbx|obj|glb|gltf)$/i.test(f.name),
    )) {
      const o = new Option(f.name, f.name);
      $("model-select").add(o);
    }
    if (selected) $("model-select").value = selected;
    $("screenshots").disabled = false;
    $("animation").replaceChildren();
    for (const [i, clip] of source.animations.entries())
      $("animation").add(new Option(clip.name || `Clip ${i + 1}`, String(i)));
    $("animation").disabled = source.animations.length === 0;
    $("play-animation").disabled = source.animations.length === 0;
    materialControls();
    technical();
    status(
      `Imported ${source.stats.meshes} meshes, ${source.stats.textures} referenced textures and ${source.skeleton.report.boneCount} bones.`,
      1,
    );
  } catch (e) {
    if (next && next !== source) next.dispose();
    showError(e);
  } finally {
    setBusy(false);
  }
}
async function runConvert() {
  clearTimeout(artTimer);
  stopPlayback();
  if (nativeMode) returnSourcePose();
  if (!source || busy) return;
  setBusy(true);
  controller = new AbortController();
  let next = null,
    nextAtlas = null;
  try {
    const settings = {
      triangles: Number($("triangles").value),
      headPriority: Number($("head").value),
      error: Number($("error").value),
      art: $('art-preset').value==='baseline'?null:artSettings({...artProfile,dither:$('art-dither').checked,flat:$('art-flat').checked}),
    };
    if (
      !Number.isFinite(settings.error) ||
      settings.error < 0.001 ||
      settings.error > 1
    )
      throw Error("Geometry error must be between 0.001 and 1.");
    const progress = (p) =>
      status(`${p.step}${p.detail ? " · " + p.detail : ""}`, p.fraction);
    next = await convertCharacter(
      source,
      settings,
      progress,
      controller.signal,
    );
    if ($("bake").checked) {
      try {
        nextAtlas = await bakeAtlas(next, { onProgress: progress, art:settings.art });
      } catch (e) {
        next.warnings.push("Texture atlas was not generated: " + e.message);
      }
    }
    if (controller.signal.aborted) throw Error("Conversion cancelled");
    if (converted) disposeScene(converted.root);
    if (atlas) disposeScene(atlas.root);
    converted = next;
    artDirty=false;
    atlas = nextAtlas;
    if(atlas)$('art-atlas').src=atlas.canvas.toDataURL();else $('art-atlas').removeAttribute('src');
    $('art-allocations').replaceChildren();
    for(const region of converted.report){const row=document.createElement('div');row.className='hint';row.textContent=`${region.region}: ${region.after} / target ${region.target} triangles`; $('art-allocations').append(row);}
    resultView.setModel(atlas?.root ?? converted.root, reference);
    resultView.sync(sourceView);
    // Share the converted scene via a separate skeleton-safe clone in the third view.
    rebuildSimulation();
    $("empty-result").hidden = true;
    technical();
    status(
      settings.art ? `Experimental art reconstruction: ${converted.stats.triangles} / ${settings.triangles} triangles. ${converted.stats.triangles>settings.triangles?'Budget not met. ':''}Artistic and game acceptance remain unverified.` : "Preparation complete. Game export remains blocked until donor/runtime validation.",
      1,
    );
  } catch (e) {
    if (next && next !== converted) disposeScene(next.root);
    if (nextAtlas && nextAtlas !== atlas) disposeScene(nextAtlas.root);
    showError(e);
  } finally {
    controller = null;
    setBusy(false);
  }
}
async function exportGLB(root) {
  return new Uint8Array(
    await new GLTFExporter().parseAsync(root, {
      binary: true,
      onlyVisible: true,
      animations: source?.animations ?? [],
      trs: true,
    }),
  );
}
function dataURLBytes(url) {
  return Uint8Array.from(atob(url.split(",")[1]), (c) => c.charCodeAt(0));
}
async function save(name, data) {
  if (window.studio) return window.studio.save(name, data);
  const url = URL.createObjectURL(new Blob([data])),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
async function packagePreparation() {
  stopPlayback();
  if (!converted || busy) return;
  setBusy(true);
  try {
    status("Serializing preparation assets…", 0.4);
    const output = {
      "report.json": strToU8(JSON.stringify(report(), null, 2)),
      "converted.glb": await exportGLB(atlas?.root ?? converted.root),
      "README.txt": strToU8(
        "TEKKEN 3 CONVERSION STUDIO — PREPARATION PACKAGE\nThis is NOT a game-compatible character mod.\nGLB is an auxiliary inspection format. TIM files are PS1 texture assets, not a complete Tekken character.\nNative geometry, donor bind calibration, runtime integration and in-game tests remain required.\nNo donor/game files are included.\n",
      ),
    };
    if (atlas) {
      output["atlas.png"] = dataURLBytes(atlas.canvas.toDataURL());
      for (let i = 0; i < atlas.tiles.length; i++)
        output[`textures/${String(i).padStart(2, "0")}.tim`] =
          atlas.tiles[i].tim;
    }
    output["screenshots/source.png"] = dataURLBytes(sourceView.shot());
    output["screenshots/prepared.png"] = dataURLBytes(resultView.shot());
    if (await save("character-preparation.t3prep", zipSync(output)))
      status(
        "Preparation package saved. This package is not a playable mod.",
        1,
      );
    else status("Export cancelled.");
  } catch (e) {
    showError(e);
  } finally {
    setBusy(false);
  }
}
async function loadDonor(records) {
  const packageFile = records.find(f => /\.zip$/i.test(f.name));
  if (packageFile) {
    if (records.length !== 1) throw Error("Select one extracted donor ZIP, or select the loose 3DMK and ARC files together");
    const unpacked = await readDonorPackage(packageFile.data, {donorId: $("donor-slot").value});
    await loadDonor(unpacked.records);
    donor.report.extractionPackage = unpacked.report;
    technical(); return donor.report;
  }
  const selected = DONORS.find((d) => d.id === $("donor-slot").value);
  let model, arc;
  for (const f of records) {
    try {
      model = { ...read3DMK(f.data), name: f.name };
      continue;
    } catch {}
    try {
      const entries = readARC(f.data);
      if (entries.length) arc = { entries, name: f.name };
    } catch {}
  }
  if (!model)
    throw Error("Select an extracted, unrelocated 27-row 3DMK donor model.");
  if (!arc) throw Error("Select the matching original texture ARC as well.");
  const decoded = decodeDonor(model.bytes);
  decodeTextureArchive(records.find((f) => f.name === arc.name).data);
  returnSourcePose();
  clearNativeCandidate();
  nativeBind = null;
  gameData = null;
  donor = {
    decoded,
    rawARC: new Uint8Array(records.find((f) => f.name === arc.name).data),
    model,
    arc,
    report: {
      ...selected,
      modelFile: model.name,
      textureFile: arc.name,
      slotBytes: model.slotBytes,
      arcEntries: arc.entries.length,
      identityVerified: false,
    },
  };
  $("donor-status").textContent =
    `${model.slotBytes.toLocaleString()} bytes · ${arc.entries.length} ARC members. Donor identity and bind pose still unverified.`;
  technical();
  setBusy(false);
  return donor.report;
}

async function appendTextures(records) {
  const incoming = records.filter((f) => /\.(tga|png|jpe?g)$/i.test(f.name));
  if (!incoming.length) throw Error("No supported textures selected.");
  const names = new Set(incoming.map((f) => f.name.toLowerCase()));
  await load(
    [...files.filter((f) => !names.has(f.name.toLowerCase())), ...incoming],
    $("model-select").value,
  );
}
function invalidateMaterialChange(text) {
  returnSourcePose(); clearNativeCandidate();
  if (converted) disposeScene(converted.root);
  if (atlas) disposeScene(atlas.root);
  converted = atlas = null;
  resultView.clearModel(); $("empty-result").hidden = false;
  source.warnings.push(text); sourceView.render(); technical();
  const scroll = $("materials").scrollTop; materialControls(); $("materials").scrollTop = scroll;
  setBusy(false); status("Material changed. Convert again to update the prepared model.");
}
function materialControls() {
  $("materials").replaceChildren();
  const images = files.filter((f) => /\.(tga|png|jpe?g)$/i.test(f.name));
  for (const material of collectMaterials(source.root)) {
    const title = document.createElement("p");
    title.className = "hint";
    title.textContent = material.name || "Unnamed material";
    $("materials").append(title);
    const control = (text, type, value, apply) => {
      const label = document.createElement("label"), input = document.createElement("input");
      label.textContent = text; input.type = type;
      input.setAttribute("aria-label", `${material.name} ${text}`);
      if (type === "checkbox") input.checked = value;
      else input.value = value;
      if (type === "number") { input.min = 0; input.max = 1; input.step = .05; }
      input.onchange = () => {
        if (busy) return;
        try { apply(type === "checkbox" ? input.checked : input.value); material.needsUpdate = true; invalidateMaterialChange(`Manual material adjustment: ${material.name} / ${text}`); }
        catch (e) { showError(e); }
      };
      label.append(input); $("materials").append(label);
    };
    if (material.color) control("Albedo tint", "color", "#" + material.color.getHexString(), value => material.color.set(value));
    control("Use vertex colours", "checkbox", material.vertexColors, value => material.vertexColors = value);
    control("Alpha cutoff", "number", material.alphaTest, value => {
      const n = Number(value); if (!Number.isFinite(n) || n < 0 || n > 1) throw Error("Alpha cutoff must be between zero and one");
      material.alphaTest = n;
    });
    if (material.normalScale) control("Flip normal Y", "checkbox", material.normalScale.y < 0, value => material.normalScale.y = Math.abs(material.normalScale.y || 1) * (value ? -1 : 1));
    for (const [slot, label] of [
      ["map", "Diffuse"],
      ["alphaMap", "Opacity"],
      ["normalMap", "Normal"],
      ["specularMap", "Specular"],
    ]) {
      const select = document.createElement("select");
      select.setAttribute("aria-label", `${material.name} ${label}`);
      select.add(
        new Option(
          `${label}: ${material[slot] ? (material[slot].name || "source assignment") : "not assigned"}`,
          "",
        ),
      );
      select.add(new Option("Clear assignment", "__none__"));
      for (const f of images) select.add(new Option(f.name, f.name));
      select.onchange = async () => {
        if (busy) return;
        if (select.value === "__none__") { material[slot] = null; material.needsUpdate = true; invalidateMaterialChange(`Manual material clear: ${material.name} / ${label}`); return; }
        const file = images.find((f) => f.name === select.value);
        if (!file) return;
        const url = URL.createObjectURL(new Blob([file.data]));
        try {
          const texture = await (
            /\.tga$/i.test(file.name)
              ? new TGALoader()
              : new THREE.TextureLoader()
          ).loadAsync(url);
          texture.colorSpace =
            (slot === "map" || slot === "specularMap") ? THREE.SRGBColorSpace : THREE.NoColorSpace;
          texture.name = file.name;
          material[slot] = texture;
          if (slot === "alphaMap") { material.alphaTest = .5; material.side = THREE.DoubleSide; }
          material.needsUpdate = true;
          invalidateMaterialChange(`Manual material assignment: ${material.name} / ${label} → ${file.name}`);
        } catch (e) {
          showError(e);
        } finally {
          URL.revokeObjectURL(url);
        }
      };
      $("materials").append(select);
    }
  }
}
$("add-textures").onclick = async () => {
  try {
    if (window.studio) {
      await appendTextures(await window.studio.openFiles());
    } else $("texture-files").click();
  } catch (e) {
    showError(e);
  }
};
$("texture-files").onchange = async (e) => {
  try {
    await appendTextures(
      await Promise.all(
        [...e.target.files].map(async (f) => ({
          name: f.name,
          data: await f.arrayBuffer(),
        })),
      ),
    );
  } catch (error) {
    showError(error);
  }
  e.target.value = "";
};

function clearNativeCandidate() {
  if (nativeCandidate) {
    disposeScene(nativeCandidate.preview);
    disposeScene(nativeCandidate.sourcePreview);
    if (nativeCandidate.posedPreview) disposeScene(nativeCandidate.posedPreview);
  }
  nativeCandidate = null;
  $("native-pose").value = "bind";
  nativeMode = false;
  $("source-pose").hidden = true;
}
$("native-pose").onchange = () => {
  if (!nativeCandidate || busy || !nativeMode) return;
  try {
    const candidate = nativeCandidate, pose = $("native-pose").value;
    const frames = nativePoseFrames(candidate.profile, pose);
    const previous = candidate.posedPreview;
    const preview = pose === "bind" ? candidate.preview : donorPreview(candidate.decoded, frames, decodeTextureArchive(candidate.arc));
    if (pose !== "bind") preview.userData.boneSegments = nativeBoneSegments(candidate.profile, frames);
    const wire = $("wireframe").checked;
    preview.traverse(m => { if (m.isMesh) for (const mat of Array.isArray(m.material) ? m.material : [m.material]) mat.wireframe = wire; });
    resultView.setModel(preview, candidate.previewReference);
    candidate.posedPreview = pose === "bind" ? null : preview;
    if (previous) disposeScene(previous);
    technical();
    const diagnostics = candidate.report.motionDiagnostics.poses.find(p => p.pose === pose);
    $("pose-report").textContent = JSON.stringify({kind: "Native anatomical diagnostic · source remains in donor bind · not a game motion", ...diagnostics}, null, 2);
    status(`Native ${pose} preview. Source remains in donor bind; exported model remains unchanged.`, 1);
  } catch (e) { showError(e); }
};
function returnSourcePose() {
  stopPlayback();
  if (source && reference) {
    sourceView.setModel(source.root, reference);
    if (converted) {
      resultView.setModel(atlas?.root ?? converted.root, reference);
      $("empty-result").hidden = true;
    } else {
      resultView.clearModel();
      $("empty-result").hidden = false;
    }
  }
  nativeMode = false;
  $("source-pose").hidden = true;
  technical();
  setBusy(busy);
}
async function loadBindProfile(json) {
  returnSourcePose();
  if (!donor) throw Error("Load donor files first");
  await parseBindProfile(json, donor.decoded);
  clearNativeCandidate();
  nativeBind = json;
  $("bind-status").textContent =
    `${Object.keys(json.frames).length} donor-bound frames loaded; game calibration remains unverified.`;
  setBusy(false);
  return json;
}
async function runNative() {
  if (busy || !source || !donor || !nativeBind) return;
  stopPlayback();
  returnSourcePose();
  setBusy(true);
  controller = new AbortController();
  let next;
  try {
    next = await reconstructOnDonor({
      source:converted?.settings.art?{...source,root:converted.root,skeleton:converted.skeleton,stats:converted.stats,artSettings:converted.settings.art}:source,
      donor: donor.model.bytes,
      textureARC: donor.rawARC,
      bindProfile: nativeBind,
      materialMode: $("native-detail").checked ? "static-detail" : "albedo",
      signal: controller.signal,
      onProgress: (p) => status(p.step, p.fraction),
    });
    clearNativeCandidate();
    nativeCandidate = next;
    nativeMode = true;
    const common = new THREE.Box3().setFromObject(next.sourcePreview);
    next.previewReference = common.clone();
    sourceView.setModel(next.sourcePreview, common);
    resultView.setModel(next.preview, common);
    sourceView.reset();
    resultView.sync(sourceView);
    $("empty-result").hidden = true;
    $("converted-count").textContent =
      next.report.topology.triangles + " native triangles";
    $("source-pose").hidden = false;
    technical();
    status(
      "Native donor reconstruction completed. This is an unverified candidate, not a tested playable mod.",
      1,
    );
  } catch (e) {
    if (next) {
      disposeScene(next.preview);
      disposeScene(next.sourcePreview);
    }
    showError(e);
  } finally {
    controller = null;
    setBusy(false);
  }
}
$("estimate-bind").onclick = async () => {
  if (!donor || busy) return;
  setBusy(true);
  controller = new AbortController();
  try {
    const profile = await estimateDonorBind(donor.decoded, {
      signal: controller.signal,
      onProgress: (p) => status(p.step, p.fraction),
    });
    await loadBindProfile(profile);
    status(
      `Estimated bind from ${profile.estimation.constraints} seams. Not game-validated.`,
      1,
    );
  } catch (e) {
    showError(e);
  } finally {
    controller = null;
    setBusy(false);
  }
};
$("game-backup").onclick = async () => {
  if (!gameData || busy) return;
  setBusy(true);
  try {
    await save("tekken3-game-backup.zip", await backupGameFiles(gameData));
    status("Executable and BNS backup saved with SHA-256 manifest.", 1);
  } catch (e) {
    showError(e);
  } finally {
    setBusy(false);
  }
};
$("game-restore").onclick = async () => {
  if (!window.studio) {
    status("Game backup restoration is available in the desktop app.");
    return;
  }
  try {
    const records = await window.studio.openGameBackup();
    if (!records.length) return;
    setBusy(true);
    const files = await readGameBackup(records[0].data),
      result = await window.studio.restoreGameBackup(files);
    status(
      result
        ? `Restored ${result.restored} files; rollback backup: ${result.rollbackBackup ?? "no existing files replaced"}`
        : "Restore cancelled.",
      1,
    );
  } catch (e) {
    showError(e);
  } finally {
    setBusy(false);
  }
};
async function loadGameRecords(records, sourceImage = null) {
    const exe = records.find((f) => f.name.toUpperCase() === "SLUS_004.02"),
      bns = records.find((f) => f.name.toUpperCase() === "TEKKEN3.BNS");
    if (!exe || !bns)
      throw Error("Select original SLUS_004.02 and TEKKEN3.BNS together, or use ISO / BIN extraction.");
    setBusy(true);
    status(
      "Verifying original USA executable and extracting donor records…",
      0.2,
    );
    const assets = await inspectDiscAssets({
      executable: new Uint8Array(exe.data),
      bns: new Uint8Array(bns.data),
      donorId: $("donor-slot").value,
    });
    await loadDonor([
      {
        name: "record-" + assets.report.modelRecord + ".3dm",
        data: assets.model,
      },
      {
        name: "record-" + assets.report.textureRecord + ".arc",
        data: assets.arc,
      },
    ]);
    gameData = {
      executable: new Uint8Array(exe.data),
      bns: new Uint8Array(bns.data),
      donorId: $("donor-slot").value,
    };
    donor.report.disc = assets.report;
    if (sourceImage) donor.report.sourceImage = sourceImage;
    return assets;

}
$("disc-image").onclick = async () => {
  if (busy) return;
  try {
    if (!window.studio) throw Error("Disc image extraction is available in the desktop app");
    setBusy(true); status("Reading the local disc image and extracting original game files…", .1);
    const result = await window.studio.openDiscImage();
    if (!result) { status("Disc image selection cancelled."); return; }
    await loadGameRecords(result.files, result.report);
    technical();
    status("Original Nina records extracted from disc and USA executable verified. Save the donor package to retain the extracted files.", 1);
  } catch (e) { showError(e); }
  finally { setBusy(false); }
};
$("donor-extract").onclick = async () => {
  if (!gameData || !donor || busy) return;
  setBusy(true);
  try {
    const slot = DONORS.find(d => d.id === gameData.donorId);
    await save(`donor-${slot.id}.zip`, zipSync({
      "SLUS_004.02": gameData.executable,
      [`record-${slot.modelRecord}.3dm`]: donor.model.bytes,
      [`record-${slot.textureRecord}.arc`]: donor.rawARC,
      "extraction.json": strToU8(JSON.stringify({schema: "t3cs-donor-extraction/1", ...donor.report, sourceModified: false, gameVerified: false}, null, 2)),
    }));
    status("Original executable, donor model and texture ARC saved with extraction report.", 1);
  } catch (e) { showError(e); }
  finally { setBusy(false); }
};
$("game-files").onclick = async () => {
  try {
    if (!window.studio)
      throw Error("Use the desktop file dialog to load original game data");
    const records = await window.studio.openGameFiles();
    if (!records.length) return;
    await loadGameRecords(records);
    status(
      "USA donor records extracted and capacity-checked. Gameplay remains unverified.",
      1,
    );
    technical();
  } catch (e) {
    showError(e);
  } finally {
    setBusy(false);
  }
};
$("bns-export").onclick = async () => {
  if (!nativeCandidate || !gameData || busy) return;
  setBusy(true);
  try {
    status(
      "Building a separate BNS copy; original game data remains unchanged…",
      0.4,
    );
    const patch = await patchDiscCopy({
      ...gameData,
      candidate: nativeCandidate,
    });
    if (await save("TEKKEN3-patched.bns", patch.bytes)) {
      await save(
        "TEKKEN3-patched-manifest.json",
        strToU8(JSON.stringify(patch.manifest, null, 2)),
      );
      status(
        "Patched BNS copy saved. ISO/Expanded installation and gameplay are not validated.",
        1,
      );
    }
  } catch (e) {
    showError(e);
  } finally {
    setBusy(false);
  }
};
$("source-pose").onclick = returnSourcePose;
$("native-build").onclick = runNative;
$("native-export").onclick = async () => {
  if (!nativeCandidate) return;
  try {
    const output = {
      "candidate.3dm": nativeCandidate.model,
      "candidate.relocs": nativeCandidate.relocations,
      "candidate.arc": nativeCandidate.arc,
      "report.json": strToU8(JSON.stringify(nativeCandidate.report, null, 2)),
      "bind-profile.json": strToU8(JSON.stringify(nativeBind, null, 2)),
      "README.txt": strToU8(
        "NATIVE DONOR CANDIDATE — NOT GAME VERIFIED\nContains actual 3DMK geometry and a donor texture ARC. This is not a GLB export.\nDo not install without an appropriate donor-specific loader or disc packing workflow.\nThis package contains original donor data. It is not a source-code distribution artifact.\n",
      ),
    };
    await save("native-donor-candidate.zip", zipSync(output));
  } catch (e) {
    showError(e);
  }
};
$("expanded-export").onclick = async () => {
  if (!nativeCandidate || !donor || busy) return;
  setBusy(true);
  try {
    const slot = DONORS.find(d => d.id === $("donor-slot").value);
    const tiles = decodeTextureArchive(nativeCandidate.arc).tiles.map(t => t.bytes);
    const container = writeT3CM({donor: donor.model.bytes, modelId: slot.modelId, native: nativeCandidate, textureTiles: tiles});
    const parsed = readT3CM(container.bytes);
    const manifest = {
      schema: "t3cs-expanded-container/1", donorSlot: slot.id, modelId: slot.modelId,
      donorSha256: nativeCandidate.report.donorSha256, modelSha256: nativeCandidate.report.modelSha256,
      container: "T3CM v2 / T3TX multi-CLUT", clutRuns: parsed.texture.runs.length,
      formatReference: "Expanded 1.1.3 with Character Builder T3CB-PATCH-14 custom-model loader",
      loaderIncluded: false, loaderVerified: false, gameVerified: false,
      installInstructions: "Requires a separately built compatible T3CM loader. Assign model.bin to the donor character model payload using that loader's package rules. This ZIP is not an official Expanded mod package and must not be installed by guessing a mod-folder path.",
    };
    await save("expanded-container-candidate.zip", zipSync({
      "model.bin": container.bytes,
      "manifest.json": strToU8(JSON.stringify(manifest, null, 2)),
      "validation.json": strToU8(JSON.stringify(nativeCandidate.report, null, 2)),
    }));
    status("T3CM/T3TX candidate exported and decoded. Compatible loader installation and gameplay remain unverified.", 1);
  } catch (e) { showError(e); }
  finally { setBusy(false); }
};
$("bind-profile").onclick = async () => {
  try {
    if (window.studio) {
      const records = await window.studio.openBindProfile();
      if (records.length)
        await loadBindProfile(
          JSON.parse(new TextDecoder().decode(records[0].data)),
        );
    } else $("bind-file").click();
  } catch (e) {
    showError(e);
  }
};
$("bind-file").onchange = async (e) => {
  try {
    if (e.target.files.length)
      await loadBindProfile(JSON.parse(await e.target.files[0].text()));
  } catch (error) {
    showError(error);
  }
  e.target.value = "";
};

$("import").onclick = async () => {
  try {
    if (window.studio) {
      const f = await window.studio.openFiles();
      if (f.length) await load(f);
    } else $("files").click();
  } catch (e) {
    showError(e);
  }
};
$("files").onchange = async (e) => {
  await load(
    await Promise.all(
      [...e.target.files].map(async (f) => ({
        name: f.name,
        data: await f.arrayBuffer(),
      })),
    ),
  );
  e.target.value = "";
};
$("model-select").onchange = () => load(files, $("model-select").value);
$("convert").onclick = runConvert;
$("cancel").onclick = () => controller?.abort();
$("export").onclick = packagePreparation;
$("donor").onclick = async () => {
  try {
    if (!window.studio) {
      status("Donor file selection is available in the desktop app.");
      return;
    }
    const records = await window.studio.openDonor();
    if (records.length) await loadDonor(records);
  } catch (e) {
    showError(e);
  }
};
$("donor-slot").onchange = () => {
  returnSourcePose();
  clearNativeCandidate();
  nativeBind = null;
  gameData = null;
  donor = null;
  $("bind-status").textContent = "Load matching donor bind frames.";
  setBusy(false);
  $("donor-status").textContent =
    "Load matching original files for this donor costume.";
  technical();
};
$("triangles").oninput = () =>
  ($("triangle-value").value = $("triangles").value);
$("head").oninput = () => ($("head-value").value = $("head").value + "×");
$("reset").onclick = () => {
  sourceView.reset();
  resultView.sync(sourceView);
  simulationView.sync(sourceView);
};
$("skeleton").onchange = () => {
  sourceView.setSkeleton($("skeleton").checked);
  resultView.setSkeleton($("skeleton").checked);
  simulationView.setSkeleton($("skeleton").checked);
};
$("wireframe").onchange = () => {
  for (const root of [
    source?.root,
    converted?.root,
    atlas?.root,
    nativeCandidate?.preview,
    nativeCandidate?.sourcePreview,
    nativeCandidate?.posedPreview,
    simulationView.root,
  ])
    if (root)
      for (const m of collectMaterials(root))
        m.wireframe = $("wireframe").checked;
  sourceView.render();
  resultView.render();
  simulationView.render();
};
$("probe").onclick = () => {
  stopPlayback();
  if (!source) return;
  try {
    const poses = deformationProbe(source.root, source.skeleton);
    $("pose-report").textContent = poses
      .map(
        (p) =>
          `${p.pose}: ${p.samples ? `${p.samples} samples, ${p.finite ? "finite" : "INVALID"}` : "no skinned vertices"}`,
      )
      .join(" · ");
    if (converted)
      converted.poses = deformationProbe(converted.root, converted.skeleton);
    sourceView.render();
    resultView.render();
    technical();
  } catch (e) {
    showError(e);
  }
};
$("screenshots").onclick = async () => {
  stopPlayback();
  try {
    const archive = {};
    for (const [name, angle] of [
      ["front", 0],
      ["side", Math.PI / 2],
      ["back", Math.PI],
    ]) {
      sourceView.reset(angle);
      resultView.sync(sourceView);
      archive[`${name}-source.png`] = dataURLBytes(sourceView.shot());
      archive[`${name}-prepared.png`] = dataURLBytes(resultView.shot());
    }
    await save("comparison-screenshots.zip", zipSync(archive));
  } catch (e) {
    showError(e);
  }
};
for (const event of ["dragenter", "dragover"])
  $("drop").addEventListener(event, (e) => {
    e.preventDefault();
    $("drop").classList.add("hover");
  });
$("drop").ondragleave = () => $("drop").classList.remove("hover");
$("drop").ondrop = async (e) => {
  e.preventDefault();
  $("drop").classList.remove("hover");
  await load(
    await Promise.all(
      [...e.dataTransfer.files].map(async (f) => ({
        name: f.name,
        data: await f.arrayBuffer(),
      })),
    ),
  );
};
window.addEventListener("error", (e) => status(`Renderer error: ${e.message}`));
// Read-only diagnostic/test hooks; no filesystem or IPC bypass.
if (new URLSearchParams(location.search).has("test"))
  window.studioTest = {
    get projectAssetReuse(){return projectAssetReuse;},
    configureSkinning,
    diagnoseMaterialVisibility,
    bakeAtlas,
    sceneIntegrity,
    setReconstruction(stage) { artProfile.reconstruction=stage; },
    syntheticCharacter,
    deformationProbe,
    nativeSyntheticFixture,
    nativeHumanoidFixture,
    load,
    convert: runConvert,
    report,
    loadDonor,
    loadBindProfile,
    runNative,
    get nativeCandidate() {
      return nativeCandidate;
    },
    sourceView,
    resultView,
    exportGLB,
    THREE,
    get source() {
      return source;
    },
    get converted() {
      return converted;
    },
    get atlas() {
      return atlas;
    },
  };

installLandmarkEditor({view:sourceView,getSource:()=>source,getProfile:()=>artProfile,changed:artChanged,status,prepare:returnSourcePose});
$('hair-method').onchange=()=>{artProfile.hairMethod=$('hair-method').value;artChanged();};

$('optimize-candidate').onclick=async()=>{
 if(!converted||busy||artDirty)return;
 setBusy(true);
 try{
  const candidate=await optimizeGameCandidate(converted,{triangles:Number($('triangles').value),binaryCutout:$('bake').checked});
  const baked=$('bake').checked?await bakeAtlas(candidate,{art:candidate.settings.art}):null;
  if(atlas)disposeScene(atlas.root);disposeScene(converted.root);converted=candidate;atlas=baked;
  resultView.setModel(atlas?.root??converted.root,reference);resultView.sync(sourceView);rebuildSimulation();technical();
  status(`Candidate: ${candidate.stats.triangles}/${candidate.settings.triangles} triangles; artistic model ${candidate.optimization.artisticTriangles}. Donor capacity and game compatibility unverified.`,1);
 }catch(e){showError(e);}finally{setBusy(false);}
};

installWorkspace({getState:()=>({source,converted,nativeCandidate,busy,artDirty}),getArt:()=>artProfile,presets:ART_PRESETS,resizeViews:()=>{sourceView.resize();resultView.resize();simulationView.resize();}});
