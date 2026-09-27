import {floodFill,components} from './model.mjs';
const $=id=>document.getElementById(id);
const rows=['000000000','011100110','010100010','011100000','000010110','000010110','000000000'];
const mask=rows.join('').split('').map(Number),h=7,w=9;
const renders=new Map();
let fillConnectivity=4,labelConnectivity=4,fill,regions;
function setup(id,draw){
  const canvas=$(id);
  const render=()=>{
    const width=canvas.clientWidth,height=canvas.clientHeight,dpr=devicePixelRatio||1;
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    const c=canvas.getContext('2d');c.scale(dpr,dpr);draw(c,width,height);
  };
  renders.set(id,render);new ResizeObserver(render).observe(canvas);render();
}
function grid(c,width,height,draw){
  const size=Math.min(42,(width-28)/w,(height-36)/h),left=(width-size*w)/2,top=(height-size*h)/2;
  mask.forEach((v,i)=>draw(i,left+i%w*size,top+Math.floor(i/w)*size,size));
}
function number(c,value,x,y,size){
  c.fillStyle='#34363d';c.font=`${Math.min(16,size*.4)}px APL, monospace`;c.textAlign='center';c.textBaseline='middle';c.fillText(value,x+size/2,y+size/2);
}
function updateFill(){
  fill=floodFill(mask,h,w,$('fill-seed').value.split(',').map(Number),fillConnectivity);
  $('fill-step').max=fill.steps.length-1;$('fill-step').value=0;
  renders.get('fill-grid')?.();
}
function updateRegions(){
  regions=components(mask,h,w,labelConnectivity);
  $('labels-step').max=regions.steps.length-1;$('labels-step').value=0;
  renders.get('labels-grid')?.();
}
updateFill();updateRegions();
setup('fill-grid',(c,width,height)=>{
  const step=+$('fill-step').value,state=fill.steps[step],previous=fill.steps[Math.max(0,step-1)];
  const seed=$('fill-seed').value.split(',').map(Number),seedIndex=seed[0]*w+seed[1];
  grid(c,width,height,(i,x,y,size)=>{
    const fresh=state[i]&&(step===0||!previous[i]);
    c.fillStyle=state[i]?(fresh?'#e8b97f':'#8586cd'):(mask[i]?'#cdd0d7':'#f0f0f4');
    c.fillRect(x+2,y+2,size-4,size-4);
    if(i===seedIndex){c.strokeStyle='#34363d';c.lineWidth=2;c.beginPath();c.arc(x+size/2,y+size/2,size*.27,0,Math.PI*2);c.stroke();}
  });
  const count=state.reduce((a,b)=>a+b,0),newCount=state.filter((v,i)=>v&&(step===0||!previous[i])).length;
  $('fill-step-value').textContent=step;
  $('fill-caption').textContent=`${fillConnectivity} neighbors. Cells reached: ${count}; new at this step: ${newCount}. `+(count===0?'The seed is on background, so the fill is empty.':step===fill.steps.length-1?'The next step would change nothing.':'Other regions remain untouched.');
});
setup('labels-grid',(c,width,height)=>{
  const step=+$('labels-step').value,labels=regions.steps[step],ids=[...new Set(labels.filter(Boolean))];
  grid(c,width,height,(i,x,y,size)=>{
    const id=labels[i];
    c.fillStyle=id?`hsl(${(id*137.508)%360},48%,81%)`:'#f0f0f4';c.fillRect(x+2,y+2,size-4,size-4);
    if(id)number(c,id,x,y,size);
  });
  $('labels-step-value').textContent=step;
  const finished=step===regions.steps.length-1;
  $('labels-caption').textContent=`${labelConnectivity} neighbors. ${ids.length} different labels remain. `+(finished?'Every region has settled on one label.':'The smallest labels are still spreading.');
  const summary=$('region-summary');summary.replaceChildren();
  if(!finished){summary.textContent='Move to the final step to count regions and their areas.';return;}
  const table=document.createElement('table'),caption=document.createElement('caption');
  caption.textContent=`${regions.count} regions · ${regions.areas.reduce((a,b)=>a+b,0)} foreground pixels`;table.append(caption);
  const head=document.createElement('thead'),header=document.createElement('tr');
  for(const text of ['Region label','Area (pixels)']){const cell=document.createElement('th');cell.scope='col';cell.textContent=text;header.append(cell);}
  head.append(header);table.append(head);const body=document.createElement('tbody');
  regions.ids.forEach((id,i)=>{const row=document.createElement('tr');for(const value of [id,regions.areas[i]]){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}body.append(row);});
  table.append(body);summary.append(table);
});
$('fill-seed').addEventListener('change',updateFill);
$('fill-step').addEventListener('input',()=>renders.get('fill-grid')());
$('labels-step').addEventListener('input',()=>renders.get('labels-grid')());
for(const [id,type] of [['fill-connectivity','fill'],['labels-connectivity','labels']]){
  $(id).addEventListener('click',()=>{
    if(type==='fill')fillConnectivity=fillConnectivity===4?8:4;else labelConnectivity=labelConnectivity===4?8:4;
    const eight=(type==='fill'?fillConnectivity:labelConnectivity)===8;
    $(id).setAttribute('aria-pressed',String(eight));$(id).textContent=eight?'Use only side neighbors':'Include diagonal neighbors';
    if(type==='fill')updateFill();else updateRegions();
  });
}
document.fonts.ready.then(()=>renders.forEach(render=>render()));
