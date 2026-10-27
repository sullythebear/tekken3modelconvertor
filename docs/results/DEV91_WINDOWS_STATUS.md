# Windows development review receipts

Commit: 88d1e2ef14a120750805e114d71487bd631e7ef3

Portable EXE: PASS; packaged=true; version=0.7.0-dev.9.1.

Private Nikki project: PASS; packaged=true. All 24 original assets byte-verified: true. Temporary data removed: true.

First conversion: 7498 ms; save: 5179 ms; reopen: 6652 ms. ZIP: 49789433 bytes.

Byte-identical raw asset storage reused on reopen: 24 files / 232047502 bytes. This counts actual shared raw buffers; it is not an RSS reduction claim.

Sum of app working sets: 2.940 GiB. Sum of app private committed bytes: 2.751 GiB. Separate test harness RSS: 519.8 MiB.

Working sets may count shared pages multiple times. Private committed bytes exclude shared allocations but are not unique resident RAM. These are measured peaks of different counters, not a hardware minimum or a controlled performance benchmark.

For comparison the published dev.8 packaged-run receipt measured 3,397,128 KiB summed working sets and 3,210,504 KiB private committed bytes, separate harness RSS 660,111,360 bytes, first conversion 6,749 ms, save 5,183 ms and reopen 6,984 ms. ZIP: 49,789,433 bytes. These exact baseline numbers were read from the published dev.8 Visual-Review.zip, not reconstructed from rounded GiB. One run per version cannot establish a statistically reliable memory improvement.

No original source models, textures, project ZIPs, secret URLs or game files are included. Native fixtures are not proof of Tekken gameplay. Artistic approval remains pending.

## Same sampled counters by phase

| Phase | Samples | App working sets GiB | App private committed GiB |
|---|---:|---:|---:|
| import | 29 | 2.407 | 2.196 |
| convert-before-save | 30 | 2.432 | 2.204 |
| save | 20 | 2.381 | 2.177 |
| verify-all-project-assets | 0 | unavailable | unavailable |
| reopen | 27 | 2.940 | 2.751 |
| convert-after-reopen | 23 | 2.893 | 2.701 |

No samples means unavailable, not zero memory. Synchronous harness verification can block its sampler. These are phase summaries of the same 250 ms samples, not a different measurement method.
