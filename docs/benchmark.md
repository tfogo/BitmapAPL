# Row-filter benchmark

Measured on 2026-09-27 with Dyalog 20.0.53963.0 on an Apple M4 Max. Run:

```sh
ENABLE_CEF=0 dyalog -script scripts/benchmark.apls
```

The script warms both implementations, checks agreement, then reports the median of five wall-clock samples, each containing 200 calls. Inputs are deterministic numeric rows; sigma is 1 and boundaries reflect with repeated endpoints. Times include padding and function-call overhead. Millisecond clock resolution makes the smallest per-call values approximate.

| Row length | Radius | Stencil ms/call | Window matrix ms/call |
| ---: | ---: | ---: | ---: |
| 64 | 1 | 0.180 | 0.010 |
| 64 | 4 | 0.200 | 0.010 |
| 256 | 1 | 0.630 | 0.015 |
| 256 | 4 | 0.650 | 0.015 |
| 1024 | 1 | 2.400 | 0.015 |
| 1024 | 4 | 2.665 | 0.040 |

The matrix/inner-product version is faster on these small windows and row sizes. The teaching Stencil implementation makes each neighborhood function visible, but invokes that function many times. The matrix approach allocates a row-length × kernel-length window table. These results do not establish which is best for large radii, full images, other interpreters, or memory-constrained workloads; memory use was not measured. The library keeps both implementations and uses Stencil in its teaching blur path.
