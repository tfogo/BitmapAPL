# Walkthrough development

The frontend is a continuous article: **Pictures as arrays**. It replaces the earlier tabbed explorer following the user's request for a simple, illustrated walkthrough and clear prose.

Start it from the repository root:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory web
```

Visit http://127.0.0.1:8765. No npm installation, build, or live APL service is required. JavaScript modules require an HTTP server rather than opening the HTML file directly.

## Article sequence

1. Reveal the numbers inside a picture.
2. Invert all its values with one expression.
3. Move numbered cells through a transpose.
4. Slide a weighted neighborhood along a row and show its arithmetic.
5. Adjust sigma and see normalized Gaussian weights change.
6. Spread an impulse across rows, then down columns.
7. Subtract neighbors to find a change; reveal Sobel edges on a larger picture.

Keep each paragraph short and concrete. Show an idea before naming it. Each figure has one focused control, placed immediately after the prose that introduces it. Code follows the visual explanation. New algorithms should become follow-up articles rather than additional controls on this page.

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
