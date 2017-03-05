﻿:Class Bitmap

    :Field Public PathParts
    :Field Public FileTie
    :Field Public BMPHeader
    :Field Public DIPHeader
    :Field Public ImageTable
    :Field Public ImageData
    :Field Public ImageWidth
    :Field Public ImageHeight
    :Field Public ImageDataOffset
    :Field Public Bytes

    ∇ open path;offset;w;h;bytes;data;size;DIPHeaderSize
        :Implements Constructor
        :Access Public

        PathParts←⎕NPARTS path
        FileTie←path ⎕NTIE 0

        BMPHeader←⎕NREAD FileTie 83 14 0

        DIPHeaderSize←1⊃⎕NREAD FileTie 323 1 14

        DIPHeader←⎕NREAD FileTie 83 DIPHeaderSize 14

        offset←1⊃⎕NREAD FileTie 323 1 10
        w←1⊃⎕NREAD FileTie 323 1 18
        h←1⊃⎕NREAD FileTie 323 1 22
        bytes←(1⊃⎕NREAD FileTie 163 1 28)÷8
        size←bytes×h×w

        data←⎕NREAD FileTie 83 size offset
        ImageData←data
        ImageWidth←w
        ImageHeight←h
        ImageDataOffset←offset
        Bytes←bytes

        ImageTable←256|bytes h w⍴⍉(h×w) bytes⍴data

        ⎕NUNTIE FileTie
    ∇

    ∇ write path;tie;data;dataLength;binaryData
        :Access Public

        dataLength←ImageWidth×ImageHeight×Bytes
        data←(dataLength⍴⍉(Bytes (ImageWidth×ImageHeight)⍴ImageTable)),(Bytes|dataLength+ImageDataOffset)⍴0

        binaryData←(8×dataLength)⍴⍉(8⍴2)⊤data

        tie←path ⎕NCREATE 0
        BMPHeader ⎕NREPLACE tie 0 83
        DIPHeader ⎕NREPLACE tie 14 83
        binaryData ⎕NREPLACE tie ImageDataOffset 11

        ⎕NUNTIE tie
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
