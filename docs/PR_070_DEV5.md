Allocation correction build 0.7.0-dev.5.1 preserves the dev.5 GLB, all TIMs and Nikki screenshots bit-for-bit. It uses a last-consumer readback cache, retains no unique images, and releases shared buffers after their last material. 142 tests include two cache lifetime/semantic checks. Previous adverse performance measurements remain published; the release receipts provide the actual corrected Windows results.

Facial reconstruction now allocates topology from source curvature and real texel space to the measured face, with local lip correspondence across a source mouth opening and explicit contour protection. Data-map RGB no longer depends on unused alpha; bounded hair filtering retains the source cutoff. Lower-hip creases preserve cargo-pocket features. Failed face/sole experiments are reverted and shown in the review.

Nikki artistic geometry drops from 6,395 to 6,038 triangles. Candidates remain over budget and slightly larger than dev.4; the matched-cost comparison is 1,983 vs 1,999. Heel/sole, fine contours and hems remain unresolved.

140 tests plus visual/skinning/native/mapping/source-project checks are recorded. The Windows workflow tests the actual EXE and private Nikki roundtrip with the same memory counters and sanitized phase summaries. No original source/project/game files are published.

Review: https://github.com/sullythebear/tekken3modelconvertor/releases/tag/v0.7.0-dev.5

Do not merge before human visual review. No original-game research or gameplay acceptance is claimed.
