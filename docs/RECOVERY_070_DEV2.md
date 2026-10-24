# 0.7.0-dev.2 recovery — 2026-10-24

## Track A: recovered, not rebuilt

The original `/workspace/tekken3modelconvertor` became reachable. Its HEAD was
`ca7e89470df1c893beffe9c3fd2c8bb4ad8c8e84`, branch `work`. There were 15 modified
tracked files and 12 untracked source/workflow/test files. No stash or additional
local dev.2 commit existed. All known interrupted dev.2 modules were present.

Before changes, a binary tracked patch, untracked-source tarball and status list
were saved outside the repository in `/workspace/recovery-backup-dev2/`.
All 27 files were immediately committed as
`e25c13acd6a879bc4004a5f473f1ee4eeb348b14` on `recovery/070-dev2` and pushed.
`git ls-remote` confirmed that exact remote commit. Track B was not needed.
No reset, clean, branch deletion, history rewriting or force push was used.

Recovered modules: anatomical-face, constrained-triangulation, hair-volume,
boot-envelope, torso-bake, projected-topology, game-optimization and landmark-editor.
The converter, atlas allocation, rig diagnostics, source desktop smoke test,
comparison scripts, tests and publishing workflow were also recovered. Use
`git show --stat e25c13a` for the complete inventory and
`git diff ca7e894..recovery/070-dev2` for the implementation differences.

## Other evidence

- Nikki's original ZIP, FBX and 23 TGA files were present and reused locally.
- Cesium Man and both authored fixtures were present.
- `artifacts/final-review-dev2` contained seven stages of screenshots, reports
  and private preparation packages (83 MiB). They are historical evidence;
  new tests/renderings are in `artifacts/recovery-review-dev2`.
- Local source ZIPs through dev.1 and previous Windows/validation ZIPs existed.
  No separate dev.2 source ZIP was found. The recovered working tree was the
  complete known source, rather than a build recovered as source.
- Historical 111-test, skinning, native and desktop logs existed. They were not
  accepted as current results: those routes were rerun after recovery.
- Remote refs initially contained main at ca7e894, no tags and no pull-request
  heads. No dev.2 remote source was found before the recovery push.
- The public releases page was reachable. The Actions page listed older runs;
  run 40117091614 had failed and listed a 253 MB Windows artifact. Its existence
  is not proof of a working dev.2 build. Authenticated artifact contents could
  not be inspected: the CLI token was invalid and api.github.com was denied
  by the network proxy (403). Public HTML and Git transport worked.
- No known source module remains missing. Unrecorded changes from the old
  session cannot be proven absent; no assertion about unknown files is made.

## Post-recovery repair

Visual inspection found that the broad same-side boot projection admitted a
lowered hand. Its outer-surface ray cast stretched the leg mesh to the hand.
The projection now restricts correspondences to the measured leg's transverse
footprint. A detached-hand regression test reproduces the cause. The regenerated
Nikki boots-only image removes those large hand-to-hip triangles. This is a new
repair, not a claim that the interrupted code was already visually correct.

The gallery now displays an explicit unavailable-view cell when a source rig
has no relevant camera landmark, instead of publishing broken image links.

## Validation boundaries

Original Nina donor bytes, measured Namco reference meshes, calibrated donor
bind frames and Tekken runtime are absent. Authored native fixtures and local-axis
rig poses are diagnostics, not gameplay validation. Human artistic review remains
required. The 900-triangle experiment is not an established game capacity.
