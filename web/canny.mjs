import {canny,hysteresis} from './model.mjs';
import {$,setup,redraw,bind,label,bitmap,drawBitmap,grid,purple,orange,muted} from './article-diagrams.mjs';
const h=48,w=64;
const source=Array.from({length:h*w},(_,i)=>{
  const y=Math.floor(i/w),x=i%w;
  let v=25+((x*17+y*31)%11);
  if(x>9&&x<34&&y>9&&y<37)v=175;
  if((x-45)**2+(y-25)**2<110)v=70+2*y;
  return v;
});
const base=canny(source,h,w,2,1,35,100),scale=Math.max(...base.magnitude)||1;
let result=base,panels=[];
function update(changed){
  let low=+$('canny-low').value,high=+$('canny-high').value;
  if(low>high){if(changed==='low')high=low;else low=high;}
  $('canny-low').value=low;$('canny-high').value=high;
  $('canny-low-value').textContent=low;$('canny-high-value').textContent=high;
  result={...base,...hysteresis(base.thin,h,w,low,high)};
  panels=[bitmap(source,h,w),bitmap(base.smoothed,h,w),bitmap(base.magnitude,h,w,v=>[v/scale*255,v/scale*255,v/scale*255]),bitmap(base.thin,h,w,v=>[v/scale*255,v/scale*255,v/scale*255]),bitmap(result.weak,h,w,(v,i)=>result.strong[i]?[100,101,198]:v?[221,161,88]:[244,244,248]),bitmap(result.edges,h,w,v=>[v*255,v*255,v*255])];
  redraw('canny-pipeline');
}
update();
setup('canny-pipeline',(c,width,height)=>{
  const cols=width<500?2:3,rows=6/cols,gap=15,pw=Math.min(205,(width-26-(cols-1)*gap)/cols),ph=pw*h/w,left=(width-cols*pw-(cols-1)*gap)/2;
  panels.forEach((b,i)=>{const x=left+i%cols*(pw+gap),y=30+Math.floor(i/cols)*(height/rows);drawBitmap(c,b,x,y,pw,ph);label(c,['source','blur','gradient','thin','classify','link'][i],x+pw/2,y-14,muted,13);});
  $('pipeline-caption').textContent=`${result.strong.reduce((a,b)=>a+b,0)} strong pixels; ${result.edges.reduce((a,b)=>a+b,0)} accepted after linking. Purple: strong. Orange: weak candidates.`;
});
$('canny-low').addEventListener('input',()=>update('low'));$('canny-high').addEventListener('input',()=>update('high'));
const ridge=[10,40,90,90,35,5,0];
setup('thinning',(c,width,height)=>{
  const p=+$('thin-position').value,s=Math.min(62,(width-26)/7),left=(width-7*s)/2,baseY=height-55;
  ridge.forEach((v,i)=>{c.fillStyle=i===p?purple:Math.abs(i-p)===1?'#c4c4e7':'#e4e4ed';c.fillRect(left+i*s+7,baseY-v*1.6,s-14,v*1.6);label(c,v,left+(i+.5)*s,baseY-v*1.6-15);});
  const keep=ridge[p]>=ridge[p-1]&&ridge[p]>ridge[p+1];
  label(c,keep?'keep':'suppress',width/2,height-12,keep?purple:orange,19);
  $('thin-caption').textContent=`${ridge[p]} ≥ ${ridge[p-1]} and ${ridge[p]} > ${ridge[p+1]}: ${keep?'keep this sample':'set it to zero'}.`;
});bind('thin-position','thinning');
const tiny=[0,0,0,0,0,0,0,0,0,120,60,60,0,60,60,0,0,0,0,60,0,0,60,0,0,60,60,60,0,0,0,0,0,0,0,0,0,0,0,0];
const linking=hysteresis(tiny,5,8,30,90,true);$('link-step').max=linking.steps.length-1;
setup('edge-linking',(c,width,height)=>{
  const n=+$('link-step').value,state=linking.steps[n],s=Math.min(43,(width-24)/8),left=(width-s*8)/2,top=(height-s*5)/2;
  grid(c,tiny,5,8,left,top,s,{numbers:true,color:(v,i)=>state[i]?[190,190,234]:v?[243,211,171]:[244,244,248]});
  $('link-caption').textContent=`Step ${n}: ${state.reduce((a,b)=>a+b,0)} accepted. ${n===linking.steps.length-1?'The separate three-pixel island has no strong seed.':'Acceptance travels at most one neighbor per step.'}`;
});bind('link-step','edge-linking');
