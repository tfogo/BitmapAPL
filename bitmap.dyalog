:Class Bitmap

  :Field Public PathParts
  :Field Public FileTie
  :Field Public BMPHeader
  :Field Public DIPHeader
  :Field Public ImageTable

  ∇ open path;offset;w;h;bytes;data
    :Implements Constructor
    :Access Public

    PathParts←⎕NPARTS path
    FileTie←path ⎕NTIE 0

    offset←1⊃⎕NREAD FileTie 323 1 10
    w←1⊃⎕NREAD FileTie 323 1 18
    h←1⊃⎕NREAD FileTie 323 1 22
    bytes←(1⊃⎕NREAD FileTie 163 1 28)÷8

    data←⎕NREAD FileTie 83 ¯1 offset

    ImageTable←256|h w⍴(,/((h×w)bytes⍴data))
  ∇

  ∇ R←createGauss (x s);coeff
    :Access Private Shared

    coeff←(○2×s*2)*¯0.5
    R←1⊃1⍴coeff×*(-X*2)÷2×s*2
  ∇

  ∇ R←PX createConvolutionMatrix N;M;A
    :Access Private Shared

    M←⍴PX
    A←((N,M)⍴PX),(N,N-1)⍴0
    R←⍉(0,-⍳N-1)⌽A
  ∇


:Endclass
