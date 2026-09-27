# Bitmap APL roadmap

Build a reliable Dyalog image-processing library and an animated explainer that makes its array operations visible. The first release should take a reader from pixels to Gaussian blur and Sobel edges; later releases introduce nonlinear filters, statistics, regions, and dynamic programming.

Completed items are checked below. The Gaussian core and BMP adapter are implemented and tested; Sobel and sharpening are also implemented. The frontend is a linear illustrated walkthrough; later operations remain planned. See [the source review](docs/library-review.md) for the initial findings and [local setup](docs/development.md) for runtime instructions.

## 0. Establish a runnable baseline

- [x] Install and verify Dyalog on the development Mac; record version and invocation.
- [x] Add a runtime smoke check for arithmetic, transpose, Stencil, and class loading, with nonzero failure status.
- [x] Load the existing class and reproduce the blur failure with a small generated BMP.
- [x] Add a repeatable test runner and deterministic fixtures: impulse, step edge, constant plane, asymmetric rectangle, separate color planes, and binary shapes.
- [x] Correct the README's argument contract, quoted output path, and three-versus-four-channel example as the API is repaired.

**Done when:** the runtime check passes, the original blur failure is reproduced, and the initial deterministic fixture suite is available. The runtime, original-failure reproduction, and deterministic fixture suite are complete.

## 1. Repair Gaussian blur and define the image contract

- [x] Separate pure array operations from BMP decoding and encoding.
- [x] Specify `channels height width`, top-to-bottom canonical row order, channel meanings, value range, and index origin.
- [x] Pass radius/sigma or a precomputed kernel explicitly. Define sigma in pixels; radius zero is the identity.
- [x] Implement named zero, clamp, and reflect boundaries; specify whether reflected endpoints repeat.
- [x] Apply row/column operations independently to each color plane. Preserve the fourth byte according to the supported BMP format rather than assuming alpha.
- [x] Keep floating point and signed intermediate results; round/clip only when appropriate for display or serialization.
- [x] Validate the supported uncompressed 32-bit BMP subset, handle row orientation, and close file ties on failure.
- [x] Keep the convolution-matrix version as a teaching reference. Compare a Stencil version against a direct 2-D oracle before benchmarking it.

**Animation:** start with an impulse; expand its Gaussian weights, slide a window along one row, then show the horizontal and vertical passes. Let the reader change sigma independently of radius and inspect boundary samples.

**Verified:** 72 comparisons against a Python direct 2-D oracle plus Dyalog kernel, boundary, channel, validation, resource-cleanup, and BMP round-trip checks pass. Stencil and matrix results agree; performance benchmarking remains future work.

## 2. Ship the first animated lesson: pixels → blur → edges

- [x] Teach shape/reshape `⍴`, indexing, whole-array inversion and thresholding, reverse `⌽`, and transpose `⍉` using a small numeric grid.
- [x] Add a reusable neighborhood operation with an explicit correlation/convolution convention. Gaussian symmetry hides kernel reversal; directional filters do not.
- [x] Add Sobel horizontal/vertical gradients and magnitude. Show signed gradients before mapping them to display colors.
- [x] Add unsharp masking by subtracting the blurred image and scaling the detail layer.
- [x] Introduce Stencil `⌺`, weighted sums `+/`, inner product `+.×`, and Rank `⍤` at the point they become useful.

**Animations:** move each pixel to its new position during transpose; align a kernel with a neighborhood and reveal products before their sum; build the two Sobel responses beside their combined magnitude; reveal the detail layer before adding it back for sharpening.

**Done when:** a reader can step through a single output pixel, then run the same operation over the image. A constant plane has zero interior Sobel response; horizontal and vertical ramps produce the expected signed direction; sharpening strength zero returns the original.

**Current presentation:** a continuous article with short paragraphs and one focused demonstration at a time, following the user’s preference for the clear explanatory style of ciechanow.ski. Diagrams cover pixel values, inversion, transpose, weighted neighborhoods, Gaussian weights, two passes, and edges. The shared model still agrees with 96 exported Dyalog cases. Sharpening remains available in the library; it is not added to the introductory article.

- [x] Add an image-scale Sobel reveal after the small neighborhood explanation.
- [x] Animate transpose within a single figure using a directly controlled slider.

**Release 1 scope:** grayscale lessons plus one color-plane explanation, Gaussian blur, Sobel, and unsharp masking. Use both tiny numeric fixtures and a larger image preview. Avoid waiting for later algorithms before making this usable.

## 3. Add nonlinear neighborhoods and binary shapes

| Operation | APL lesson | Animation | Correctness check |
| --- | --- | --- | --- |
| Median filter | Ravel `,`, grade `⍋`, indexing, Stencil | Sort neighborhood values and highlight the median; compare removal of seeded salt-and-pepper noise with Gaussian smoothing | Compare with hand-sorted windows, including edges |
| Dilation / erosion | Boolean arrays, maximum/minimum reductions `⌈/` and `⌊/` | Move a structuring element and show which neighbors decide the output | Known small shapes and explicitly defined exterior values |
| Opening / closing | Function composition | Show erosion→dilation or dilation→erosion as separate stages | Known specks/holes and idempotence under the selected boundary convention |

Start with a full 3×3 structuring element, then add a cross-shaped mask. Show a nonlinear reducer reusing the neighborhood machinery rather than describing every filter as convolution.

## 4. Add global statistics and connected regions

