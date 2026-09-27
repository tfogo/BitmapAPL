// Browser teaching model. Numerical parity is checked against exported Dyalog results.
export function gaussian(radius, sigma) {
  if (!Number.isInteger(radius) || radius < 0 || !Number.isFinite(sigma) || sigma <= 0) throw Error('Invalid Gaussian parameters');
  const k = Array.from({length: 2 * radius + 1}, (_, i) => Math.exp(-0.5 * ((i - radius) / sigma) ** 2));
  const sum = k.reduce((a, b) => a + b, 0);
  return k.map(v => v / sum);
}
export function sample(a, h, w, y, x, mode) {
  if (!['zero', 'clamp', 'reflect'].includes(mode)) throw Error('Unknown boundary');
  if (mode === 'zero' && (y < 0 || x < 0 || y >= h || x >= w)) return 0;
  const map = (i, n) => { const j = ((i % (2 * n)) + 2 * n) % (2 * n); return Math.min(j, 2 * n - 1 - j); };
  if (mode === 'reflect') { y = map(y, h); x = map(x, w); }
  return a[Math.max(0, Math.min(h - 1, y)) * w + Math.max(0, Math.min(w - 1, x))];
}
export function correlate(a, h, w, kernel, kh, kw, mode) {
  return a.map((_, p) => {
    let sum = 0;
    for (let j = 0; j < kh; j++) for (let i = 0; i < kw; i++)
      sum += kernel[j * kw + i] * sample(a, h, w, Math.floor(p / w) + j - (kh >> 1), p % w + i - (kw >> 1), mode);
    return sum;
  });
}
export function blur(a, h, w, radius, sigma, mode) {
  const kernel = gaussian(radius, sigma);
  const horizontal = correlate(a, h, w, kernel, 1, kernel.length, mode);
  const output = correlate(horizontal, h, w, kernel, kernel.length, 1, mode);
  return {kernel, horizontal, output};
}
export const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
export const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
export function sobel(a, h, w, mode) {
  const gx = correlate(a, h, w, sobelX, 3, 3, mode), gy = correlate(a, h, w, sobelY, 3, 3, mode);
  return {gx, gy, magnitude: gx.map((v, i) => Math.hypot(v, gy[i]))};
}
export function unsharp(a, h, w, radius, sigma, amount, mode) {
  const b = blur(a, h, w, radius, sigma, mode);
  const detail = a.map((v, i) => v - b.output[i]);
  return {...b, detail, output: a.map((v, i) => v + amount * detail[i])};
}
export function transpose(a, h, w) { return Array.from({length: a.length}, (_, i) => a[(i % h) * w + Math.floor(i / h)]); }
export function transform(a, h, w, op, threshold = 128) {
  if (op === 'invert') return a.map(v => 255 - v);
  if (op === 'threshold') return a.map(v => v >= threshold ? 255 : 0);
  if (op === 'flip') return a.map((_, i) => a[Math.floor(i / w) * w + w - 1 - i % w]);
  if (op === 'transpose') return transpose(a, h, w);
  return a.slice();
}
export function fixture(name, channel = 0, h = 7, w = 9) {
  const pixels = Array.from({length: h * w}, (_, i) => {
    const y = Math.floor(i / w), x = i % w, gx = x * 8 / (w - 1), gy = y * 6 / (h - 1);
    if (name === 'impulse') return x === Math.floor(w/2) && y === Math.floor(h/2) ? 255 : 0;
    if (name === 'edge') return gx >= 4 ? 220 : 25;
    if (name === 'ramp') return Math.round(255 * (x + y) / (w + h - 2));
    if (name === 'color') return [Math.round(255*x/(w-1)), Math.round(255*y/(h-1)), (x+y)%2*220][channel];
    return (gx >= 2 && gx <= 6 && gy >= 1 && gy <= 5 && !(gx >= 4 && gy <= 3)) ? 220 : 15;
  });
  return {h, w, pixels};
}

