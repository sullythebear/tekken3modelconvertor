# Easy Refinement 2.0 — worklog

Branch: development/080-interactive-refinement. Baseline: 20771df (application cae9e38).

## Proven findings
- Easy shape pointer-up committed automatically; other tools used different confirmation paths.
- Selecting a tool could immediately propose a repair using an old mask.
- A selection overlay covered the provisional shape after painting.
- Detail protection currently affects optimization, not every later repair. Do not claim a universal lock.

## Current experiment
Separate tool choice from action, retain a real provisional shape until explicit Apply, hide its mask after the stroke, clear temporary masks after Apply. Texture and protection proposals require the common Preview action. Original SOURCE repair algorithms retained.

## Validation
396/396 Node tests passed outside process-restricted sandbox. First browser-only UI run passed explicit-apply/undo/tool checks but cannot test desktop saving correctly; rerun with real Electron automation and fresh profile.

## Remaining
Full Electron validation; multi-stroke proposal editing; real no-op detection; universal protection; environment healing and clone stamp. No environment/clone buttons exposed. No Windows build or release claimed for these changes.

Next: finish explicit confirmation tests, then checkpoint. Original commercial assets remain private; no TTT2 work.

## Checkpoint validation
- Full suite: 397/397 passed.
- Real local Electron: multi-stroke shape preview does not commit until Apply; one command after Apply, mask cleared, tool retained, undo/redo, cold reopen and independently parsed GLB positions exact. 1366/1920/2560 and renderer zoom 100/125/150 tested.
- Real local Electron SOURCE texture repair: cold pixels and PNG decoded from GLB exact. No commercial visual approval claimed.
- No-effect refusal is an interactive proposal gate; low-level baking/replay stays compatible with valid identical textures.
- Added regression for unchanged SOURCE texture proposal.

Windows validation must run for this exact checkpoint. Later phases remain unimplemented: deterministic environment texture healing, texture Clone Stamp, universal protection against subsequent repairs, combined-repair single-history grouping. This is an explicitly scoped development checkpoint, not completed Easy Refinement 2.0 or a stable release.

SOURCE texture tool is now labelled Retoucheerpenseel, with explicit 'Vanuit origineel' instructions. No environment option exists yet. No-op gate considers both mean and maximum regional improvement (floating-point epsilon only); a small important feature must not be rejected merely because its average effect is small.

## Error feedback checkpoint
Added shared presentation-only error classification: empty mask, missing/unsupported original texture, uncertain correspondence, no improvement, insufficient resolution, unsafe geometry, changed pose, cancellation, unsupported region, and unexpected technical failure. Full original details remain Advanced-only. Twelve targeted tests; full suite now 409/409 passed. Final Windows run must use this checkpoint, not earlier cancelled candidate runs.

Direct original-retouch acceptance also passed in Electron: tool chosen before painting, no proposal on tool selection, explicit Preview/Apply, exact cold reopen and GLB texture pixels. The combined route continues to cover automatic assessment. These are owned synthetic fixtures only.
