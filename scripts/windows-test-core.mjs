import {createHash} from 'node:crypto';
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export function validateConfig(c) {
  if (!c || typeof c.nikkiDirectory !== 'string' || !c.nikkiDirectory) throw Error('Select the extracted Nikki folder');
  if (!c.gameDirectory && !c.discImage && !c.donorPackage) throw Error('Select original game files, ISO/BIN, or an extracted donor package');
  for (const key of ['gameDirectory','discImage','donorPackage','runtimeAdapter','bindProfile'])
    if(c[key] != null && typeof c[key] !== 'string') throw Error('Invalid path: '+key);
  return c;
}
export function validateRuntimeReceipt(r, candidateHash, runId) {
  if (r?.schema !== 't3cs-runtime-install/1' || r.runId !== runId || r.candidateSha256 !== candidateHash || r.donorId !== 'nina-p1-us')
    throw Error('Runtime receipt does not bind this run, candidate and Nina slot');
  if (!r.expandedVersion || !r.loaderVersion || !r.executable || !r.workingDirectory || !Array.isArray(r.arguments) || r.arguments.some(a=>typeof a!=='string'))
    throw Error('Runtime receipt is missing explicit loader/build/launch details');
  if (r.installed !== true || r.sourceModified !== false || !Array.isArray(r.installedFiles) || !r.installedFiles.length)
    throw Error('Runtime adapter must install into a separate test copy and list installed hashes');
  for (const f of r.installedFiles)
    if(typeof f.path !== 'string' || !/^[a-f0-9]{64}$/.test(f.sha256)) throw Error('Invalid installed file hash');
  return r;
}
export function finalVerdict(checks) {
  if(!checks.length)checks=[{name:'test execution',status:'BLOCKED',detail:'No checks executed'}];
  const failures=checks.filter(c=>c.status!=='PASS');
  return {status: failures.length ? 'FAIL' : 'PASS', failures: failures.map(c=>({name:c.name,status:c.status,detail:c.detail})), checks};
}
export function renderReport(report) {
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const comparison=report.checks.some(c=>c.name==='Nikki desktop import/materials/atlas'&&c.status==='PASS')
    ? '<h2>Nikki: bron / voorbereiding</h2><p>Identieke camera. Dit toont geen game-integratie.</p><img width="45%" src="nikki/front-source.png" alt="Nikki bron"><img width="45%" src="nikki/front-prepared.png" alt="Nikki voorbereiding"><p><a href="nikki/results.json">Volledige Nikki-metingen</a> · <a href="nikki/workspace.png">Studio-screenshot</a></p>' : '';
  return `<!doctype html><meta charset="utf-8"><title>Conversion Studio Windows test</title><style>body{font:16px system-ui;background:#111923;color:#edf2f7;margin:3em}a{color:#9dc8ff}td,th{padding:12px;border:1px solid #465366;text-align:left}table{border-collapse:collapse}pre{white-space:pre-wrap}</style><h1>${escape(report.status)} — Nikki / Nina</h1><p>Run ${escape(report.runId)}. Platform: ${escape(report.platform)}.</p><p>Een gestarte emulator of screenshot bewijst geen speelbaar personage. BLOCKED en ontbrekende beoordeling tellen als FAIL.</p><table><tr><th>Controle</th><th>Status</th><th>Bewijs / reden</th></tr>${report.checks.map(c=>`<tr><td>${escape(c.name)}</td><td>${escape(c.status)}</td><td>${escape(c.detail)}</td></tr>`).join('')}</table>${comparison}<p><a href="report.json">Machineleesbaar rapport</a>. Bekijk de fase-logs en runtime-map in deze bewijsmap. Deze map kan auteursrechtelijke modellen/gamegegevens bevatten; publiceer hem niet automatisch.</p>`;
}
