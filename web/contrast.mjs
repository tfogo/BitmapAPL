import {equalize} from './model.mjs';
const $=id=>document.getElementById(id);
const purple='#6465c6',ink='#34363d',muted='#737780';
const renders=new Map();
function label(c,text,x,y,color=muted,size=14){
  c.fillStyle=color;c.font=`${size}px APL, monospace`;c.textAlign='center';c.textBaseline='middle';c.fillText(text,x,y);
}
function setup(id,draw){
  const canvas=$(id);
  const render=()=>{
    const w=canvas.clientWidth,h=canvas.clientHeight,dpr=devicePixelRatio||1;
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    const c=canvas.getContext('2d');c.scale(dpr,dpr);draw(c,w,h);
  };
  renders.set(id,render);new ResizeObserver(render).observe(canvas);render();
}
function slider(id,diagram){$(id).addEventListener('input',()=>renders.get(diagram)());}
function box(c,text,x,y,s,selected=false){
  c.fillStyle=selected?'#e3e3f5':'#f0f0f5';c.fillRect(x+2,y,s-4,36);
  if(selected){c.strokeStyle=purple;c.lineWidth=2;c.strokeRect(x+2,y,s-4,36);}
  label(c,text,x+s/2,y+18,selected?purple:ink,s<42?12:16);
}
const values=[2,2,3,3,3,5,6,6],small=equalize(values,2,4);
setup('counting',(c,w,h)=>{
  const t=+$('count-step').value,n=Math.floor(t),f=t-n,s=Math.min(58,(w-28)/8),left=(w-8*s)/2;
  const counts=Array(8).fill(0);values.slice(0,n).forEach(v=>counts[v]++);
  label(c,'pixel values',w/2,18);
  values.forEach((v,i)=>{c.globalAlpha=i<n?.6:1;box(c,v,left+i*s,40,s,i===n);});c.globalAlpha=1;
  const base=h-52;
  counts.forEach((count,i)=>{
    c.fillStyle=purple;c.fillRect(left+i*s+7,base-count*27,s-14,count*27);
    label(c,count,left+(i+.5)*s,base-count*27-14,ink);
    label(c,i,left+(i+.5)*s,base+20);
  });
  if(n<8&&f>0){
    const x0=left+(n+.5)*s,x1=left+(values[n]+.5)*s,y1=base-(counts[values[n]]+1)*27;
    c.fillStyle=purple;c.beginPath();c.arc(x0+(x1-x0)*f,95+(y1-95)*f,10,0,2*Math.PI);c.fill();
  }
  label(c,'brightness level',w/2,h-7,muted,12);
  $('count-caption').textContent=`${n} of 8 pixels counted. Counts: ${counts.join(' ')}.`;
});slider('count-step','counting');
setup('scanning',(c,w,h)=>{
  const level=+$('scan-level').value,s=Math.min(58,(w-28)/8),left=(w-8*s)/2,base=145;
  label(c,'counts',w/2,20);
  small.histogram.slice(0,8).forEach((n,i)=>{
    c.fillStyle=i<=level?purple:'#dedeea';c.fillRect(left+i*s+7,base-n*27,s-14,n*27);
    label(c,n,left+(i+.5)*s,base-n*27-14,i<=level?purple:muted);
    label(c,i,left+(i+.5)*s,base+18,muted,12);
  });
  label(c,'running totals',w/2,197);
  small.cumulative.slice(0,8).forEach((n,i)=>{if(i<=level)box(c,n,left+i*s,220,s,i===level);});
  $('scan-caption').textContent=`Through level ${level}: ${small.histogram.slice(0,level+1).join(' + ')} = ${small.cumulative[level]} pixels.`;
});slider('scan-level','scanning');
setup('mapping',(c,w,h)=>{
  const v=+$('map-level').value,s=Math.min(58,(w-28)/8),left=(w-8*s)/2;
  label(c,'input level',w/2,18);
  for(let i=0;i<8;i++){box(c,i,left+i*s,40,s,i===v);box(c,small.mapping[i],left+i*s,145,s,i===v);}
  const x=left+(v+.5)*s;c.strokeStyle=purple;c.lineWidth=2;
  c.beginPath();c.moveTo(x,82);c.lineTo(x,133);c.lineTo(x-5,125);c.moveTo(x,133);c.lineTo(x+5,125);c.stroke();
  label(c,'output value',w/2,202);
  label(c,`${v} → ${small.mapping[v]}`,w/2,245,purple,22);
  $('map-caption').textContent=small.histogram[v]?`All ${small.histogram[v]} pixels with value ${v} become ${small.mapping[v]}.`:`No pixels have value ${v}, but the table still gives it an output: ${small.mapping[v]}.`;
});slider('map-level','mapping');
const ih=64,iw=96;
const landscape=Array.from({length:ih*iw},(_,i)=>{
  const x=i%iw,y=Math.floor(i/iw),u=x/(iw-1),v=y/(ih-1);
  let value=133-17*v+3*u;
  if((u-.74)**2+(v-.23)**2<.075**2)value=148;
  if(v>.48+.09*Math.sin(u*7)+.06*Math.cos(u*13))value=113+8*u+4*v;
  if(v>.68+.09*Math.cos(u*9))value=91+12*v+3*Math.sin(u*22);
  if(v>.72&&Math.abs(u-(.52+.12*Math.sin(v*7)))<.025+.10*(v-.72))value=127+8*v;
  return Math.round(value);
});
const result=equalize(landscape,ih,iw);
function bitmap(a){
  const canvas=document.createElement('canvas');canvas.width=iw;canvas.height=ih;
  const c=canvas.getContext('2d'),data=c.createImageData(iw,ih);
  a.forEach((v,i)=>{data.data[4*i]=data.data[4*i+1]=data.data[4*i+2]=v;data.data[4*i+3]=255;});
  c.putImageData(data,0,0);return canvas;
}
const before=bitmap(landscape),after=bitmap(result.output);
setup('contrast-image',(c,w,h)=>{
  const t=+$('contrast-reveal').value,width=Math.min(w-30,480),height=width*ih/iw,left=(w-width)/2,top=(h-height)/2;
  c.imageSmoothingEnabled=false;c.drawImage(before,left,top,width,height);
  c.save();c.beginPath();c.rect(left,top,width*t,height);c.clip();c.drawImage(after,left,top,width,height);c.restore();
  c.strokeStyle=purple;c.lineWidth=2;c.beginPath();c.moveTo(left+width*t,top-6);c.lineTo(left+width*t,top+height+6);c.stroke();
  $('contrast-caption').textContent=`${Math.round(100*t)}% revealed. Input levels ${Math.min(...landscape)}–${Math.max(...landscape)}; equalized levels 0–255.`;
});slider('contrast-reveal','contrast-image');
const outputCounts=equalize(result.output,ih,iw).histogram;
const grouped=counts=>Array.from({length:64},(_,i)=>counts.slice(4*i,4*i+4).reduce((a,b)=>a+b,0));
const histograms=[grouped(result.histogram),grouped(outputCounts)],maxCount=Math.max(...histograms.flat());
setup('contrast-histograms',(c,w,h)=>{
  const width=Math.min(w-48,510),left=(w-width)/2,bar=width/64;
  histograms.forEach((a,p)=>{
    const top=35+p*145,base=top+88;
    label(c,p?'after':'before',w/2,top-13);
    a.forEach((v,i)=>{c.fillStyle=purple;c.fillRect(left+i*bar,base-v/maxCount*80,Math.max(1,bar-1),v/maxCount*80);});
    c.strokeStyle='#d8d8e4';c.beginPath();c.moveTo(left,base);c.lineTo(left+width,base);c.stroke();
    label(c,'0',left,base+18,muted,12);label(c,'128',w/2,base+18,muted,12);label(c,'255',left+width,base+18,muted,12);
  });
});
document.fonts.ready.then(()=>renders.forEach(render=>render()));

$('count-step').addEventListener('keydown',event=>{
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
    event.preventDefault();const control=$('count-step');
    control.value=Math.max(0,Math.min(8,Math.round(+control.value)+(event.key==='ArrowRight'?1:-1)));
    renders.get('counting')();
  }
});
