#!/usr/bin/env python3
"""Independent Canny and exhaustive seam oracles; export executed Dyalog results."""
import itertools
import json
import math
import os
from pathlib import Path
import random
import subprocess
import sys
import tempfile
from run import correlate, sample
ROOT=Path(__file__).resolve().parents[1]

def rows(a,h,w):
    return [a[y*w:(y+1)*w] for y in range(h)]

def gradients(a):
    k=[[-1,0,1],[-2,0,2],[-1,0,1]]
    gx=correlate(a,k,'clamp');gy=correlate(a,list(map(list,zip(*k))),'clamp')
    return gx,gy,[math.hypot(x,y) for x,y in zip(gx,gy)]

def linking(a,h,w,low,high):
    weak=[int(v>=low) for v in a];strong=[int(v>=high) for v in a]
    reached={i for i,v in enumerate(strong) if v};queue=list(reached)
    for i in queue:
        y,x=divmod(i,w)
        for dy,dx in itertools.product(range(-1,2),repeat=2):
            yy,xx=y+dy,x+dx;j=yy*w+xx
            if 0<=yy<h and 0<=xx<w and weak[j] and j not in reached:
                reached.add(j);queue.append(j)
    return dict(weak=weak,strong=strong,edges=[int(i in reached) for i in range(h*w)])

def canny(a,r,s,low,high):
    h,w=len(a),len(a[0]);k=[math.exp(-.5*(i/s)**2) for i in range(-r,r+1)];k=[v/sum(k) for v in k]
    horizontal=rows(correlate(a,[k],'clamp'),h,w)
    smooth=correlate(horizontal,[[v] for v in k],'clamp')
    gx,gy,m=gradients(rows(smooth,h,w));direction=[];thin=[0]*(h*w)
    offsets=[(0,1),(1,1),(1,0),(1,-1)]
    for i in range(h*w):
        # Independent angle formulation of four-direction quantization.
        angle=math.degrees(math.atan2(gy[i],gx[i]))%180
        d=0 if m[i]<=1e-10 else int((angle+22.5)//45)%4;direction.append(d*45)
        y,x=divmod(i,w);dy,dx=offsets[d]
        if 0<y<h-1 and 0<x<w-1 and m[i]>=m[(y-dy)*w+x-dx]-1e-10 and m[i]>m[(y+dy)*w+x+dx]+1e-10:
            thin[i]=m[i]
    return dict(smoothed=smooth,gx=gx,gy=gy,magnitude=m,direction=direction,thin=thin,**linking(thin,h,w,low,high))

def exhaustive(a):
    h,w=len(a),len(a[0]);paths=[(x,) for x in range(w)];cost=[];parents=[-1]*w
    for depth in range(h):
        if depth:
            paths=[p+(x,) for p in paths for x in range(w) if abs(x-p[-1])<=1]
        for x in range(w):
            candidates=[p for p in paths if p[-1]==x]
            winner=min(candidates,key=lambda p:(sum(a[y][v] for y,v in enumerate(p)),tuple(reversed(p))))
            cost.append(sum(a[y][v] for y,v in enumerate(winner)))
            if depth:parents.append(winner[-2])
    winner=min(paths,key=lambda p:(sum(a[y][v] for y,v in enumerate(p)),tuple(reversed(p))))
    return dict(cost=cost,parents=parents,seam=list(winner),total=sum(a[y][v] for y,v in enumerate(winner)))

def carving(a,count,axis):
    work=list(map(list,zip(*a))) if axis=='horizontal' else [r[:] for r in a];seams=[]
    for _ in range(count):
        energy=gradients(work)[2];chosen=exhaustive(rows(energy,len(work),len(work[0])))['seam'];seams.append(chosen)
        work=[row[:x]+row[x+1:] for row,x in zip(work,chosen)]
    if axis=='horizontal':work=list(map(list,zip(*work)))
    return dict(output=sum(work,[]),outputShape=[len(work),len(work[0])],seams=seams)

def main():
    rng=random.Random(727)
    patterns=[[[73]*9 for _ in range(7)],[[255*int(x>=5) for x in range(11)] for y in range(9)],
              [[255*int(y>=4) for x in range(11)] for y in range(9)],
              [[200*int(x>=y) for x in range(9)] for y in range(9)],
              [[255*int(x==4 or y==4) for x in range(9)] for y in range(9)],
              [[255*int(x==4 and y==4) for x in range(9)] for y in range(9)],
              [[rng.randrange(256) for x in range(8)] for y in range(6)],[[12]],[[1,5,2]],[[1],[5],[2]]]
    cannys=[]
    for a in patterns:
        for radius,sigma in [(0,1),(1,.8),(2,1.2)]:
            cannys.append(dict(shape=[len(a),len(a[0])],pixels=sum(a,[]),radius=radius,sigma=sigma,low=35,high=100,**canny(a,radius,sigma,35,100)))
    thin=[[0,0,0,0,0,0,0,0],[0,120,60,60,0,60,60,0],[0,0,0,60,0,0,60,0],[0,60,60,60,0,0,0,0],[0,0,0,0,0,0,0,0]]
    links=[]
    for low,high in [(30,90),(60,120),(61,120),(30,121),(120,120)]:
        links.append(dict(shape=[5,8],pixels=sum(thin,[]),low=low,high=high,**linking(sum(thin,[]),5,8,low,high)))
    energies=[[[0]*4 for _ in range(4)],[[3]],[[3,1,1,2]],[[2],[1],[4]],
              [[1,9,9],[9,1,9],[9,9,1]],[[5,1,5],[5,1,5],[1,9,1]]]
    energies += [[[rng.randrange(10) for x in range(4)] for y in range(4)] for _ in range(24)]
    seams=[dict(shape=[len(a),len(a[0])],pixels=sum(a,[]),**exhaustive(a)) for a in energies]
    carvings=[]
    for a in [[[73]*4 for _ in range(3)],[[rng.randrange(256) for x in range(4)] for y in range(3)],[[0,0,255,0],[0,0,255,0],[0,0,255,0]]]:
        for axis in ['vertical','horizontal']:
            for count in range(3):carvings.append(dict(shape=[len(a),len(a[0])],pixels=sum(a,[]),count=count,axis=axis,**carving(a,count,axis)))
    with tempfile.TemporaryDirectory(prefix='bitmapapl-advanced-') as temp:
        folder=Path(temp);(folder/'oracle.json').write_text(json.dumps(dict(cannys=cannys,links=links,seams=seams,carvings=carvings)))
        script=folder/'run.apls'
        script.write_text("⎕TRAP←(0 'E' '⎕←⎕DM ⋄ ⎕OFF 1')\n{}⎕FIX 'file://src/ImageOps.dyalog'\n{}⎕FIX 'file://tests/Suite.dyalog'\n{}⎕FIX 'file://tests/Advanced.dyalog'\nAdvanced.Run '"+str(folder).replace("'","''")+"'\n⎕OFF 0\n")
        subprocess.run(['dyalog','-script',str(script)],cwd=ROOT,env={**os.environ,'ENABLE_CEF':'0'},check=True,timeout=60)
        if '--export' in sys.argv:
            (ROOT/'web/fixtures/advanced-reference.json').write_text((folder/'verified.json').read_text()+'\n')
            print('Exported advanced Dyalog fixtures')
if __name__=='__main__':main()
