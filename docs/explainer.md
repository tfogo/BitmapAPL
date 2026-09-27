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
