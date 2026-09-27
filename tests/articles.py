#!/usr/bin/env python3
"""Execute every displayed APL block in each article, in reading order."""
import html
import os
from pathlib import Path
import re
import subprocess
import tempfile
ROOT=Path(__file__).resolve().parents[1]
# Inputs used by excerpts that start in the middle of an operation.
common="""⎕IO←0
Assert←{⍵:1 ⋄ ⎕SIGNAL 11}
picture←12 16⍴256|⍳192
image←3 12 16⍴256|⍳576
values←⍳35
neighbors←20 60 220
sigma←1
gx←3 3⍴1 ⋄ gy←3 3⍴2
shape←7 7⍴0 1 1 1 1 1 0
allowed←3 5⍴1 ⋄ grown←allowed
middle←90 ⋄ before←90 ⋄ after←35
previous←16⍴3 ⋄ candidates←1 2 3
next←16⍴0 ⋄ x←2 ⋄ y←1
"""
checks={
 'index.html':"{}Assert 90=+/0.25 0.5 0.25×20 60 220\n{}Assert blurred≡(4 1 'clamp') ImageOps.BlurPlane picture",
 'neighborhoods.html':"{}Assert 40=Middle patch\n{}Assert (Open shape)≡('open' 'square') ImageOps.Morphology shape",
 'contrast.html':"{}Assert 0 0 2 5 5 6 8 8≡running\n{}Assert 0 0 128 128 128 170 255 255≡mapping[values]",
 'regions.html':"{}Assert filled≡allowed\n{}Assert regions.count=1\n{}Assert (,11)≡regions.areas",
 'canny.html':"{}Assert keep=1\n{}Assert (⍴picture)≡⍴result.edges",
 'seams.html':"{}Assert (12 8)≡⍴result.output\n{}Assert (4 16)≡⍴shorter.output",
 'array-tools.html':"{}Assert 90 140≡windows+.×weights\n{}Assert flipped≡⌽picture\n{}Assert mask≡picture≥128"
}
with tempfile.TemporaryDirectory(prefix='bitmapapl-articles-') as folder:
    for name,assertions in checks.items():
        source=(ROOT/'web'/name).read_text()
        blocks='\n'.join(html.unescape(v) for v in re.findall(r'<pre><code>(.*?)</code></pre>',source,re.S))
        script=Path(folder)/'article.apls'
        script.write_text("⎕TRAP←(0 'E' '⎕←⎕DM ⋄ ⎕OFF 1')\n{}⎕FIX 'file://src/ImageOps.dyalog'\n"+common+blocks+'\n'+assertions+"\n⎕OFF 0\n")
        subprocess.run(['dyalog','-script',str(script)],cwd=ROOT,env={**os.environ,'ENABLE_CEF':'0'},check=True,timeout=60)
        print('PASS: displayed APL in '+name)
