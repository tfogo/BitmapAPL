# Walkthrough development

The frontend is a continuous article: **Reading APL through pictures**. It teaches APL’s unfamiliar syntax through small expressions and visible changes to images. Keep the prose simple and the diagrams close to the ideas they explain.

Start it from the repository root:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory web
```

Visit http://127.0.0.1:8765. No npm installation, build, or live APL service is required. JavaScript modules require an HTTP server rather than opening the HTML file directly.

## Article sequence

1. Unpack a short expression: multiply matching values, then reduce them to a sum.
2. Introduce lists, assignment, shape, and whole-array subtraction using pixel values.
3. Follow numbered cells through `⍉` (transpose).
4. Read `+/weights×neighbors` from right to left while a neighborhood moves along a row.
5. Generate offsets with `⍳`, then calculate and normalize Gaussian weights.
6. Introduce functions, `⍵`, Stencil, and Rank; reuse a row filter on columns.
7. Change the weights in the same expression to find edges.

Each section should teach something about reading or composing APL. Images give the symbols a visible purpose. Keep paragraphs short and concrete; explain unfamiliar marks where they first appear. Each figure has one focused control. New algorithms should become follow-up articles rather than additional controls on this page.

The explanatory format draws on Bartosz Ciechanowski's Mechanical Watch and Airfoil articles, linked in the footer. The prose and diagrams are original.

## Rendering and interaction

Canvas diagrams size to their container and account for device pixel ratio. Sliders support pointer, touch, and keyboard input. Arrow keys move the neighborhood examples one pixel at a time. Play controls advance only their local diagram and stop at the end. Offscreen diagrams and hidden tabs pause; a footer button pauses all playback. Reduced-motion preferences make the invert transition immediate. Other motion is controlled directly by sliders or explicitly started with Play.

The two-pass diagram blends between three computed arrays to expose their shapes; it is not a simulation of interpreter scheduling. Its brightness is amplified by a fixed factor, as noted beside the example. Edge magnitude is scaled for display. The model retains full-precision values.

## Verification

```sh
python3 tests/run.py --export
node --test tests/browser-model.test.mjs
```

The Dyalog suite is checked against an independent Python oracle before exporting results. Node checks the shared browser model against 72 blur and 24 Sobel/sharpening cases, plus rectangular transforms. The article uses a subset of this model. It does not run APL in the browser.

Browser checks cover the article render, numeric reveal, neighborhood captions, playback advancement, global pause, and a 390px layout without horizontal overflow. Static canvas descriptions and captions explain the diagrams in text; this is not a comprehensive accessibility audit.

APL385 is public-domain font artwork by Adrian Smith; attribution is in `web/fonts/NOTICE.md`.

## Second article: Choosing a neighbor

`web/neighborhoods.html` continues the introduction with ravel, grade, indexing, compress, maximum/minimum reductions, and function composition. Its diagrams are controlled directly by sliders:

- Nine values move from a patch to a list, then to sorted positions. The highlighted median is an actual member of the neighborhood.
- A deterministic salt-and-pepper pattern feeds both a Gaussian and a median filter. The noise slider retains the seed, so comparisons use the same input.
- A square or cross scans a binary shape. Missing neighbors are outlined with dashes; dilation uses exterior zero and erosion uses exterior one.
- Opening and closing reveal two discrete stages, with a visual blend between them. They use the same footprint and boundary convention as the library.

The two articles share typography and the numerical model. The second page uses `neighborhoods.mjs` for its diagrams. Exported fixtures now include 81 median cases and 552 morphology cases in addition to the original 96 numerical cases. The full numerical checks remain the commands above.

Verified in the browser: the grade order and middle value, noise control, erosion with a cross at an image border, both composition endpoints, and a 390px layout with no horizontal overflow. The displayed grade, Stencil, and composition examples also execute successfully in Dyalog.

## Third article: Counting the light

`web/contrast.html` and `web/contrast.mjs` introduce comparisons, Each, scan, and table lookup. The first three diagrams share an eight-pixel fixture: count arrivals into bins, sweep the cumulative counts, then trace an input level through its mapping. The larger example is a deterministic grayscale landscape; a wipe compares the original and equalized pixels. Two static histograms use four-level bins and a shared vertical scale.

The page explicitly distinguishes this global mapping from neighborhood filters, explains CDF-min normalization and rounding, and leaves constant images unchanged. All diagrams use the tested browser model. Fixtures include 28 Dyalog equalization cases with all intermediate arrays. Sliders control motion directly; the accumulating-pixel animation illustrates the idea, not interpreter scheduling.

Verified all displayed third-article code blocks by executing them together in Dyalog. Browser checks cover completed counts, the final running total, lookup of an unoccupied bin, the full equalized image, and a 390px layout without horizontal overflow.

## Fourth article: Until nothing changes

`web/regions.html` and `web/regions.mjs` reuse dilation to explain constrained growth, then introduce Power with a numeric iteration count and match as a stopping test. A seed selector includes a background seed; four/eight-neighbor controls expose diagonal connectivity. A second diagram propagates minimum positive labels synchronously and shows a region-area table at convergence. Numbered labels supplement color.

The browser's final results and all trace states are checked against 288 Dyalog cases. Independent Python breadth-first search checks region membership, IDs, areas, and the distances that determine flood-fill frames. APL keeps only current working arrays; browser functions retain traces for small teaching fixtures. The page explains finite monotone convergence and the cost of rescanning an image.

Verified the fourth article’s code blocks in Dyalog and its browser controls: four-neighbor fill reaches 8 cells, eight-neighbor fill reaches 10, a background seed stays empty, and the final area table changes from four regions to three while preserving 17 foreground pixels. Checked a 390px layout without horizontal overflow.
