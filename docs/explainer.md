# Animated explainer development

The static frontend lives in `web/`. Start it from the repository root with:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory web
```

Visit http://127.0.0.1:8765. Opening the HTML directly as a file is not supported because the application uses JavaScript modules. No package installation, build step, network fonts, or runtime APL service is required. The server only exposes the `web/` directory and binds to loopback.

## Implemented lessons

1. Pixels, shape, reshape, and indexing.
2. Whole-array inversion, thresholding, horizontal reverse, and rectangular transpose.
3. Gaussian kernel construction, horizontal/vertical passes, Stencil, reduction, and Rank.
4. Signed Sobel gradients, kernel products, and gradient magnitude.
5. Unsharp masking: subtract the blur, then add scaled detail.

The arithmetic lessons use bounded 7×9 arrays, with a separate 112×144 test-image comparison using the same parameters. Inputs include an impulse, step edge, ramp, binary-style shape, and three separate color planes. Selecting a result pixel jumps to the result stage; selecting an intermediate pixel jumps to its stage. Arrow keys navigate within a grid, and each grid has one tab stop. Playback stops on parameter/lesson changes and when the browser tab is hidden.

Grid values are rounded for legibility; the inspector shows three decimal places and calculations retain full precision. Upcoming cells are faint. Signed values use explicit signs and a diverging color scheme. Grayscale and sharpened outputs clip only their display colors; Sobel magnitude scales its display colors to the current maximum. Boundary samples outside the grid appear in the arithmetic inspector.

## Numerical verification

```sh
python3 tests/run.py --export
node --test tests/browser-model.test.mjs
```

The Python runner generates independent fixtures and a direct 2-D oracle, runs the actual Dyalog implementation, checks BMP output bytes, and only then exports Dyalog results to `web/fixtures/apl-reference.json`. Node's built-in test runner checks browser calculations against the exported results: 72 Gaussian cases and 24 cases each covering Sobel and sharpening. It also checks rectangular transformations and threshold equality.

Regenerate and commit the fixtures when numerical code changes. The frontend does not fetch this file at runtime; it is verification data. Its JavaScript model is explicitly identified in the page. The moving-window animation illustrates mathematical dependencies rather than the interpreter's actual scheduling.

## UI verification performed

Checked in the Codex in-app browser:

- Gaussian initial render, Step, output selection, and transition into the vertical pass.
- Sobel signed-ramp arithmetic and combined magnitude.
- Rectangular transpose mapping: input `[2;4]` becomes output `[4;2]`, retaining its value.
- Color-plane selection, sharpening, Play advancing position, and Pause.
- Arrow-key cell navigation with focus retained after rendering.
- 390px phone viewport without horizontal overflow; smaller numeric type keeps signed values inside cells.
- No browser error/warning logs during these flows.

The page respects reduced-motion preferences by disabling transitions and never starts playback automatically. This behavior is implemented in CSS; reduced-motion OS settings were not changed during verification.

## Next frontend work

Continue with median filtering and morphology. Transpose moves a highlighted tile when source and destination are both visible, with linked selections as the fallback on narrow screens or under reduced motion. User-supplied images, actual APL execution, and deployment are not part of this first local preview.

The bundled APL385 font is public-domain artwork by Adrian Smith; see `web/fonts/NOTICE.md` for attribution and source links.
