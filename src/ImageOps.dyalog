:Namespace ImageOps
    ⍝ Pure array operations. Numeric arrays; no file access or byte rounding.

    ∇ R←GaussianKernel parameters;r;s;x;⎕IO
        ⎕IO←0
        :If (1≠≢⍴parameters)∨2≠≢parameters
            ⎕SIGNAL 11
        :EndIf
        r s←parameters
        :If (r<0)∨(r≠⌊r)∨s≤0
            ⎕SIGNAL 11
        :EndIf
        x←(⍳1+2×r)-r
        R←*¯0.5×(x÷s)*2
        R←R÷+/R
    ∇

    ∇ R←options PadRow row;radius;mode;n;indices;valid;⎕IO
        radius mode←options
        ⎕IO←0
        n←≢row
        :If n=0
            ⎕SIGNAL 11
        :EndIf
        indices←(⍳n+2×radius)-radius
        :Select mode
        :Case 'zero'
            valid←(indices≥0)∧indices<n
            R←valid×row[0⌈(n-1)⌊indices]
        :Case 'clamp'
            R←row[0⌈(n-1)⌊indices]
        :Case 'reflect'
            ⍝ Symmetric extension repeats the edge: ... b a | a b c | c b ...
            indices←(2×n)|indices
            R←row[indices⌊(2×n)-1+indices]
        :Else
            ⎕SIGNAL 11
        :EndSelect
    ∇

    ∇ R←options FilterRow row;kernel;mode;radius;padded;weighted;⎕IO
        kernel mode←options
        ⎕IO←0
        radius←(¯1+≢kernel)÷2
        padded←(radius mode) PadRow row
        weighted←{+/kernel×⍵}⌺(≢kernel)⊢padded
        R←(≢row)↑radius↓weighted
    ∇

    ∇ R←options BlurPlane plane;r;s;mode;kernel;Row
        :If (2≠≢⍴plane)∨0∊⍴plane
            ⎕SIGNAL 11
        :EndIf
        r s mode←options
        kernel←GaussianKernel r s
        Row←{(kernel mode) FilterRow ⍵}
        R←Row⍤1⊢plane
        R←⍉Row⍤1⊢⍉R
    ∇

    ∇ R←options BlurImage image
        :If (3≠≢⍴image)∨0∊⍴image
            ⎕SIGNAL 11
        :EndIf
        R←{options BlurPlane ⍵}⍤2⊢image
    ∇

    ∇ R←options MatrixFilterRow row;kernel;mode;radius;padded;indices;⎕IO
        kernel mode←options
        ⍝ Teaching reference: materialize windows, then multiply by the kernel.
        ⎕IO←0
        radius←(¯1+≢kernel)÷2
        padded←(radius mode) PadRow row
        indices←(⍳≢row)∘.+⍳≢kernel
        R←padded[indices]+.×kernel
    ∇
    ∇ R←options Correlate plane;kernel;mode;kh;kw;rh;rw;h;w;padded;⎕IO
        ⍝ Apply an odd rectangular kernel as written; do not reverse its axes.
        ⎕IO←0
        kernel mode←options
        :If (2≠≢⍴plane)∨0∊⍴plane
            ⎕SIGNAL 11
        :EndIf
        :If (2≠≢⍴kernel)∨~∧/1=2|⍴kernel
            ⎕SIGNAL 11
        :EndIf
        kh kw←⍴kernel
        rh rw←(¯1+⍴kernel)÷2
        h w←⍴plane
        padded←{(rw mode) PadRow ⍵}⍤1⊢plane
        padded←⍉{(rh mode) PadRow ⍵}⍤1⊢⍉padded
        R←{+/,kernel×⍵}⌺(kh kw)⊢padded
        R←R[rh+⍳h;rw+⍳w]
    ∇

    ∇ R←mode Sobel plane;kx
        kx←3 3⍴¯1 0 1 ¯2 0 2 ¯1 0 1
        R←⎕NS ''
        R.gx←(kx mode) Correlate plane
        R.gy←((⍉kx) mode) Correlate plane
        R.magnitude←((R.gx*2)+R.gy*2)*0.5
    ∇

    ∇ R←options Unsharp plane;r;s;amount;mode;blurred
        r s amount mode←options
        :If (0≠≢⍴amount)∨amount<0
            ⎕SIGNAL 11
        :EndIf
        blurred←(r s mode) BlurPlane plane
        R←plane+amount×plane-blurred
    ∇
    ∇ R←options Median plane;radius;mode;padded;h;w;side;Middle;⎕IO
        ⍝ Full odd square neighborhood. Preserve signed/fractional values.
        ⎕IO←0
        radius mode←options
        :If (0≠≢⍴radius)∨(radius<0)∨radius≠⌊radius
            ⎕SIGNAL 11
        :EndIf
        :If (2≠≢⍴plane)∨0∊⍴plane
            ⎕SIGNAL 11
        :EndIf
        h w←⍴plane
        side←1+2×radius
        padded←{(radius mode) PadRow ⍵}⍤1⊢plane
        padded←⍉{(radius mode) PadRow ⍵}⍤1⊢⍉padded
        Middle←{v←,⍵ ⋄ sorted←v[⍋v] ⋄ sorted[⌊(≢v)÷2]}
        R←Middle⌺(side side)⊢padded
        R←R[radius+⍳h;radius+⍳w]
    ∇

    ∇ R←options Morphology plane;operation;footprint;mask;h;w;padded;values;⎕IO
        ⍝ Binary 3×3 square/cross. Neutral exterior: 0 for dilation, 1 for erosion.
        ⎕IO←0
        operation footprint←options
        :If (2≠≢⍴plane)∨0∊⍴plane
            ⎕SIGNAL 11
        :EndIf
        :If ~∧/,plane∊0 1
            ⎕SIGNAL 11
        :EndIf
        :Select footprint
        :Case 'square'
            mask←9⍴1
        :Case 'cross'
            mask←0 1 0 1 1 1 0 1 0
        :Else
            ⎕SIGNAL 11
        :EndSelect
        :Select operation
        :Case 'open'
            R←('dilate' footprint) Morphology ('erode' footprint) Morphology plane
        :Case 'close'
            R←('erode' footprint) Morphology ('dilate' footprint) Morphology plane
        :CaseList 'dilate' 'erode'
            h w←⍴plane
            values←plane
            :If operation≡'erode'
                values←1-plane
            :EndIf
            padded←{(1 'zero') PadRow ⍵}⍤1⊢values
            padded←⍉{(1 'zero') PadRow ⍵}⍤1⊢⍉padded
            R←{⌈/mask/,⍵}⌺3 3⊢padded
            R←R[1+⍳h;1+⍳w]
            :If operation≡'erode'
                R←1-R
            :EndIf
        :Else
            ⎕SIGNAL 11
        :EndSelect
    ∇
    ∇ R←Equalize plane;values;first;total;⎕IO
        ⍝ Grayscale byte levels only. CDF-min normalization; constants unchanged.
        ⎕IO←0
        :If (2≠≢⍴plane)∨0∊⍴plane
            ⎕SIGNAL 11
        :EndIf
        values←,plane
        :If ~∧/(values≥0)∧(values≤255)∧values=⌊values
            ⎕SIGNAL 11
        :EndIf
        R←⎕NS ''
        R.histogram←{+/values=⍵}¨⍳256
        R.cumulative←+\R.histogram
        first←⊃R.cumulative/⍨0<R.cumulative
        total←≢values
        R.mapping←⍳256
        :If first≠total
            R.mapping←⌊0.5+255×(0⌈R.cumulative-first)÷total-first
        :EndIf
        R.output←(⍴plane)⍴R.mapping[values]
    ∇
    ∇ R←CheckMask mask
        :If (2≠≢⍴mask)∨0∊⍴mask
            ⎕SIGNAL 11
        :EndIf
        :If ~∧/,mask∊0 1
            ⎕SIGNAL 11
        :EndIf
        R←1
    ∇

    ∇ R←ConnectivityFootprint connectivity
        :If 0≠≢⍴connectivity
            ⎕SIGNAL 11
        :EndIf
        :Select connectivity
        :Case 4
            R←'cross'
        :Case 8
            R←'square'
        :Else
            ⎕SIGNAL 11
        :EndSelect
    ∇

    ∇ R←options FloodFill mask;connectivity;seed;footprint;start;Grow;⎕IO
        ⍝ Seed is a zero-based (row column), independent of caller index origin.
        ⎕IO←0
        {}CheckMask mask
        connectivity seed←options
        footprint←ConnectivityFootprint connectivity
        :If (1≠≢⍴seed)∨2≠≢seed
            ⎕SIGNAL 11
        :EndIf
        :If ~∧/(seed≥0)∧(seed<⍴mask)∧seed=⌊seed
            ⎕SIGNAL 11
        :EndIf
        start←(⍴mask)⍴0
        start[⊂seed]←mask[⊂seed]
        Grow←{mask∧('dilate' footprint) Morphology ⍵}
        R←(Grow⍣≡) start
    ∇

    ∇ R←connectivity LabelStep labels;footprint;selection;h;w;padded;sentinel;⎕IO
        ⍝ One synchronous propagation step. Zero is background; IDs are 1..H×W.
        ⎕IO←0
        footprint←ConnectivityFootprint connectivity
        h w←⍴labels
        selection←9⍴1
        :If footprint≡'cross'
            selection←0 1 0 1 1 1 0 1 0
        :EndIf
        sentinel←1+h×w
        padded←{(1 'zero') PadRow ⍵}⍤1⊢labels
        padded←⍉{(1 'zero') PadRow ⍵}⍤1⊢⍉padded
        R←{v←selection/,⍵ ⋄ ⌊/v+sentinel×v=0}⌺3 3⊢padded
        R←(labels>0)×R[1+⍳h;1+⍳w]
    ∇

    ∇ R←connectivity Components mask;initial;Spread;flat;⎕IO
        ⎕IO←0
        {}CheckMask mask
        {}ConnectivityFootprint connectivity
        initial←mask×(⍴mask)⍴1+⍳≢,mask
        Spread←{connectivity LabelStep ⍵}
        R←⎕NS ''
        R.labels←(Spread⍣≡) initial
        flat←,R.labels
        R.ids←∪flat/⍨flat>0
        R.ids←R.ids[⍋R.ids]
        R.areas←{+/flat=⍵}¨R.ids
        R.count←≢R.ids
    ∇
    ∇ R←NonMax gradients;gx;gy;m;h;w;y;x;d;dy;dx;before;after;⎕IO
        ⍝ Four direction bins. Discard outer border; break plateaus toward forward side.
        ⎕IO←0
        gx←gradients.gx ⋄ gy←gradients.gy ⋄ m←gradients.magnitude
        h w←⍴m
        R←⎕NS ''
        R.direction←(⍴m)⍴0
        R.thin←(⍴m)⍴0
        :For y :In ⍳h
            :For x :In ⍳w
                d←0
                :If (|gy[y;x])>0.4142135623730951×|gx[y;x]
                    d←2
                    :If (|gx[y;x])>0.4142135623730951×|gy[y;x]
                        d←1+2×(gx[y;x]×gy[y;x])<0
                    :EndIf
                :EndIf
                :If m[y;x]≤1E¯10
                    d←0
                :EndIf
                R.direction[y;x]←45×d
                :If (y>0)∧(x>0)∧(y<h-1)∧x<w-1
                    dy dx←⊃(0 1)(1 1)(1 0)(1 ¯1)[d]
                    before←m[y-dy;x-dx] ⋄ after←m[y+dy;x+dx]
                    :If (m[y;x]≥before-1E¯10)∧m[y;x]>after+1E¯10
                        R.thin[y;x]←m[y;x]
                    :EndIf
                :EndIf
            :EndFor
        :EndFor
    ∇

    ∇ R←thresholds Hysteresis thin;low;high;Grow
        low high←thresholds
        :If (low≤0)∨high<low
            ⎕SIGNAL 11
        :EndIf
        :If (2≠≢⍴thin)∨0∊⍴thin
            ⎕SIGNAL 11
        :EndIf
        R←⎕NS ''
        R.weak←thin≥low
        R.strong←thin≥high
        Grow←{R.weak∧('dilate' 'square') Morphology ⍵}
        R.edges←(Grow⍣≡) R.strong
    ∇

    ∇ R←options Canny plane;radius;sigma;low;high;gradients;suppressed;linked
        radius sigma low high←options
        R←⎕NS ''
        R.smoothed←(radius sigma 'clamp') BlurPlane plane
        gradients←'clamp' Sobel R.smoothed
        R.gx←gradients.gx ⋄ R.gy←gradients.gy ⋄ R.magnitude←gradients.magnitude
        suppressed←NonMax gradients
        R.direction←suppressed.direction ⋄ R.thin←suppressed.thin
        linked←(low high) Hysteresis R.thin
        R.weak←linked.weak ⋄ R.strong←linked.strong ⋄ R.edges←linked.edges
    ∇

    ∇ R←Energy plane;gradients
        gradients←'clamp' Sobel plane
        R←gradients.magnitude
    ∇

    ∇ R←MinimumSeam energy;h;w;y;x;candidates;costs;parent;last;⎕IO
        ⍝ Backward energy; ties choose smallest predecessor column, then endpoint.
        ⎕IO←0
        :If (2≠≢⍴energy)∨0∊⍴energy
            ⎕SIGNAL 11
        :EndIf
        :If ∨/,energy<0
            ⎕SIGNAL 11
        :EndIf
        h w←⍴energy
        R←⎕NS ''
        R.cost←energy
        R.parents←(h w)⍴¯1
        :For y :In 1+⍳h-1
            :For x :In ⍳w
                candidates←x+¯1 0 1
                candidates←candidates/⍨(candidates≥0)∧candidates<w
                costs←R.cost[y-1;candidates]
                parent←candidates[⊃⍋costs]
                R.parents[y;x]←parent
                R.cost[y;x]←energy[y;x]+R.cost[y-1;parent]
            :EndFor
        :EndFor
        last←⊃⍋R.cost[h-1;]
        R.total←R.cost[h-1;last]
        R.seam←h⍴0 ⋄ R.seam[h-1]←last
        :For y :In ⌽1+⍳h-1
            R.seam[y-1]←R.parents[y;R.seam[y]]
        :EndFor
    ∇

    ∇ R←seam RemoveSeam plane;h;w;keep;⎕IO
        ⎕IO←0
        :If (2≠≢⍴plane)∨0∊⍴plane
            ⎕SIGNAL 11
        :EndIf
        h w←⍴plane
        :If (w≤1)∨(1≠≢⍴seam)∨h≠≢seam
            ⎕SIGNAL 11
        :EndIf
        :If ~∧/(seam≥0)∧(seam<w)∧seam=⌊seam
            ⎕SIGNAL 11
        :EndIf
        :If ∨/1<|(1↓seam)-¯1↓seam
            ⎕SIGNAL 11
        :EndIf
        keep←⍉(⍳w)∘.≠seam
        R←(h(w-1))⍴(,keep)/,plane
    ∇

    ∇ R←options Carve plane;count;axis;work;i;chosen;⎕IO
        ⎕IO←0
        count axis←options
        :If (0≠≢⍴count)∨(count<0)∨count≠⌊count
            ⎕SIGNAL 11
        :EndIf
        :If (2≠≢⍴plane)∨0∊⍴plane
            ⎕SIGNAL 11
        :EndIf
        :If ~((⊂axis)∊'vertical' 'horizontal')
            ⎕SIGNAL 11
        :EndIf
        work←plane
        :If axis≡'horizontal'
            work←⍉work
        :EndIf
        :If count≥1⊃⍴work
            ⎕SIGNAL 11
        :EndIf
        R←⎕NS '' ⋄ R.seams←⍬
        :For i :In ⍳count
            chosen←MinimumSeam Energy work
            R.seams,←⊂chosen.seam
            work←chosen.seam RemoveSeam work
        :EndFor
        :If axis≡'horizontal'
            work←⍉work
        :EndIf
        R.output←work
    ∇
:EndNamespace
