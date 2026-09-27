import {blur,sobel,unsharp,fixture} from './model.mjs';
import {$,setup,bind,label,grid,bitmap,drawBitmap,purple,muted,ink} from './article-diagrams.mjs';
const h=42,w=56;
const rgb=[0,1,2].map(channel=>Array.from({length:h*w},(_,i)=>{
  const y=Math.floor(i/w),x=i%w;
  return channel===0?(x>15&&x<40?220:25):channel===1?Math.round(230*y/(h-1)):((x-28)**2+(y-20)**2<150?230:30);
}));
let lastSigma=-1,planes=rgb;
setup('color-planes',(c,width,height)=>{
  const sigma=+$('color-sigma').value,channel=+$('color-plane').value;
  if(sigma!==lastSigma){planes=sigma===0?rgb:rgb.map(a=>blur(a,h,w,4,sigma,'clamp').output);lastSigma=sigma;}
  const pw=Math.min(250,(width-40)/2),ph=pw*h/w,left=(width-2*pw-16)/2,top=(height-ph)/2;
  drawBitmap(c,bitmap(planes[0],h,w,(_,i)=>planes.map(a=>a[i])),left,top,pw,ph);
  drawBitmap(c,bitmap(planes[channel],h,w),left+pw+16,top,pw,ph);
  label(c,'RGB combined',left+pw/2,top-18);label(c,['red','green','blue'][channel]+' values',left+1.5*pw+16,top-18);
  $('color-sigma-value').textContent=sigma.toFixed(1);
});bind('color-sigma','color-planes');$('color-plane').addEventListener('change',()=>{$('color-sigma').dispatchEvent(new Event('input'));});
const small=[20,60,128,220,35,90,170,230,50,110,200,255];
setup('reverse-grid',(c,width,height)=>{
  const t=+$('reverse-step').value,s=Math.min(56,(width-30)/4),left=(width-4*s)/2,top=(height-3*s)/2;
  small.forEach((v,i)=>{const y=Math.floor(i/4),x=i%4,xx=left+(x+(3-2*x)*t)*s;c.fillStyle=`hsl(${225+x*16},45%,${80-y*8}%)`;c.fillRect(xx+2,top+y*s+2,s-4,s-4);label(c,v,xx+s/2,top+(y+.5)*s,ink,16);});
});bind('reverse-step','reverse-grid');
setup('threshold-grid',(c,width,height)=>{
  const threshold=+$('threshold-level').value,s=Math.min(49,(width-40)/8),left=(width-8*s-18)/2,top=(height-3*s)/2;
  grid(c,small,3,4,left,top,s,{numbers:true,color:()=>[235,235,247]});
  grid(c,small.map(v=>+(v>=threshold)),3,4,left+4*s+18,top,s,{numbers:true,color:v=>v?[189,190,233]:[245,245,248]});
  $('threshold-value').textContent=threshold;$('threshold-caption').textContent=`${small.filter(v=>v>=threshold).length} of 12 pixels are at least ${threshold}. The output is a mask of zeros and ones.`;
});bind('threshold-level','threshold-grid');
const source=blur(fixture('shape',0,h,w).pixels,h,w,1,.7,'clamp').output,g=sobel(source,h,w,'clamp'),max=Math.max(...g.magnitude);
function signed(v,scale){const t=Math.min(1,Math.abs(v)/scale);const color=v>=0?[100,101,198]:[200,137,69];return color.map(x=>255+(x-255)*t);}
const gradients=[bitmap(source,h,w),bitmap(g.gx,h,w,v=>signed(v,max)),bitmap(g.gy,h,w,v=>signed(v,max)),bitmap(g.magnitude,h,w,v=>[v/max*255,v/max*255,v/max*255])];
setup('signed-gradients',(c,width,height)=>{
  const stage=+$('gradient-stage').value,cols=2,pw=Math.min(215,(width-42)/2),ph=pw*h/w,left=(width-2*pw-16)/2;
  gradients.forEach((b,i)=>{const x=left+i%cols*(pw+16),y=24+Math.floor(i/cols)*height/2;label(c,['source','gx (+ / −)','gy (+ / −)','magnitude'][i],x+pw/2,y-13,muted,13);if(i<=stage)drawBitmap(c,b,x,y,pw,ph);else{c.fillStyle='#f0f0f5';c.fillRect(x,y,pw,ph);}});
});bind('gradient-stage','signed-gradients');
const detail=unsharp(source,h,w,2,1,1,'clamp').detail,detailMax=Math.max(...detail.map(Math.abs))||1;
setup('sharpening',(c,width,height)=>{
  const amount=+$('sharp-amount').value,result=source.map((v,i)=>v+amount*detail[i]),cols=width<500?1:3,pw=Math.min(cols===1?240:195,(width-40-(cols-1)*12)/cols),ph=pw*h/w,left=(width-cols*pw-(cols-1)*12)/2;
  const views=[bitmap(source,h,w),bitmap(detail,h,w,v=>signed(v,detailMax)),bitmap(result,h,w)];
  views.forEach((b,i)=>{const x=left+i%cols*(pw+12),y=24+Math.floor(i/cols)*height/3;label(c,['original','signed detail','sharpened'][i],x+pw/2,y-13);drawBitmap(c,b,x,y,pw,ph);});
  $('sharp-value').textContent=amount.toFixed(2);$('sharp-caption').textContent=`Detail layer is amplified for display. Raw sharpened range: ${Math.min(...result).toFixed(1)} to ${Math.max(...result).toFixed(1)}; display clips to 0–255.`;
});bind('sharp-amount','sharpening');
