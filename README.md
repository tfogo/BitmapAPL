# Bitmap APL

A Dyalog APL library for exploring images as arrays. It includes a BMP adapter and pure Gaussian filtering operations, with independent numerical and file-format checks.

[Roadmap](ROADMAP.md) · [Local setup](docs/development.md) · [Original source review](docs/library-review.md)

## Load the library

Use Dyalog APL 20 (the tested version). From a session whose working directory is this repository:

```apl
⎕FIX 'file://src/ImageOps.dyalog'
⎕FIX 'file://bitmap.dyalog'
```

Load both into the root namespace `#`; the `Bitmap` adapter calls `#.ImageOps`. Absolute `file:///...` paths work too. No external APL packages are required.

## Read, blur, and write

```apl
bm←⎕NEW Bitmap '/path/to/input.bmp'
⍴bm.ImageTable                  ⍝ 4 height width
bm.gaussianBlur 3 1             ⍝ Radius 3, sigma 1 pixel; clamp edges
bm.write '/path/to/new-output.bmp'
```

`gaussianBlur` updates the first three planes in place, leaving the fourth untouched. An optional third argument selects the boundary:

```apl
bm.gaussianBlur 3 1 'reflect'
```

The output path must not already exist. Writing rounds to the nearest integer (half up), clips to `[0,255]`, and does not change the in-memory floating point values. Resizing is not supported by the adapter.

### Image and file contract

`ImageTable` has shape **4 × height × width**, ordered **blue, green, red, unused byte**. Row order in memory is always top to bottom, independent of the file's orientation. The fourth byte is preserved during blur; it is not interpreted as alpha.

The initial supported BMP subset is deliberately narrow:

- `BM` signature, 40-byte `BITMAPINFOHEADER`, one plane, 32 bits per pixel.
- `BI_RGB` (uncompressed), no color table, pixel data at byte 54.
- Positive width; positive (bottom-up) or negative (top-down) nonzero height.
- Exact file size, with no trailing blocks; declared pixel size may be zero or the actual size.

Unsupported or malformed files raise `DOMAIN ERROR`; native file errors propagate. File ties are released on validation and I/O failures. Header bytes and original row orientation are preserved on write. Bitfields, compressed data, 24-bit files, color profiles, and actual alpha interpretation are not supported.

## Work directly with arrays

The pure operations do not require a BMP. A plane is a nonempty numeric matrix, and an image is a nonempty numeric array of shape `channels height width`. Results retain floating point precision and are not clipped.

```apl
plane←5 7⍴0
plane[3;4]←255                  ⍝ These example indices assume ⎕IO←1
kernel←ImageOps.GaussianKernel 3 1
blurred←(3 1 'clamp') ImageOps.BlurPlane plane
colorResult←(3 1 'reflect') ImageOps.BlurImage colorImage
```

`BlurImage` filters every supplied plane independently. The BMP adapter chooses only B/G/R for filtering. Internal indexing is independent of the caller's `⎕IO`.

Radius must be a nonnegative integer; sigma must be positive and is measured in pixels. Radius zero is the identity. The kernel uses integer offsets `-radius…radius` and is normalized to sum to one. Radius controls the finite support; sigma controls the distribution within it.

| Boundary | Values outside a row `a b c` |
| --- | --- |
| `zero` | `… 0 0 │ a b c │ 0 0 …` |
| `clamp` | `… a a │ a b c │ c c …` |
| `reflect` | `… c b a │ a b c │ c b a …` (edge values repeat) |

Zero extension darkens constant images near the edge. Clamp and reflect preserve constants. All modes handle a one-pixel dimension and kernels wider than the image.

## APL concepts in the implementation

- `⍳` generates pixel offsets; array arithmetic builds Gaussian weights; `+/` normalizes them.
- `⌺` supplies each row's neighborhood; `+/kernel×⍵` computes its weighted sum.
- Rank `⍤1` applies a row operation to a plane; `⍤2` handles each image plane independently.
- `⍉` swaps the two spatial dimensions inside the plane operation, enabling two separable passes.
- `ImageOps.MatrixFilterRow` is a teaching reference: build the window matrix and apply `+.×`. Tests compare it with the Stencil implementation. Performance has not yet been benchmarked.

