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
:EndNamespace