export function median(a, h, w, radius = 1, mode = 'clamp') {
  if (!Number.isInteger(radius) || radius < 0) throw Error('Invalid median radius');
  return a.map((_, p) => {
    const values = [];
    for (let y = -radius; y <= radius; y++) for (let x = -radius; x <= radius; x++)
      values.push(sample(a, h, w, Math.floor(p / w) + y, p % w + x, mode));
    values.sort((x, y) => x - y);
    return values[Math.floor(values.length / 2)];
  });
}
export function morphology(a, h, w, operation, footprint = 'square') {
  if (!['square', 'cross'].includes(footprint)) throw Error('Invalid footprint');
  if (a.length !== h*w || h < 1 || w < 1 || a.some(v => v !== 0 && v !== 1)) throw Error('Expected binary plane');
  if (operation === 'open') return morphology(morphology(a,h,w,'erode',footprint),h,w,'dilate',footprint);
  if (operation === 'close') return morphology(morphology(a,h,w,'dilate',footprint),h,w,'erode',footprint);
  if (!['dilate', 'erode'].includes(operation)) throw Error('Invalid operation');
  const erosion = operation === 'erode';
  return a.map((_, p) => {
    let result = erosion ? 1 : 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (footprint === 'cross' && dx && dy) continue;
      const y = Math.floor(p / w) + dy, x = p % w + dx;
      const v = y < 0 || x < 0 || y >= h || x >= w ? (erosion ? 1 : 0) : a[y*w+x];
      result = erosion ? Math.min(result,v) : Math.max(result,v);
    }
    return result;
  });
}

export function equalize(a, h, w) {
  if (!Number.isInteger(h) || !Number.isInteger(w) || h < 1 || w < 1 || a.length !== h*w ||
      a.some(v => !Number.isInteger(v) || v < 0 || v > 255)) throw Error('Expected grayscale byte plane');
  const histogram = Array(256).fill(0);
  for (const v of a) histogram[v]++;
  let sum = 0;
  const cumulative = histogram.map(n => (sum += n));
  const first = cumulative.find(n => n > 0);
  const mapping = cumulative.map((n,i) => first === a.length ? i : Math.floor(.5+255*Math.max(0,n-first)/(a.length-first)));
  return {histogram, cumulative, mapping, output:a.map(v => mapping[v])};
}

