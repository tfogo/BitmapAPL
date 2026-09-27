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
            case.apl←,actual
            {}'shape preserved' Assert case.shape≡⍴actual
            {}'direct 2-D oracle' Assert case.expected Close ,actual
        :EndFor
        :For case :In spec.edges
            plane←case.shape⍴case.pixels
            result←case.mode #.ImageOps.Sobel plane
            {}'Sobel horizontal oracle' Assert case.gx Close ,result.gx
            {}'Sobel vertical oracle' Assert case.gy Close ,result.gy
            {}'Sobel magnitude oracle' Assert case.magnitude Close ,result.magnitude
            case.aplGx←,result.gx
            case.aplGy←,result.gy
            case.aplMagnitude←,result.magnitude
            actual←(2 1 1.5 case.mode) #.ImageOps.Unsharp plane
            {}'unsharp oracle' Assert case.unsharp Close ,actual
            case.aplUnsharp←,actual
            {}'sharpen amount zero' Assert plane Close (2 1 0 case.mode) #.ImageOps.Unsharp plane
            actual←((1 5⍴2 ¯1 3 0 ¯2) case.mode) #.ImageOps.Correlate plane
            {}'asymmetric rectangular correlation' Assert case.correlation Close ,actual
        :EndFor
        {}'even kernel rejected' Assert Fails '((2 2⍴1) ''clamp'') #.ImageOps.Correlate 3 3⍴1'
        {}'negative sharpening rejected' Assert Fails '(1 1 ¯1 ''clamp'') #.ImageOps.Unsharp 3 3⍴1'
        plane←5 5⍴⍳25
        result←'clamp' #.ImageOps.Sobel plane
        {}'ramp x sign and scale' Assert 8=result.gx[2;2]
        {}'ramp y sign and scale' Assert 40=result.gy[2;2]
        :For case :In spec.medians
            plane←case.shape⍴case.pixels
            actual←(case.radius case.mode) #.ImageOps.Median plane
            {}'median shape' Assert case.shape≡⍴actual
            {}'median sorted-window oracle' Assert case.expected Close ,actual
            case.apl←,actual
        :EndFor
        :For case :In spec.morphs
            plane←case.shape⍴case.pixels
            actual←(case.operation case.footprint) #.ImageOps.Morphology plane
            {}'morphology shape' Assert case.shape≡⍴actual
            {}'morphology oracle' Assert case.expected Close ,actual
            case.apl←,actual
            :If (⊂case.operation)∊'open' 'close'
                {}'opening/closing idempotence' Assert actual Close (case.operation case.footprint) #.ImageOps.Morphology actual
            :EndIf
            :If (⊂case.operation)∊'erode' 'open'
                {}'anti-extensive' Assert ∧/,actual≤plane
            :Else
                {}'extensive' Assert ∧/,actual≥plane
            :EndIf
        :EndFor
        {}'median negative radius rejected' Assert Fails '(¯1 ''clamp'') #.ImageOps.Median 2 2⍴1'
        {}'median fractional radius rejected' Assert Fails '(0.5 ''clamp'') #.ImageOps.Median 2 2⍴1'
        {}'median empty plane rejected' Assert Fails '(1 ''clamp'') #.ImageOps.Median 0 2⍴1'
        {}'median invalid boundary rejected' Assert Fails '(0 ''other'') #.ImageOps.Median 2 2⍴1'
        {}'nonbinary morphology rejected' Assert Fails '(''dilate'' ''square'') #.ImageOps.Morphology 2 2⍴2'
        {}'invalid footprint rejected' Assert Fails '(''dilate'' ''other'') #.ImageOps.Morphology 2 2⍴1'
        {}'invalid morphology rejected' Assert Fails '(''other'' ''square'') #.ImageOps.Morphology 2 2⍴1'
        ⎕IO←1
        {}'median independent of caller origin' Assert (2 2⍴1)≡(1 'clamp') #.ImageOps.Median 2 2⍴1
        {}'morphology independent of caller origin' Assert (2 2⍴1)≡('erode' 'cross') #.ImageOps.Morphology 2 2⍴1
        ⎕IO←0
        ⎕←'PASS: ',(⍕≢spec.medians),' median and ',(⍕≢spec.morphs),' morphology oracle cases; idempotence and validation'
        :For case :In spec.equalizations
            plane←case.shape⍴case.pixels
            result←#.ImageOps.Equalize plane
            {}'histogram counts oracle' Assert case.histogram≡result.histogram
            {}'cumulative counts oracle' Assert case.cumulative≡result.cumulative
            {}'mapping oracle' Assert case.mapping≡result.mapping
            {}'equalized output oracle' Assert case.output≡,result.output
            {}'equalized shape' Assert case.shape≡⍴result.output
            {}'pixel count conserved' Assert (×/case.shape)=+/result.histogram
            {}'mapping monotone' Assert ∧/(1↓result.mapping)≥¯1↓result.mapping
            case.aplHistogram←result.histogram
            case.aplCumulative←result.cumulative
            case.aplMapping←result.mapping
            case.aplOutput←,result.output
        :EndFor
        {}'equalization rejects fractions' Assert Fails '#.ImageOps.Equalize 2 2⍴0.5'
        {}'equalization rejects negative values' Assert Fails '#.ImageOps.Equalize 2 2⍴¯1'
        {}'equalization rejects values above 255' Assert Fails '#.ImageOps.Equalize 2 2⍴256'
        {}'equalization rejects empty matrices' Assert Fails '#.ImageOps.Equalize 0 2⍴0'
        {}'equalization rejects vectors' Assert Fails '#.ImageOps.Equalize 1 2 3'
        ⎕IO←1
        result←#.ImageOps.Equalize 2 3⍴73
        {}'constant equalization and caller origin' Assert (2 3⍴73)≡result.output
        ⎕IO←0
        ⎕←'PASS: ',(⍕≢spec.equalizations),' equalization cases; counts, mapping, constants and validation'
        {}(⎕JSON spec) ⎕NPUT (folder,'/verified.json') 1
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
        ⎕←'PASS: 24 Sobel/sharpening cases and asymmetric correlation, signed ramps, invalid arguments'
        ⎕←'PASS: ',(⍕≢spec.cases),' oracle cases; kernels, boundaries, channels, BMP validation and resource cleanup'
    ∇
:EndNamespace