The row operations apply weights in their given order (correlation). Gaussian symmetry makes correlation and convolution equivalent here; directional kernels must account for the distinction.

## Checks

```sh
./scripts/check-runtime.sh
python3 tests/run.py
```

The runtime check confirms that Dyalog and both source files load. The full suite requires Python 3's standard library and Dyalog on `PATH`. It creates temporary fixtures and removes them afterward.

Checks include 72 blur cases against an independent Python direct 2-D oracle, kernel properties, boundary behavior, origin independence, channel separation, malformed BMP rejection, file-tie cleanup, byte-exact top-down/bottom-up round trips, fourth-byte preservation, and output rounding/clipping. These are runtime checks of the actual APL implementation.

## Compatibility with the original prototype

The documented `bm.gaussianBlur radius sigma` call now works and mutates `ImageTable`. The previous array-returning method and its public helpers have been replaced by the pure `ImageOps` namespace. Transient byte buffers are no longer public fields. `DIBHeader` fixes the original spelling; `DIPHeader` remains available as a read-compatible copy. Editing these exposed header copies does not change serialization.

The local walkthrough teaches APL’s unusual syntax through pictures, building from lists and whole-array arithmetic to Gaussian blur and edges. See the preview instructions below.

## Edges, correlation, and sharpening

```apl
edges←'clamp' ImageOps.Sobel plane
edges.gx                       ⍝ Signed horizontal brightness change
edges.gy                       ⍝ Signed vertical brightness change
edges.magnitude                ⍝ Square root of gx² + gy²
sharper←(3 1 1.5 'reflect') ImageOps.Unsharp plane
filtered←((3 3⍴0 1 0 1 ¯4 1 0 1 0) 'clamp') ImageOps.Correlate plane
```

`Correlate` applies any nonempty odd-sized rectangular kernel in its given order. Sobel uses unnormalized 3×3 kernels, so a unit horizontal ramp has interior `gx=8`. `Unsharp` takes radius, sigma, nonnegative strength, and boundary mode. Results retain signs and values outside the display range; clipping belongs to presentation or serialization.

`python3 tests/run.py --export` regenerates `web/fixtures/apl-reference.json` from the actual Dyalog results after all numerical and BMP checks pass. It includes 72 blur cases and 24 Sobel/sharpening cases for browser parity checks.

## Median filters and binary morphology

```apl
clean ← (1 'clamp') ImageOps.Median plane
larger ← ('dilate' 'square') ImageOps.Morphology mask
smaller ← ('erode' 'cross') ImageOps.Morphology mask
opened ← ('open' 'square') ImageOps.Morphology mask
closed ← ('close' 'square') ImageOps.Morphology mask
```

`Median` accepts a nonempty numeric matrix and `(radius boundary)`. Its full square window has side `1+2×radius`; radius must be a nonnegative integer. It supports the same three boundary modes as blur and preserves fractional/signed values. Radius zero returns the input. Sorting each window costs O(HW K log K), where K is the number of samples. It is a teaching implementation, not an optimized running median.

`Morphology` accepts a nonempty matrix of zeros and ones. The footprint is either a full 3×3 `square` or the five-cell `cross`, including its center. Dilation takes a neighborhood maximum; erosion takes its minimum. The exterior is neutral: zero for dilation and one for erosion. Each stage retains the original dimensions. Opening is erosion followed by dilation; closing reverses that order. With these symmetric footprints and boundary rules, opening and closing are idempotent. They can remove thin features or join nearby shapes.

The suite compares 81 median and 552 morphology cases against independent Python oracles, including every 2×3 binary image, singleton dimensions, boundary handling, and opening/closing idempotence. Exported Dyalog results also verify the browser model.

## Grayscale histogram equalization

