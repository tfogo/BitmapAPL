# Library review and development plan

This historical review describes the original `bitmap.dyalog`, before the current repairs. See [the roadmap](../ROADMAP.md) and [README](../README.md) for implemented behavior. Initial findings came from source inspection. After Dyalog was installed, a generated 4×3 BMP reproduced `VALUE ERROR` in `gaussianBlurPass` at the expression using unassigned `r` and `s`. The current replacement passes the runtime suite. Proposed APIs below are design suggestions, not existing methods.

## First: make the blur contract explicit

1. **Repair the public example and parameter flow.** `gaussianBlur MAT` receives an array and returns a result. It does not accept `radius sigma` or update `ImageTable`, as the old README implied. `gaussianBlurPass` declares local `r` and `s`, but never assigns them before use. Pass the kernel explicitly to the row operation; do not rely on calling-context variables.
2. **Keep sigma in pixel units.** The current coordinate expression scales positions by `3×s÷r`. Substituting those positions into the Gaussian exponent cancels `s`, and normalization cancels the prefactor. Even after the missing parameters are repaired, sigma would not change the normalized kernel for a fixed radius. Use integer offsets from `-r` to `r`, then compute and normalize `exp(-x²/(2s²))`. Treat radius zero as the identity and reject nonpositive sigma.
3. **Keep color and spatial axes distinct.** Use a documented `channels height width` array. Monadic `⍉` reverses *all* axes: on this representation it produces `width height channels`. The current two-pass code needs a per-plane operation or explicit spatial permutation before it can safely accept `ImageTable`. A `BlurPlane⍤2` design would apply a matrix operation independently to each channel.
4. **Name the edge rule.** The existing convolution matrix adds zeros outside the row. This darkens a constant image near the boundary. Offer a small, explicit choice such as zero, clamp, and reflect; document exactly whether reflection repeats the edge pixel.

Suggested API, to implement and test in Dyalog:

```apl
kernel ← GaussianKernel radius sigma
result ← kernel BlurPlane plane
result ← kernel BlurImage image
bm.ImageTable ← result
bm.write '/path/to/new-output.bmp'
```

Start with pure array functions and a thin file-format adapter. This makes a 5×5 fixture sufficient to debug most image operations, without opening a file.

## Second: define the BMP subset precisely

- Validate the `BM` signature, DIB size, planes, bit depth, compression, dimensions, pixel offset, and available file length before allocating the image array. Initially support one clearly defined uncompressed 32-bit subset; reject other formats deliberately.
- Normalize row orientation on read. A positive BMP height is bottom-up; a negative height is top-down. The current code treats height directly as a positive array dimension and preserves file row order.
- Explain channel order. Ordinary 32-bit `BI_RGB` data uses B, G, R and an unused high byte; that fourth byte is not automatically alpha. The constructor reshapes four bytes into four planes, despite the old README's three-plane example. Bitfield and alpha-bearing formats need separate interpretation.
- Calculate scanline stride as `4×ceil(bitsPerPixel×width÷32)` if support expands beyond 32 bits. Padding belongs to each row. The writer's appended padding expression is truncated by the following bit-vector reshape and does not implement general row padding.
- Define rounding and clipping to `[0,255]` at serialization. Keep floating point intermediate values during filtering. Validate shape against the stored dimensions before writing, or update all dependent header fields if resizing is supported.
- Preserve required header-adjacent metadata or reject variants that need it. Currently the writer copies two headers and the pixels, without a general round-trip policy for extra blocks.
- Release native-file ties on error as well as success. Decide how existing output files should be handled; `⎕NCREATE` does not provide an overwrite workflow here.
- Make transient values local rather than public fields. Rename `DIPHeader` to `DIBHeader`, with an alias if compatibility matters. Pin or localize `⎕IO`; current indexing assumes origin 1.

See Microsoft's [BITMAPINFOHEADER](https://learn.microsoft.com/en-us/windows/win32/api/wingdi/ns-wingdi-bitmapinfoheader) and [bitmap storage](https://learn.microsoft.com/en-us/windows/win32/gdi/bitmap-storage) documentation for format details.

## Third: preserve the teaching value while improving the implementation

The convolution-matrix implementation is a good explanation of `+.×`: each output is a weighted sum. Keep it as a reference implementation. For production, compare it with a window-based implementation using [Stencil](https://docs.dyalog.com/20.0/language-reference-guide/primitive-operators/stencil/), and measure time and temporary memory on actual images. Do not assume shorter APL is faster.

A Gaussian is separable: two length-k passes require roughly `2×k` contributions per pixel, versus `k×k` for a direct square kernel. Construct the kernel once per blur call and reuse it across rows, columns, and channels. Use [Rank](https://help.dyalog.com/19.0/Content/Language/Primitive%20Operators/Rank.htm) to express which cells a function handles. Remember that [monadic transpose](https://help.dyalog.com/19.0/Content/Language/Primitive%20Functions/Transpose%20Monadic.htm) reverses axis order on higher-rank arrays.

Later, specify whether filtering operates on encoded color values or linear-light values. If actual transparency is supported, decide how premultiplied color and alpha are handled to avoid colored fringes. Keep those concerns out of the initial grayscale lessons.

## Tests that earn their place

| Fixture | Property to check |
| --- | --- |
| One bright pixel | Kernel symmetry, spatial alignment, expected footprint |
| Constant plane | Constant preserved with clamp/reflect; documented darkening with zero fill |
| Unequal height and width | No accidental axis swaps |
| Distinct constant color planes | No mixing between channels |
| Radius zero | Exact identity |
| Fixed radius, different sigma | Different kernel and output |
| Tiny plane, large radius | Correct extension beyond all four edges |
| Hand-built top-down and bottom-up BMPs | Same canonical image after decoding |
| Truncated/unsupported BMP | Clear failure and no leaked file tie |
| Known byte-pattern BMP | Decode/write/decode preserves pixels and supported metadata |

Use a direct 2-D convolution as an independent oracle for the separable implementation. Compare floating point results with a tolerance, and test serialized bytes separately. Browser-demo checks do not validate Dyalog execution or the BMP codec.

## An explainer built around visible changes

Teach one concept at a time using a small inspectable image, a readable expression, and the resulting array:

1. **An image is an array:** `⍴`, `⍳`, reshape, and pixel coordinates.
2. **Functions act on whole arrays:** invert with `255-image`; threshold with `255×image≥128`.
3. **Axes have meaning:** reverse `⌽` and transpose `⍉` on a plane; then add color planes.
4. **Neighborhoods become weighted sums:** inspect a window and calculate `+/weights×pixels`, then relate it to `+.×`.
5. **Build a Gaussian:** integer offsets, elementwise exponentiation, normalization with `+/`, separate radius and sigma controls.
6. **Compose two passes:** display original, horizontal pass, and final result; show why rank matters for color.
7. **Change the question:** compare boundary rules, then extend the same machinery to edge detection or sharpening.

Use a browser implementation for immediate interaction, with a visible statement that it illustrates APL expressions rather than executing the library. An actual Dyalog-backed evaluator can come later, after the array API and tests are stable.
