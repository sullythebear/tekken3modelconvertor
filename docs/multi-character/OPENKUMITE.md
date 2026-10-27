# OpenKumite feasibility review

Reviewed source commit `04cee6a645b86dbd3c7c6c372d4e59886cba99f6` from https://github.com/openkumite/openkumite . MIT license; no engine code copied and no Rust dependency added to Conversion Studio. The repository describes game-specific conversion as a separate project and contains no game data.

Confirmed in `crates/kumite_assets/src/lib.rs` and `crates/kumite_render/src/shader.wgsl`:

- glTF node parent hierarchy, translations/quaternions and inverse bind matrices; loader validates skin-joint/inverse-bind count and attribute/index bounds.
- Character loader currently selects the **first skin, first mesh and first image**, then consumes that mesh's primitives. UV0, JOINTS_0 and WEIGHTS_0 are required. The renderer uses standard **four-influence linear blend skinning**.
- Animation tracks are sampled as 60 Hz frame arrays. Arbitrary source keyframe timings cannot simply be renamed to these motion tracks.
- Renderer explicitly attributes original-engine seam welding to the separate converter's skin-weight production; it does not provide a general automatic character seam-repair or retopology algorithm.
- Character loading does not implement a general modern multi-material PBR workflow. Static rendering uses texture × vertex colour; character loading expects the preconverted texture image. Source node scale is discarded by the character loader's translation/rotation decomposition, so scaled models need correct geometry/bind preprocessing.

A separate export target is technically plausible: merge all character parts into one indexed skinned mesh, one validated atlas in UV0, remap a single coherent skin/inverse-bind table, reduce influence count only with measured deformation guards, bake node scales correctly and resample suitable animations to the required frame convention. The current 12-influence-preserving, multi-mesh/texture GLB cannot be advertised as ready merely because the container is glTF. Cena and Rhea in the supplied archive have no skins, so the current OpenKumite character loader would reject them. Gameplay also requires compatible game data/manifest/animation semantics beyond a mesh file.

Conclusion: useful strict asset validation and skinning reference; no demonstrated drop-in export or repair solution. No application rewrite, engine installation, export menu or unverified compatibility claim was introduced. Prioritize Rhea/Cena/Marston diagnostics and private visual validation first.

References pinned to reviewed code:
- https://github.com/openkumite/openkumite/blob/04cee6a645b86dbd3c7c6c372d4e59886cba99f6/crates/kumite_assets/src/lib.rs
- https://github.com/openkumite/openkumite/blob/04cee6a645b86dbd3c7c6c372d4e59886cba99f6/crates/kumite_render/src/shader.wgsl
- https://github.com/openkumite/openkumite/blob/04cee6a645b86dbd3c7c6c372d4e59886cba99f6/LICENSE-MIT