| Operation | APL lesson | Animation | Correctness check |
| --- | --- | --- | --- |
| Histogram equalization | Counting/grouping, cumulative scan `+\`, table lookup | Accumulate bins, sweep the cumulative distribution, then trace pixels through the brightness mapping | Pixel counts conserved; mapping monotone; constant image handled explicitly |
| Flood fill | Masks, neighbor propagation, iteration | Expand one frontier per step from a selected seed | Fill remains in the allowed mask; disconnected areas remain untouched |
| Connected components | Convergence with Power `⍣`, grouping and reductions | Propagate region labels, then color regions and reveal their areas | Known object counts, areas, and explicit 4- versus 8-connectivity |

**Done when:** the demo distinguishes local neighborhood rules from whole-image statistics and iteration. Histogram equalization initially operates on grayscale only.

## 5. Build Canny as a complete pipeline

- [ ] Reuse Gaussian smoothing and gradients.
- [ ] Add gradient direction and non-maximum suppression.
- [ ] Add low/high thresholds and retain weak edges connected to strong ones.
- [ ] Specify direction quantization/interpolation, boundary rules, and connectivity.

**Animation:** a synchronized strip of source → smoothing → gradient → thinning → strong/weak classification → connected edges. Animate weak-edge acceptance as propagation from strong edges, with both thresholds adjustable.

**Done when:** synthetic lines and junctions validate thinning and connectivity, and increasing thresholds behaves as documented. Compare against a reference with matching conventions rather than demanding bitwise equality with a differently configured implementation.

## 6. Add seam carving as the advanced demonstration

- [ ] Reuse gradients to compute an energy map.
- [ ] Accumulate minimum path costs row by row with explicit boundary handling.
- [ ] Backtrack the selected seam, remove it, and recompute energy before the next removal.
- [ ] Start with vertical removal; add horizontal removal by reusing the spatial-axis transformation.
- [ ] Show limitations on images with dense important content, straight lines, and repeated patterns.

**Animation:** color the energy map, reveal candidate predecessor costs for one cell, fill the cumulative-cost table, trace the winning path, then remove one seam. Provide a width control and a comparison with ordinary resizing.

**Done when:** each seam is connected and removes exactly one pixel per row, tiny cases match exhaustive minimum-path search, and repeated removal respects minimum dimensions. Define deterministic tie-breaking so animations are reproducible.

## Editorial direction

Use a linear article, inspired by the explanatory pacing of [Mechanical Watch](https://ciechanow.ski/mechanical-watch/) and [Airfoil](https://ciechanow.ski/airfoil/). Write original text and diagrams. Keep sentences short and concrete. Introduce names after the reader has seen the idea. Let each diagram answer the preceding paragraph’s question, with one useful control. Add later algorithms as short follow-up articles instead of expanding a control-heavy dashboard.

## Shared animation and documentation design

- **One state, several views:** synchronize the image, numeric array, active APL expression, and intermediate values. Highlight the subexpression that produced the visible result.
- **Reader control:** play/pause, single-step, scrub, reset, and speed controls. Parameter changes reset or recompute the trace consistently. No forced autoplay; honor reduced-motion settings and provide equivalent static steps.
- **Teach without hiding arithmetic:** small fixtures expose every value; larger previews show the practical effect. Explain that a sequential animation illustrates dependencies and need not represent the interpreter's physical execution order.
- **Keyboard and text access:** label controls, retain visible focus, support stepping without a mouse, and summarize the selected pixel/window in text. Use sign labels as well as color for gradients.
- **Bound the work:** cap grid sizes and trace length, avoid storing every full-image frame, and cancel obsolete calculations when controls change.
- **Keep APL authoritative:** run kernels and fixtures in Dyalog and export versioned expected results and traces. A browser implementation may support immediate interaction, but must identify itself as a model and be checked against those fixtures. Arbitrary APL evaluation in a public frontend is outside the first release.
- **Explain each operation consistently:** input/output shape, formula, expanded APL, compact APL, intermediate arrays, boundaries, complexity, tests, and practical limitations.

Current layout: `bitmap.dyalog` is the adapter, `src/` contains pure operations, and `tests/` contains the Dyalog suite and independent Python oracle. Add examples under `examples/` and the explainer under `web/` when those features land.

## Suggested implementation order

Runtime and smoke check → blur/API fixes → shared animation surface and Gaussian lesson → Sobel and sharpening → median and morphology → histogram/regions → Canny → seam carving.

Keep each milestone independently useful. Choose the frontend stack when starting the first lesson; deployment and a hosted Dyalog service are separate decisions.

## References

- [Dyalog Stencil](https://docs.dyalog.com/20.0/language-reference-guide/primitive-operators/stencil/) and [Rank](https://help.dyalog.com/19.0/Content/Language/Primitive%20Operators/Rank.htm)
- [Sobel derivatives](https://docs.opencv.org/4.x/d2/d2c/tutorial_sobel_derivatives.html), [morphology](https://docs.opencv.org/4.x/d9/d61/tutorial_py_morphological_ops.html), [histogram equalization](https://docs.opencv.org/4.x/d5/daf/tutorial_py_histogram_equalization.html), and [Canny](https://docs.opencv.org/4.x/da/d22/tutorial_py_canny.html)
- [Avidan and Shamir: Seam Carving for Content-Aware Image Resizing](https://cs.brown.edu/courses/cs016/static/files/docs/seamcarving_original_paper.pdf)
