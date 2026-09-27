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
:EndNamespace
