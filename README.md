# Bitmap APL

An APL class for manipulating bitmap images. The library can currently load bitmap images from the filesystem, apply Gaussian blurs, and write files back to the filesystem. The library uses some system functions which are specific to Dyalog APL.

Currently only works with 32-bit files.

## Installation

After cloning the repository, you can add the `Bitmap` class to your workspace using SALT:

```APL
      ⎕←⎕SE.SALT.Load '/path/to//bitmapAPL/bitmap.dyalog'
#.Bitmap
```

## Usage

You can parse a bitmap file by passing a

```APL
      bm←⎕NEW Bitmap '/path/to/bitmap/file.bmp'
```

This will create a 3D matrix `bm.ImageTable` which contains the bytes of color for the bitmap. The shape of the matrix is `(colors, height, width)`. That's a pane of pixel values for each color.

```APL
      DISPLAY bm.ImageTable
┌┌→──────────────────┐
↓↓ 70  94  98  94  70│
││101 135 141 135 101│
││ 94 126 131 126  94│
││ 87 116 121 116  87│
││ 45  60  63  60  45│
││                   │
││ 95 127 133 127  95│
││115 154 161 154 115│
││139 186 195 186 139│
││122 164 171 164 122│
││ 52  69  73  69  52│
││                   │
││ 77 104 108 104  77│
││ 53  71  75  71  53│
││ 53  71  75  71  53│
││ 77 104 108 104  77│
││ 44  59  62  59  44│
└└~──────────────────┘
      ⍴ bm.ImageTable
3 5 5
```

The library has a built in Gaussian blur:

```APL
      bm.gaussianBlur 10 0.5      ⍝ Blur radius 10, sigma 0.5
```

Finally, you can write the file using `bm.write`:

```APL
      bm.write /path/to/output/file.bmp
```
