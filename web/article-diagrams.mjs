export const $=id=>document.getElementById(id);
export const ink='#34363d',purple='#6465c6',muted='#737780',orange='#c88945';
const renders=new Map();
export function setup(id,draw){
  const canvas=$(id),render=()=>{
    const w=canvas.clientWidth,h=canvas.clientHeight,dpr=devicePixelRatio||1;
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    const c=canvas.getContext('2d');c.scale(dpr,dpr);draw(c,w,h);
  };
  renders.set(id,render);new ResizeObserver(render).observe(canvas);render();return render;
}
export function redraw(id){renders.get(id)?.();}
export function bind(id,diagram){$(id).addEventListener('input',()=>redraw(diagram));}
export function label(c,text,x,y,color=muted,size=14){c.fillStyle=color;c.font=`${size}px APL, monospace`;c.textAlign='center';c.textBaseline='middle';c.fillText(text,x,y);}
export function bitmap(a,h,w,color=v=>[v,v,v]){
  const b=document.createElement('canvas');b.width=w;b.height=h;
  const c=b.getContext('2d'),data=c.createImageData(w,h);
  a.forEach((v,i)=>{const rgb=color(v,i);for(let n=0;n<3;n++)data.data[4*i+n]=Math.max(0,Math.min(255,Math.round(rgb[n])));data.data[4*i+3]=255;});
  c.putImageData(data,0,0);return b;
}
export function drawBitmap(c,b,x,y,w,h){c.imageSmoothingEnabled=false;c.drawImage(b,x,y,w,h);}
export function grid(c,a,rows,cols,x,y,s,{numbers=false,color=v=>[240-160*v,240-159*v,244-92*v]}={}){
  a.forEach((v,i)=>{const xx=x+(i%cols)*s,yy=y+Math.floor(i/cols)*s,rgb=color(v,i);c.fillStyle=`rgb(${rgb.join(',')})`;c.fillRect(xx+1,yy+1,s-2,s-2);if(numbers)label(c,Number(v.toFixed(1)),xx+s/2,yy+s/2,ink,Math.min(15,s*.35));});
}
document.fonts.ready.then(()=>renders.forEach(render=>render()));
