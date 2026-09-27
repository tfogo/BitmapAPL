import {minimumSeam,energy,removeSeam,transpose} from './model.mjs';
import {$,setup,redraw,bind,label,grid,bitmap,drawBitmap,purple,orange,ink,muted} from './article-diagrams.mjs';
const eh=4,ew=5,e=[2,6,3,7,5,5,2,8,2,6,7,3,1,4,5,8,6,3,2,7],path=minimumSeam(e,eh,ew);
setup('seam-costs',(c,width,height)=>{
  const row=+$('cost-row').value,col=+$('cost-column').value,s=Math.min(43,(width-42)/10),gap=24,left=(width-10*s-gap)/2,top=48;
  label(c,'energy',left+2.5*s,20);label(c,'path cost',left+7.5*s+gap,20);
  grid(c,e,eh,ew,left,top,s,{numbers:true,color:v=>[250,245-7*v,220-8*v]});
  const right=left+5*s+gap;
  grid(c,path.cost.map((v,i)=>Math.floor(i/5)<=row?v:0),eh,ew,right,top,s,{numbers:false,color:(_,i)=>Math.floor(i/5)<=row?[231,231,246]:[247,247,250]});
  path.cost.forEach((v,i)=>{if(Math.floor(i/5)<=row)label(c,v,right+(i%5+.5)*s,top+(Math.floor(i/5)+.5)*s,ink,Math.min(15,s*.4));});
  c.strokeStyle=purple;c.lineWidth=2;c.strokeRect(right+col*s+1,top+row*s+1,s-2,s-2);c.strokeRect(left+col*s+1,top+row*s+1,s-2,s-2);
  const candidates=[];
  if(row>0)for(let x=Math.max(0,col-1);x<=Math.min(ew-1,col+1);x++){
    candidates.push(path.cost[(row-1)*ew+x]);c.strokeStyle=x===path.parents[row*ew+col]?purple:orange;
    c.strokeRect(right+x*s+2,top+(row-1)*s+2,s-4,s-4);
  }
  $('cost-caption').textContent=row===0?`First row: the path cost is the pixel’s own energy, ${e[col]}.`:`Row ${row}, column ${col}: ${e[row*ew+col]} + min(${candidates.join(', ')}) = ${path.cost[row*ew+col]}. Purple marks the chosen predecessor.`;
});bind('cost-row','seam-costs');bind('cost-column','seam-costs');
setup('seam-backtrack',(c,width,height)=>{
  const t=+$('seam-stage').value,visited=Math.min(eh,Math.floor(t)),remove=Math.max(0,t-eh),s=Math.min(57,(width-40)/ew),left=(width-(ew-remove)*s)/2,top=34;
  e.forEach((v,i)=>{
    const y=Math.floor(i/ew),x=i%ew,seam=x===path.seam[y],selected=seam&&y>=eh-visited;
    if(seam)c.globalAlpha=1-remove;
    const xx=left+(x-(x>path.seam[y]?remove:0))*s;
    c.fillStyle=selected?'#d0d0ef':'#efeff6';c.fillRect(xx+2,top+y*s+2,s-4,s-4);label(c,v,xx+s/2,top+(y+.5)*s,ink,17);
    if(selected){c.strokeStyle=purple;c.lineWidth=2;c.strokeRect(xx+2,top+y*s+2,s-4,s-4);}c.globalAlpha=1;
  });
  $('seam-caption').textContent=t>=5?`One cell removed from every row: 4 × 5 becomes 4 × 4.`:visited===0?`The smallest last-row cost is ${path.total}. Start at column ${path.seam.at(-1)}.`:`${visited} of 4 path cells traced. Seam columns: ${path.seam.join(' ')}. Total energy: ${path.total}.`;
});bind('seam-stage','seam-backtrack');
const sh=40,sw=64;
function scene(name){return Array.from({length:sh*sw},(_,i)=>{
  const y=Math.floor(i/sw),x=i%sw;
  if(name==='stripes')return Math.floor(x/5)%2?210:35;
  if(name==='dense')return (Math.floor(x/4)+Math.floor(y/4))%2?205:45;
  let v=30+Math.round(x*.25+y*.1);
  if(x>23&&x<43&&y>6&&y<34)v=200;
  if(x>28&&x<38&&y>12&&y<27)v=100;
  return v;
});}
let horizontal=false,showEnergy=false,states=[],original;
function reset(){
  original=scene($('seam-scene').value);
  states=[{a:horizontal?transpose(original,sh,sw):original.slice(),h:horizontal?sw:sh,w:horizontal?sh:sw}];
  $('seam-count').value=0;redraw('seam-image');
}
function ensure(n){
  while(states.length<=n){const last=states.at(-1),p=minimumSeam(energy(last.a,last.h,last.w),last.h,last.w);states.push({a:removeSeam(last.a,last.h,last.w,p.seam),h:last.h,w:last.w-1});}
}
reset();
setup('seam-image',(c,width,height)=>{
  const n=+$('seam-count').value;ensure(n);const state=states[n],a=horizontal?transpose(state.a,state.h,state.w):state.a,h=horizontal?state.w:state.h,w=horizontal?state.h:state.w;
  const chosen=minimumSeam(energy(state.a,state.h,state.w),state.h,state.w).seam;
  const cols=width<500?1:3,s=Math.min(cols===1?3.5:3,(width-32-(cols-1)*16)/(cols*sw)),baseWidth=sw*s,baseHeight=sh*s;
  const left=(width-(cols*baseWidth+(cols-1)*16))/2;
  const originalEnergy=showEnergy?energy(original,sh,sw):null,energyMax=originalEnergy?Math.max(...originalEnergy)||1:1;
  for(let i=0;i<3;i++){
    const x=left+(i%cols)*(baseWidth+16),y=26+Math.floor(i/cols)*(height/3);
    label(c,[showEnergy?'source energy':'source','carved · next seam','ordinary resize'][i],x+baseWidth/2,y-13,muted,cols===1?14:12);
    const dw=(i===0?sw:w)*s,dh=(i===0?sh:h)*s,xx=x+(baseWidth-dw)/2;
    const view=i===0&&showEnergy?bitmap(originalEnergy,sh,sw,v=>[245-145*v/energyMax,245-144*v/energyMax,250-52*v/energyMax]):bitmap(i===1?a:original,i===1?h:sh,i===1?w:sw);
    drawBitmap(c,view,xx,y,dw,dh);
    if(i===1){c.strokeStyle=purple;c.lineWidth=2;c.beginPath();chosen.forEach((v,j)=>{const px=xx+(horizontal?j+.5:v+.5)*s,py=y+(horizontal?v+.5:j+.5)*s;if(j)c.lineTo(px,py);else c.moveTo(px,py);});c.stroke();}
  }
  $('seam-count-value').textContent=n;
  $('carve-caption').textContent=`${horizontal?'Horizontal':'Vertical'} removal: ${sw} × ${sh} → ${w} × ${h}. Each new seam uses the current image’s gradients.`;
});
$('seam-count').addEventListener('input',()=>redraw('seam-image'));
$('seam-scene').addEventListener('change',reset);
$('seam-axis').addEventListener('click',()=>{horizontal=!horizontal;$('seam-axis').textContent=horizontal?'Remove vertical seams':'Remove horizontal seams';$('seam-axis').setAttribute('aria-pressed',String(horizontal));reset();});

$('energy-view').addEventListener('click',()=>{showEnergy=!showEnergy;$('energy-view').setAttribute('aria-pressed',String(showEnergy));$('energy-view').textContent=showEnergy?'Show original picture':'Show the energy map';redraw('seam-image');});
