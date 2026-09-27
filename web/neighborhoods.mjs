import {blur, median, morphology, fixture} from './model.mjs';
const $ = id => document.getElementById(id);
const purple = '#6465c6', orange = '#c88945', ink = '#34363d', muted = '#737780';
const renders = new Map();
function label(ctx, text, x, y, color = muted, size = 14) {
  ctx.fillStyle = color;
  ctx.font = `${size}px APL, monospace`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y);
}
function setup(id, draw) {
  const canvas = $(id);
  const render = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight, dpr = devicePixelRatio || 1;
    canvas.width = Math.round(w*dpr); canvas.height = Math.round(h*dpr);
    const ctx = canvas.getContext('2d'); ctx.scale(dpr,dpr);
    draw(ctx,w,h);
  };
  renders.set(id,render); new ResizeObserver(render).observe(canvas); render();
}
function slider(id, diagram) { $(id).addEventListener('input', () => renders.get(diagram)()); }
function grid(ctx, values, rows, cols, x, y, size, binary = false) {
  if (!binary) {
    const bitmap = document.createElement('canvas'); bitmap.width=cols; bitmap.height=rows;
    const raster = bitmap.getContext('2d'), image = raster.createImageData(cols,rows);
    values.forEach((v,i)=>{image.data[4*i]=image.data[4*i+1]=image.data[4*i+2]=Math.round(v);image.data[4*i+3]=255;});
    raster.putImageData(image,0,0);ctx.imageSmoothingEnabled=false;
    ctx.drawImage(bitmap,x,y,cols*size,rows*size);return;
  }
  values.forEach((v,i) => {
    ctx.fillStyle = binary ? `rgb(${Math.round(240-160*v)},${Math.round(240-159*v)},${Math.round(244-92*v)})` : `rgb(${Math.round(v)},${Math.round(v)},${Math.round(v)})`;
    const gap = binary ? 2 : 0;
    ctx.fillRect(x+(i%cols)*size+gap/2,y+Math.floor(i/cols)*size+gap/2,size-gap,size-gap);
  });
}
const patch = [40,40,45,40,255,45,35,40,45];
const order = patch.map((v,i)=>i).sort((a,b)=>patch[a]-patch[b] || a-b);
setup('sorting',(ctx,w,h)=>{
  const t = +$('sort-step').value, side = Math.min(48,(w-24)/9);
  const left = (w-9*side)/2, rowY = h/2-12;
  patch.forEach((v,i)=>{
    const rank = order.indexOf(i), x0 = w/2+(i%3-1.5)*side, y0 = 45+Math.floor(i/3)*side;
    const x1 = left+i*side, x2 = left+rank*side;
    const x = t<=1 ? x0+(x1-x0)*t : x1+(x2-x1)*(t-1);
    const y = t<=1 ? y0+(rowY-y0)*t : rowY;
    ctx.fillStyle = i===4 ? '#fff1dc' : '#ededf7';
    ctx.fillRect(x+1,y+1,side-2,side-2);
    ctx.strokeStyle = i===4 ? orange : '#d7d7e7';
    ctx.strokeRect(x+1,y+1,side-2,side-2);
    label(ctx,v,x+side/2,y+side/2,i===4?orange:ink,Math.min(16,side*.39));
    if(t>=1) label(ctx,i,x+side/2,y+side+18,muted,12);
  });
  if(t>1.9){
    ctx.strokeStyle=purple;ctx.lineWidth=3;
    ctx.strokeRect(left+4*side,rowY,side,side);
    label(ctx,'middle value = 40',w/2,h-34,purple,17);
  } else label(ctx,t<1?'each square keeps its value':'small numbers move left; large numbers move right',w/2,h-34,muted,w<430?12:14);
  $('sort-caption').textContent=t<.01?'The bright center is surrounded by much darker pixels.':t<1?'Ravel reads each row in turn, making one list.':t<1.99?'Small labels show original positions. Grade gives the order of these positions.':'Original positions: 6 0 1 3 7 2 5 8 4. The fifth sorted value is 40.';
});
slider('sort-step','sorting');
const ih=54, iw=70, clean=fixture('shape',0,ih,iw).pixels;
let seed=20260927;
function random(){ seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296; }
const noisePattern=clean.map(()=>[random(),random()<.5?0:255]);
let cachedNoise=-1, views;
setup('noise',(ctx,w,h)=>{
  const amount=+$('noise-amount').value;
  if(amount!==cachedNoise){
    const noisy=clean.map((v,i)=>noisePattern[i][0]<amount/100?noisePattern[i][1]:v);
    views=[noisy,blur(noisy,ih,iw,1,1,'clamp').output,median(noisy,ih,iw,1,'clamp')];
    cachedNoise=amount;
  }
  const s=Math.min((w-34)/(3*iw),2.7), gap=10, total=3*iw*s+2*gap, left=(w-total)/2;
  views.forEach((a,i)=>{
    const x=left+i*(iw*s+gap), y=(h-ih*s)/2;
    grid(ctx,a,ih,iw,x,y,s);
    label(ctx,['Noisy','Gaussian','Median'][i],x+iw*s/2,y-20,muted,w<430?13:15);
  });
  $('noise-value').textContent=`${amount}%`;
});
slider('noise-amount','noise');
const shape=Array.from({length:49},(_,i)=>{
  const y=Math.floor(i/7),x=i%7;
  return +(y>=1&&y<=5&&x>=1&&x<=5&&!(y===3&&x===3));
});
shape[0]=1;
let operation='dilate',footprint='square';
setup('morph',(ctx,w,h)=>{
  const p=+$('morph-position').value, y=Math.floor(p/7),x=p%7;
  const result=morphology(shape,7,7,operation,footprint),s=Math.min(31,(w-46)/18),gap=26;
  const left=(w-(14*s+gap))/2,top=44,right=left+7*s+gap;
  label(ctx,'input',left+3.5*s,20);label(ctx,'output',right+3.5*s,20);
  grid(ctx,shape,7,7,left,top,s,true);
  grid(ctx,result.map((v,i)=>i<=p?v:0),7,7,right,top,s,true);
  ctx.fillStyle='#fcfcfcbb';
  for(let i=p+1;i<49;i++)ctx.fillRect(right+i%7*s,top+Math.floor(i/7)*s,s,s);
  const selected=[];
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    if(footprint==='cross'&&dx&&dy)continue;
    const yy=y+dy,xx=x+dx,missing=yy<0||yy>=7||xx<0||xx>=7;
    selected.push(missing?+(operation==='erode'):shape[yy*7+xx]);
    ctx.strokeStyle=purple;ctx.lineWidth=1.5;ctx.setLineDash(missing?[3,3]:[]);
    ctx.strokeRect(left+xx*s+2,top+yy*s+2,s-4,s-4);
  }
  ctx.setLineDash([]);ctx.strokeStyle=orange;ctx.lineWidth=2.5;
  ctx.strokeRect(left+x*s+1,top+y*s+1,s-2,s-2);
  ctx.strokeRect(right+x*s+1,top+y*s+1,s-2,s-2);
  label(ctx,`${operation==='dilate'?'⌈/':'⌊/'}${selected.join(' ')} = ${result[p]}`,w/2,top+7*s+43,purple,w<430?15:19);
  $('morph-caption').textContent=`Row ${y+1}, column ${x+1}: ${operation==='dilate'?'largest':'smallest'} of ${selected.length} values is ${result[p]}. Output pixels appear as you move the window.`;
});
slider('morph-position','morph');
for(const op of ['dilate','erode'])$(op).addEventListener('click',()=>{
  operation=op;for(const name of ['dilate','erode'])$(name).setAttribute('aria-pressed',String(name===op));renders.get('morph')();
});
$('footprint').addEventListener('click',()=>{
  footprint=footprint==='square'?'cross':'square';
  $('footprint').textContent=footprint==='square'?'Use a cross-shaped window':'Use a square window';
  $('footprint').setAttribute('aria-pressed',String(footprint==='cross'));renders.get('morph')();
});
const compositionShape=Array.from({length:165},(_,i)=>{
  const y=Math.floor(i/15),x=i%15;
  return +((x>=6&&x<=12&&y>=2&&y<=8&&!(x===9&&y===5))||(x===2&&y===5));
});
let closing=false;
setup('composition',(ctx,w,h)=>{
  const t=+$('composition-step').value,first=closing?'dilate':'erode',second=closing?'erode':'dilate';
  const middle=morphology(compositionShape,11,15,first),last=morphology(middle,11,15,second);
  const a=t<=1?compositionShape:middle,b=t<=1?middle:last,f=t<=1?t:t-1;
  const s=Math.min(24,(w-24)/15),left=(w-15*s)/2,top=22;
  grid(ctx,a.map((v,i)=>v+(b[i]-v)*f),11,15,left,top,s,true);
  label(ctx,t===0?'original':t<=1?(closing?'grow':'shrink'):(closing?'shrink':'grow'),w/2,top+11*s+24,purple,17);
  $('composition-caption').textContent=closing?'Closing fills this small hole. The separate speck remains.':'Opening removes the separate speck. The hole and the larger shape remain.';
});
slider('composition-step','composition');
$('composition-kind').addEventListener('click',()=>{
  closing=!closing;$('composition-step').value=0;
  $('composition-kind').textContent=closing?'Show opening instead':'Show closing instead';
  $('composition-kind').setAttribute('aria-pressed',String(closing));
  $('stage-one').textContent=closing?'Dilate':'Erode';$('stage-two').textContent=closing?'Erode':'Dilate';renders.get('composition')();
});
document.fonts.ready.then(()=>renders.forEach(render=>render()));
