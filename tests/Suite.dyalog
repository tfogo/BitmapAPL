:Namespace Suite
    Assert←{⍵:1 ⋄ ⎕←'FAIL: ',⍺ ⋄ ⎕SIGNAL 11}
    Close←{1E¯9>⌈/,|⍺-⍵}

    ∇ R←Fails expression
        R←0
        :Trap 0
            ⍎expression
        :Else
            R←1
        :EndTrap
    ∇

    ∇ Run folder;spec;case;plane;actual;kernel;mode;row;expected;bm;other;before;name;path;image;result;⎕IO
        ⎕IO←0
        spec←⎕JSON⊃⎕NGET (folder,'/oracle.json') 0
        :For case :In spec.cases
            plane←case.shape⍴case.pixels
            actual←(case.radius case.sigma case.mode) #.ImageOps.BlurPlane plane
            {}'shape preserved' Assert case.shape≡⍴actual
            {}'direct 2-D oracle' Assert case.expected Close ,actual
        :EndFor
        kernel←#.ImageOps.GaussianKernel 4 2
        {}'kernel sums to one' Assert 1 Close +/kernel
        {}'symmetric kernel' Assert kernel Close ⌽kernel
        {}'sigma changes weights' Assert ~kernel Close #.ImageOps.GaussianKernel 4 1
        {}'zero radius kernel' Assert (,1)≡#.ImageOps.GaussianKernel 0 1
        :For mode :In 'zero' 'clamp' 'reflect'
            row←3 ¯7 100 20
            expected←(kernel mode) #.ImageOps.MatrixFilterRow row
            {}'matrix/Stencil agreement' Assert expected Close (kernel mode) #.ImageOps.FilterRow row
        :EndFor
        {}'reflection repeats endpoints' Assert 30 20 10 10 20 30 30 20 10≡(3 'reflect') #.ImageOps.PadRow 10 20 30
        {}'negative radius rejected' Assert Fails '#.ImageOps.GaussianKernel ¯1 1'
        {}'fractional radius rejected' Assert Fails '#.ImageOps.GaussianKernel 1.5 1'
        {}'nonpositive sigma rejected' Assert Fails '#.ImageOps.GaussianKernel 1 0'
        {}'invalid boundary rejected' Assert Fails '(1 1 ''invalid'') #.ImageOps.BlurPlane 2 2⍴1'
        {}'empty plane rejected' Assert Fails '(1 1 ''clamp'') #.ImageOps.BlurPlane 0 2⍴0'
        image←3 2 4⍴(8⍴10),(8⍴80),8⍴200
        result←(3 1 'reflect') #.ImageOps.BlurImage image
        {}'no channel mixing' Assert image Close result
        ⎕IO←1
        {}'caller origin independent' Assert image Close (3 1 'reflect') #.ImageOps.BlurImage image
        ⎕IO←0
        before←⎕NNUMS
        :For name :In spec.invalid
            path←folder,'/',name,'.bmp'
            {}'invalid BMP rejected' Assert Fails 'other←⎕NEW #.Bitmap path'
            {}'no leaked ties after rejected BMP' Assert before≡⎕NNUMS
        :EndFor
        expected←4 3 4⍴⍉12 4⍴spec.pixels
        :For name :In 'top' 'bottom'
            bm←⎕NEW #.Bitmap (folder,'/',name,'.bmp')
            {}'canonical top-down BGRX' Assert expected≡bm.ImageTable
            bm.write folder,'/',name,'-roundtrip.bmp'
            bm.gaussianBlur 0 1
            {}'adapter radius zero identity' Assert expected≡bm.ImageTable
        :EndFor
        path←folder,'/bottom-roundtrip.bmp'
        {}'existing output rejected' Assert Fails 'bm.write path'
        {}'no leaked ties after failed write' Assert before≡⎕NNUMS
        bm←⎕NEW #.Bitmap (folder,'/bottom.bmp')
        bm.gaussianBlur 2 1 'reflect'
        {}'fourth byte preserved' Assert expected[3;;]≡bm.ImageTable[3;;]
        bm.write folder,'/blurred.bmp'
        bm←⎕NEW #.Bitmap (folder,'/bottom.bmp')
        bm.ImageTable[;0;0]←¯10 0.6 255.9 300
        bm.write folder,'/clipped.bmp'
        bm.ImageTable←2 2⍴0
        {}'shape mismatch rejected' Assert Fails 'bm.write folder,''/badshape.bmp'''
        bm.ImageWidth←2
        bm.ImageHeight←2
        bm.ImageTable←4 2 2⍴0
        {}'header dimension mismatch rejected' Assert Fails 'bm.write folder,''/badheader.bmp'''
        {}'no leaked ties' Assert before≡⎕NNUMS
        ⎕←'PASS: ',(⍕≢spec.cases),' oracle cases; kernels, boundaries, channels, BMP validation and resource cleanup'
    ∇
:EndNamespace
