:Class Bitmap

  :Field Public PathParts
  :Field Public FileTie
  :Field Public BMPHeader
  :Field Public DIPHeader
  :Field Public ImageTable
  :Field Public ImageData
  :Field Public ImageWidth
  :Field Public ImageHeight

  ∇ open path;offset;w;h;bytes;data;size
    :Implements Constructor
    :Access Public

    PathParts←⎕NPARTS path
    FileTie←path ⎕NTIE 0

    offset←1⊃⎕NREAD FileTie 323 1 10
    w←1⊃⎕NREAD FileTie 323 1 18
    h←1⊃⎕NREAD FileTie 323 1 22
    bytes←(1⊃⎕NREAD FileTie 163 1 28)÷8
    size←bytes×h×w

    data←⎕NREAD FileTie 83 size offset
    ImageData←data
    ImageWidth←w
    ImageHeight←h

    ImageTable←256|bytes h w⍴⍉(h×w) bytes⍴data
    ⍝ ImageTable←256|h w⍴(,/((h×w)bytes⍴data))
  ∇

  ∇ R←createGauss (X s);coeff
    :Access Private Shared

    coeff←(○2×s*2)*¯0.5
    R←coeff×*(-X*2)÷2×s*2
  ∇

  ∇ R←PX createConvolutionMatrix N;M;A
    :Access Private Shared

    M←⍴PX
    A←((N,M)⍴PX),(N,N-1)⍴0
    R←⍉(0,-⍳N-1)⌽A
  ∇

  ∇ R←gaussianBlur (PX r s);GX;PY;A;R1
    :Access Public

    GX←(⍳1+r×2)-r-1
    PY←createGauss GX s

    A←PX createConvolutionMatrix r
    R1←A+.×PY
    R←R1[(⍳(⍴R1)-2)+1]
  ∇


:Endclass