```apl
contrast ← ImageOps.Equalize plane
contrast.histogram       ⍝ 256 pixel counts
contrast.cumulative      ⍝ running totals
contrast.mapping         ⍝ 256 integer output levels
contrast.output          ⍝ equalized image, same shape
```

Input must be a nonempty matrix of integers from 0 to 255. The mapping subtracts the first nonzero cumulative count, scales the remaining range to 0–255, and rounds to the nearest integer (halves round up). Levels below the first occupied bin map to zero. Constant images remain unchanged and return an identity mapping. The implementation counts each of 256 levels separately: O(256N) work with O(N+256) temporary storage. It does not construct a 256×N equality table.

This is a global grayscale operation: the mapping depends on the whole image. It can amplify noise or produce harsh contrast, and it does not guarantee a flat output histogram. Applying it independently to RGB channels can change colors; color equalization is outside this API. Tests cover 28 independent oracle cases, intermediate counts/mappings, monotonicity, constant images, and invalid inputs.

## Flood fill and connected regions

```apl
filled ← (4 (1 1)) ImageOps.FloodFill mask
regions ← 8 ImageOps.Components mask
regions.labels           ⍝ zero for background, positive IDs for regions
regions.ids              ⍝ sorted region IDs
regions.areas            ⍝ pixel counts in that order
regions.count
```

Both functions accept nonempty binary matrices and connectivity 4 (shared sides) or 8 (sides and corners). The exterior is background; opposite image edges never connect. Seeds are always zero-based `(row column)`, regardless of the caller’s `⎕IO`. A seed on background returns an all-zero fill; out-of-bounds or fractional coordinates are rejected.

Components use synchronous minimum-label propagation until stable. Each foreground pixel starts with its one-based row-major position; the smallest ID in a region survives. IDs are deterministic but need not be consecutive. `LabelStep` exposes one propagation step for teaching; it expects a nonempty label matrix with zeros for background and foreground IDs in `1…H×W`. Flood fill repeats masked dilation until unchanged. Both algorithms take O(ND) work, where D is the number of propagation rounds; a long narrow path can make this O(N²). They prioritize visible array operations over queue-based performance.

The 288 oracle cases include every 2×3 binary mask, diagonal contacts, a winding path, isolated/background seeds, border shapes, and both connectivities. Python breadth-first search checks labels, counts, areas, and fill distances; the browser is checked against every exported Dyalog step. Browser teaching functions retain traces, so use them only for small examples; the APL functions retain only the working arrays.

## Canny and seam carving

```apl
edges ← (2 1 35 100) ImageOps.Canny plane
smaller ← (4 'vertical') ImageOps.Carve plane
```

Canny exposes all stages from Gaussian smoothing to linked edges. Seam carving exposes energy, cumulative costs, predecessor paths, and repeated vertical or horizontal removal. See [the advanced operation contracts](docs/advanced-operations.md) for thresholds, border rules, tie-breaking, complexity, limitations, and the independent oracle checks.

## Animated explainer

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory web
```

Open [the local walkthrough](http://127.0.0.1:8765). Read straight down: unpack an APL expression, learn its symbols through animated pictures, and reuse them to blur images and find edges. Each diagram has one focused control. There are no lesson tabs or shared control panel. It requires no npm installation or build step.

The browser uses a JavaScript model, not a live APL interpreter. Validate it against freshly executed Dyalog outputs with:

```sh
python3 tests/run.py --export
node --test tests/browser-model.test.mjs
```

See [explainer development notes](docs/explainer.md) for the UI checks and remaining work.

The second article, [Choosing a neighbor](http://127.0.0.1:8765/neighborhoods.html), introduces ravel, grade, indexing, Boolean selection, maximum/minimum reductions, and composition through median filtering and binary shapes.

The third article, [Counting the light](http://127.0.0.1:8765/contrast.html), teaches comparisons, Each, scan, and indexing through histogram equalization.

The fourth article, [Until nothing changes](http://127.0.0.1:8765/regions.html), teaches masks, Power, convergence, unique labels, and region areas through flood fill and connected components.