function checkMask(a,h,w,connectivity) {
  if (![4,8].includes(connectivity) || !Number.isInteger(h) || !Number.isInteger(w) ||
      h<1 || w<1 || a.length!==h*w || a.some(v=>v!==0&&v!==1)) throw Error('Expected binary plane and connectivity 4 or 8');
}
export function floodFill(a,h,w,seed,connectivity=4) {
  checkMask(a,h,w,connectivity);
  if (!Array.isArray(seed)||seed.length!==2||seed.some(v=>!Number.isInteger(v))||seed[0]<0||seed[0]>=h||seed[1]<0||seed[1]>=w) throw Error('Invalid zero-based seed');
  let state=Array(a.length).fill(0);state[seed[0]*w+seed[1]]=a[seed[0]*w+seed[1]];
  const steps=[state];
  while(true){
    const next=morphology(state,h,w,'dilate',connectivity===4?'cross':'square').map((v,i)=>v*a[i]);
    if(next.every((v,i)=>v===state[i]))break;
    steps.push(next);state=next;
  }
  return {output:state,steps};
}
export function labelStep(labels,h,w,connectivity=4) {
  return labels.map((v,i)=>{
    if(!v)return 0;
    let best=v;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      if(connectivity===4&&dx&&dy)continue;
      const y=Math.floor(i/w)+dy,x=i%w+dx;
      if(y>=0&&x>=0&&y<h&&x<w&&labels[y*w+x]>0)best=Math.min(best,labels[y*w+x]);
    }
    return best;
  });
}
export function components(a,h,w,connectivity=4) {
  checkMask(a,h,w,connectivity);
  let labels=a.map((v,i)=>v*(i+1));const steps=[labels];
  while(true){
    const next=labelStep(labels,h,w,connectivity);
    if(next.every((v,i)=>v===labels[i]))break;
    labels=next;steps.push(labels);
  }
  const ids=[...new Set(labels.filter(Boolean))].sort((a,b)=>a-b);
  return {labels,ids,areas:ids.map(id=>labels.filter(v=>v===id).length),count:ids.length,steps};
}
export function nonMax(gx,gy,magnitude,h,w) {
  const direction=Array(h*w).fill(0),thin=Array(h*w).fill(0);
  const offsets=[[0,1],[1,1],[1,0],[1,-1]];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=y*w+x;
    let d=0;
    if(Math.abs(gy[i])>0.4142135623730951*Math.abs(gx[i])) {
      d=2;
      if(Math.abs(gx[i])>0.4142135623730951*Math.abs(gy[i]))d=gx[i]*gy[i]<0?3:1;
    }
    if(magnitude[i]<=1e-10)d=0;
    direction[i]=45*d;
    if(y===0||x===0||y===h-1||x===w-1)continue;
    const [dy,dx]=offsets[d],before=magnitude[(y-dy)*w+x-dx],after=magnitude[(y+dy)*w+x+dx];
    if(magnitude[i]>=before-1e-10&&magnitude[i]>after+1e-10)thin[i]=magnitude[i];
  }
  return {direction,thin};
}
export function hysteresis(thin,h,w,low,high,trace=false) {
  if(!Number.isFinite(low)||!Number.isFinite(high)||low<=0||high<low)throw Error('Expected 0 < low <= high');
  const weak=thin.map(v=>+(v>=low)),strong=thin.map(v=>+(v>=high));
  let edges=strong;
  const steps=trace?[edges]:[];
  while(true){
    const next=morphology(edges,h,w,'dilate','square').map((v,i)=>v*weak[i]);
    if(next.every((v,i)=>v===edges[i]))break;
    edges=next;if(trace)steps.push(edges);
  }
  return {weak,strong,edges,steps};
}
export function canny(a,h,w,radius=2,sigma=1,low=40,high=100,trace=false) {
  const smoothed=blur(a,h,w,radius,sigma,'clamp').output,gradients=sobel(smoothed,h,w,'clamp');
  const suppressed=nonMax(gradients.gx,gradients.gy,gradients.magnitude,h,w);
  return {smoothed,...gradients,...suppressed,...hysteresis(suppressed.thin,h,w,low,high,trace)};
}
export function energy(a,h,w){return sobel(a,h,w,'clamp').magnitude;}
export function minimumSeam(a,h,w) {
  if(!Number.isInteger(h)||!Number.isInteger(w)||h<1||w<1||a.length!==h*w||a.some(v=>!Number.isFinite(v)||v<0))throw Error('Invalid energy plane');
  const cost=a.slice(),parents=Array(a.length).fill(-1);
  for(let y=1;y<h;y++)for(let x=0;x<w;x++){
    let parent=Math.max(0,x-1);
    for(let p=parent+1;p<=Math.min(w-1,x+1);p++)if(cost[(y-1)*w+p]<cost[(y-1)*w+parent])parent=p;
    parents[y*w+x]=parent;cost[y*w+x]+=cost[(y-1)*w+parent];
  }
  let last=0;
  for(let x=1;x<w;x++)if(cost[(h-1)*w+x]<cost[(h-1)*w+last])last=x;
  const total=cost[(h-1)*w+last],seam=Array(h).fill(0);seam[h-1]=last;
  for(let y=h-1;y>0;y--)seam[y-1]=parents[y*w+seam[y]];
  return {cost,parents,total,seam};
}
export function removeSeam(a,h,w,seam) {
  if(w<=1||seam.length!==h||seam.some((x,y)=>!Number.isInteger(x)||x<0||x>=w||(y&&Math.abs(x-seam[y-1])>1)))throw Error('Invalid seam');
  return a.filter((_,i)=>i%w!==seam[Math.floor(i/w)]);
}
export function carve(a,h,w,count,axis='vertical') {
  if(!['vertical','horizontal'].includes(axis)||!Number.isInteger(count)||count<0||count>=(axis==='vertical'?w:h))throw Error('Invalid carve dimensions');
  let work=axis==='horizontal'?transpose(a,h,w):a.slice(),rows=axis==='horizontal'?w:h,cols=axis==='horizontal'?h:w;
  const seams=[];
  for(let i=0;i<count;i++){
    const chosen=minimumSeam(energy(work,rows,cols),rows,cols);seams.push(chosen.seam);
    work=removeSeam(work,rows,cols,chosen.seam);cols--;
  }
  return {output:axis==='horizontal'?transpose(work,rows,cols):work,seams,h:axis==='horizontal'?cols:rows,w:axis==='horizontal'?rows:cols};
}
