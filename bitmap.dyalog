:Class Bitmap
    ⍝ Adapter for 40-byte BITMAPINFOHEADER, 32-bit BI_RGB, no extra blocks.
    ⍝ ImageTable is B G R X × height × width, in top-to-bottom row order.
    :Field Public PathParts
    :Field Public BMPHeader
    :Field Public DIBHeader
    :Field Public DIPHeader
    :Field Public ImageTable
    :Field Public ImageWidth
    :Field Public ImageHeight
    :Field Public ImageDataOffset
    :Field Public Bytes
    :Field Private Header
    :Field Private TopDown

    ∇ R←LE bytes
        R←256⊥⌽bytes
    ∇

    ∇ R←SignedLE bytes
        R←LE bytes
        R←R-4294967296×R≥2147483648
    ∇

    ∇ Require condition
        :If ~condition
            ⎕SIGNAL 11
        :EndIf
    ∇

    ∇ open path;tie;n;w;h;size;imageSize;data;error;⎕IO
        :Implements Constructor
        :Access Public
        ⎕IO←0
        tie←0
        :Trap 0
            tie←path ⎕NTIE 0
            n←⎕NSIZE tie
            :If n<54
                Require 0
            :EndIf
            Header←256|⎕NREAD tie 83 54 0
            :If ~66 77≡2↑Header
                Require 0
            :EndIf
            :If (54≠LE Header[10+⍳4])∨40≠LE Header[14+⍳4]
                Require 0
            :EndIf
            :If (1≠LE Header[26+⍳2])∨32≠LE Header[28+⍳2]
                Require 0
            :EndIf
            :If (0≠LE Header[30+⍳4])∨0≠LE Header[46+⍳4]
                Require 0
            :EndIf
            w←LE Header[18+⍳4]
            h←SignedLE Header[22+⍳4]
            :If (w≤0)∨(w≥2147483648)∨h=0
                Require 0
            :EndIf
            TopDown←h<0
            h←|h
            size←4×h×w
            imageSize←LE Header[34+⍳4]
            :If (n≠54+size)∨n≠LE Header[2+⍳4]
                Require 0
            :EndIf
            :If ~imageSize∊0 size
                Require 0
            :EndIf
            data←256|⎕NREAD tie 83 size 54
            ⎕NUNTIE tie
            tie←0
        :Else
            error←⎕EN
            :If tie≠0
                ⎕NUNTIE tie
            :EndIf
            ⎕SIGNAL error
        :EndTrap
        PathParts←⎕NPARTS path
        BMPHeader←14↑Header
        DIBHeader←14↓Header
        DIPHeader←DIBHeader ⍝ Historical spelling, retained for readers.
        ImageWidth←w
        ImageHeight←h
        ImageDataOffset←54
        Bytes←4
        ImageTable←4 h w⍴⍉(h×w)4⍴data
        :If ~TopDown
            ImageTable←⊖[1]ImageTable
        :EndIf
    ∇

    ∇ write path;tie;data;pixels;error;⎕IO
        :Access Public
        ⎕IO←0
        :If (ImageWidth≠LE Header[18+⍳4])∨ImageHeight≠|SignedLE Header[22+⍳4]
            ⎕SIGNAL 11
        :EndIf
        :If ~(4 ImageHeight ImageWidth)≡⍴ImageTable
            ⎕SIGNAL 11
        :EndIf
        pixels←⌊0.5+0⌈255⌊ImageTable
        :If ~TopDown
            pixels←⊖[1]pixels
        :EndIf
        data←Header,,⍉4 (ImageHeight×ImageWidth)⍴pixels
        data←data-256×data>127
        tie←0
        :Trap 0
            tie←path ⎕NCREATE 0
            data ⎕NREPLACE tie 0 83
            ⎕NUNTIE tie
            tie←0
        :Else
            error←⎕EN
            :If tie≠0
                ⎕NUNTIE tie
            :EndIf
            ⎕SIGNAL error
        :EndTrap
    ∇

    ∇ gaussianBlur parameters;options;color;⎕IO
        :Access Public
        ⎕IO←0
        ⍝ radius sigma, or radius sigma boundary. Mutates B/G/R only.
        options←parameters
        :If 2=≢options
            options←options,⊂'clamp'
        :EndIf
        color←options #.ImageOps.BlurImage ImageTable[⍳3;;]
        ImageTable[⍳3;;]←color
    ∇
:EndClass
