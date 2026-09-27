:Namespace Advanced
    ∇ Run folder;spec;case;plane;r;field;a;b;low;high;seam;⎕IO
        ⎕IO←0
        spec←⎕JSON⊃⎕NGET (folder,'/oracle.json') 0
        :For case :In spec.cannys
            plane←case.shape⍴case.pixels
            r←(case.radius case.sigma case.low case.high) #.ImageOps.Canny plane
            :For field :In 'smoothed' 'gx' 'gy' 'magnitude' 'thin'
                a←case⍎field ⋄ b←,r⍎field
                {}field #.Suite.Assert a #.Suite.Close b
            :EndFor
            :For field :In 'direction' 'weak' 'strong' 'edges'
                a←case⍎field ⋄ b←,r⍎field
                :If ~a≡b
                    ⎕←field case.radius case.sigma case.shape
                    ⎕←(a≠b)/a ⋄ ⎕←(a≠b)/b
                :EndIf
                {}field #.Suite.Assert a≡b
            :EndFor
            case.apl←r
            r.smoothed←,r.smoothed ⋄ r.gx←,r.gx ⋄ r.gy←,r.gy ⋄ r.magnitude←,r.magnitude
            r.thin←,r.thin ⋄ r.direction←,r.direction ⋄ r.weak←,r.weak ⋄ r.strong←,r.strong ⋄ r.edges←,r.edges
        :EndFor
        :For case :In spec.links
            plane←case.shape⍴case.pixels
            r←(case.low case.high) #.ImageOps.Hysteresis plane
            {}'BFS hysteresis' #.Suite.Assert case.edges≡,r.edges
            {}'strong seeds retained' #.Suite.Assert ∧/,r.edges≥r.strong
            {}'edges within weak mask' #.Suite.Assert ∧/,r.edges≤r.weak
            a←((case.low+1)(case.high+1)) #.ImageOps.Hysteresis plane
            {}'higher thresholds cannot add edges' #.Suite.Assert ∧/,a.edges≤r.edges
            case.apl←,r.edges
        :EndFor
        :For case :In spec.seams
            plane←case.shape⍴case.pixels
            r←#.ImageOps.MinimumSeam plane
            {}'exhaustive seam' #.Suite.Assert case.seam≡r.seam
            {}'exhaustive path cost' #.Suite.Assert case.total #.Suite.Close r.total
            {}'exhaustive cumulative table' #.Suite.Assert case.cost≡,r.cost
            {}'exhaustive predecessors' #.Suite.Assert case.parents≡,r.parents
            case.aplSeam←r.seam ⋄ case.aplCost←,r.cost ⋄ case.aplParents←,r.parents ⋄ case.aplTotal←r.total
            :If 1<1⊃case.shape
                a←r.seam #.ImageOps.RemoveSeam plane
                {}'one pixel per row removed' #.Suite.Assert (case.shape-0 1)≡⍴a
            :EndIf
        :EndFor
        :For case :In spec.carvings
            plane←case.shape⍴case.pixels
            r←(case.count case.axis) #.ImageOps.Carve plane
            {}'recomputed carving output' #.Suite.Assert case.output≡,r.output
            {}'carving dimensions' #.Suite.Assert case.outputShape≡⍴r.output
            {}'deterministic carving seams' #.Suite.Assert case.seams≡r.seams
            case.apl←,r.output ⋄ case.aplSeams←r.seams
        :EndFor
        {}'bad threshold order' #.Suite.Assert #.Suite.Fails '(2 1 100 30) #.ImageOps.Canny 3 3⍴0'
        {}'zero threshold rejected' #.Suite.Assert #.Suite.Fails '(0 10) #.ImageOps.Hysteresis 3 3⍴0'
        {}'empty seam energy' #.Suite.Assert #.Suite.Fails '#.ImageOps.MinimumSeam 0 3⍴0'
        {}'negative energy rejected' #.Suite.Assert #.Suite.Fails '#.ImageOps.MinimumSeam 3 3⍴¯1'
        {}'disconnected seam rejected' #.Suite.Assert #.Suite.Fails '0 2 0 #.ImageOps.RemoveSeam 3 3⍴1'
        {}'last column preserved' #.Suite.Assert #.Suite.Fails '(3 ''vertical'') #.ImageOps.Carve 3 3⍴1'
        {}'last row preserved' #.Suite.Assert #.Suite.Fails '(3 ''horizontal'') #.ImageOps.Carve 3 3⍴1'
        {}'fractional carve rejected' #.Suite.Assert #.Suite.Fails '(0.5 ''vertical'') #.ImageOps.Carve 3 3⍴1'
        {}'invalid axis rejected' #.Suite.Assert #.Suite.Fails '(1 ''diagonal'') #.ImageOps.Carve 3 3⍴1'
        ⎕IO←1
        r←#.ImageOps.MinimumSeam 3 3⍴1
        {}'seam caller origin independent' #.Suite.Assert 0 0 0≡r.seam
        r←(1 1 10 20) #.ImageOps.Canny 3 3⍴73
        {}'constant Canny has no edges' #.Suite.Assert 0=+/,r.edges
        ⎕IO←0
        {}(⎕JSON spec) ⎕NPUT (folder,'/verified.json') 1
        ⎕←'PASS: 30 Canny pipelines, 5 BFS hysteresis cases, 30 exhaustive seams, 18 repeated carvings; validation'
    ∇
:EndNamespace
