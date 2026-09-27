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

The next milestone is an animated Gaussian/Sobel explainer. No frontend or new edge-detection operations are implemented yet.

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
