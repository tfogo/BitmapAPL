# Canny and seam carving

Load `src/ImageOps.dyalog` as in the README. All operations use nonempty, real numeric matrices; image samples remain floating point until a display or BMP conversion. No RGB channel mixing is implicit.

## Canny

```apl
r ← (2 1 35 100) ImageOps.Canny plane
r.smoothed
r.gx ⋄ r.gy ⋄ r.magnitude
r.direction ⋄ r.thin
r.weak ⋄ r.strong ⋄ r.edges
```

Arguments are radius, sigma, low threshold, and high threshold. Radius/sigma follow the Gaussian contract. Thresholds use unnormalized Sobel magnitude units and must satisfy `0 < low ≤ high`. Output matrices keep the input dimensions; `edges`, `weak`, and `strong` are binary. `weak` includes strong candidates.

The Gaussian and Sobel use clamped borders. Direction is quantized to 0, 45, 90, or 135 degrees in image coordinates (rows increase downward), modulo 180 degrees. Bins are selected using the tangent of 22.5 degrees. Magnitudes at or below 1e-10 have direction zero. Non-maximum suppression discards the outermost border; it compares the two neighboring samples along the quantized direction, keeping a sample when `m ≥ before−1e-10` and `m > after+1e-10`. This asymmetric tie rule chooses one side of a plateau. It is a defined approximation, not interpolated Canny.

`(low high) ImageOps.Hysteresis thin` exposes thresholding and linking. It seeds every strong pixel, then repeats eight-neighbor dilation constrained to the candidate mask. Weak components without a strong seed disappear. With fixed gradients, increasing either threshold cannot add edges. The full pipeline can change differently when sigma changes.

The implementation follows the stages described in [OpenCV's Canny overview](https://docs.opencv.org/4.x/da/d22/tutorial_py_canny.html); exact borders, ties, magnitude convention, and thresholds differ across implementations. Tests compare against an independently written reference with the conventions above, not default OpenCV output. Thirty synthetic/noisy pipelines exercise lines, steps, diagonal edges, junctions, impulses, tiny images, and constants; five separate linking cases use a BFS oracle.

Smoothing costs O(Nr), gradient/thinning O(N), and repeated linking O(ND), where D is the number of propagation rounds. The APL implementation stores working arrays, not full histories. The browser only retains linking traces when explicitly requested for a small teaching example.

## Seam carving

```apl
energy ← ImageOps.Energy plane
path ← ImageOps.MinimumSeam energy
path.cost ⋄ path.parents ⋄ path.seam ⋄ path.total
narrower ← path.seam ImageOps.RemoveSeam plane
result ← (4 'vertical') ImageOps.Carve plane
result.output ⋄ result.seams
shorter ← (2 'horizontal') ImageOps.Carve plane
```

`Energy` is clamped Sobel L2 magnitude. This is a backward-energy seam-carving variant: it measures current gradients, not the new discontinuities that removal will introduce. `MinimumSeam` accepts nonnegative energy and finds one pixel per row with column steps at most one. It returns a cumulative-cost matrix, predecessor columns (−1 on the first row), a zero-based column per row, and total cost. Costs at an edge use only existing predecessors. Ties choose the smallest predecessor column, then the smallest final-row endpoint. IDs and coordinates are independent of the caller's index origin.

`RemoveSeam` checks length, bounds, integrality, adjacency, and that at least one column remains. `Carve` repeats energy calculation, path selection, and removal. Count zero is the identity; count must be a nonnegative integer smaller than the affected dimension. Horizontal carving transposes the image, reuses vertical carving, then transposes back. Returned horizontal paths specify one row per column in the image dimensions at that removal step. All seam coordinates are relative to that step, not the original image.

Thirty tiny cost tables are compared with exhaustive path enumeration, including ties and singleton dimensions. Eighteen multi-removal cases compare both orientations with independently recomputed energies and exhaustive choices. Carving cost is O(kHW) for k removals (dimensions shrink as it runs); working memory is O(HW), plus the returned O(kH) vertical path list. The browser demonstrations cap image dimensions and removal counts.

Seam carving does not know which objects matter. It can bend lines, damage repeated patterns, or remove meaningful low-contrast details. Dense scenes may have no unobtrusive seam. The original method is described by Avidan and Shamir in [Seam Carving for Content-Aware Image Resizing](https://cs.brown.edu/courses/cs016/static/files/docs/seamcarving_original_paper.pdf).

## Run the checks

```sh
python3 tests/run.py --export
python3 tests/advanced.py --export
node --test tests/*test.mjs
```

Advanced exports are stored separately in `web/fixtures/advanced-reference.json`; they contain actual Dyalog results after the Python oracle checks pass. These are source fixtures, not required browser downloads.
