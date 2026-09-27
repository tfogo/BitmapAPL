import {fixture, blur, sobel, unsharp, transform, sample, sobelX, sobelY} from './model.mjs';
const $ = id => document.getElementById(id);
const state = {lesson:'blur', frame:0, timer:null};
let data;
let movingPixel;
const text = (id, value) => { $(id).textContent = value; };
const number = n => Math.abs(n) < 0.0005 ? '0' : Number(n.toFixed(3)).toString();
function stop() { movingPixel?.remove(); clearInterval(state.timer); state.timer = null; text('play','Play'); $('pixel-result').setAttribute('aria-live','polite'); }
function configure() {
  stop(); state.frame = 0;
  const l = state.lesson, spatial = ['blur','sobel','sharpen'].includes(l), gaussian = ['blur','sharpen'].includes(l);
  $('operation-control').hidden = l !== 'transform';
  $('boundary-control').hidden = !spatial;
  $('radius-control').hidden = $('sigma-control').hidden = !gaussian;
  $('amount-control').hidden = l !== 'sharpen';
  $('threshold-control').hidden = l !== 'transform' || $('operation').value !== 'threshold';
  $('channel-control').hidden = $('sample').value !== 'color';
  document.querySelectorAll('[data-lesson]').forEach(b => b.dataset.lesson === l ? b.setAttribute('aria-current','step') : b.removeAttribute('aria-current'));
  const {pixels:a,h,w} = fixture($('sample').value, +$('channel').value);
  const radius = +$('radius').value, sigma = +$('sigma').value, amount = +$('amount').value, mode = $('boundary').value;
  data = {a,h,w,n:a.length,radius,sigma,amount,mode,oh:h,ow:w,stages:1};
  if (l === 'blur') Object.assign(data, blur(a,h,w,radius,sigma,mode), {stages:2});
  if (l === 'sobel') { Object.assign(data, sobel(a,h,w,mode), {stages:2}); data.output=data.magnitude; }
  if (l === 'sharpen') Object.assign(data, unsharp(a,h,w,radius,sigma,amount,mode), {stages:2});
  if (l === 'transform') { data.output=transform(a,h,w,$('operation').value,+$('threshold').value); if ($('operation').value==='transpose') {data.oh=w;data.ow=h;} }
  if (l === 'array') data.output=a.slice();
  $('position').max=data.n*data.stages-1;
  text('radius-value',`${radius} px`);text('sigma-value',`${sigma.toFixed(1)} px`);text('amount-value',amount.toFixed(1));text('threshold-value',$('threshold').value);
  render();
  renderLarge();
}
function cellColor(v, signed, scale) {
  if (signed) { const t=Math.min(1,Math.abs(v)/scale); return `rgb(${v<0?Math.round(246-30*t):Math.round(242-205*t)},${Math.round(246-130*t)},${v<0?Math.round(251-220*t):Math.round(251-15*t)})`; }
  const t=Math.round(Math.max(0,Math.min(255,v/scale*255)));return `rgb(${t},${t},${t})`;
}
function grid(id, values, h,w, {active=-1,neighbors=[],revealed=Infinity,signed=false,scale=255,indexView=false}={}) {
  const root=$(id);root.classList.toggle('signed',signed);root.style.gridTemplateColumns=`repeat(${w},minmax(0,1fr))`;root.style.aspectRatio=`${w}/${h}`;
  root.replaceChildren(...values.map((v,i)=>{
    const b=document.createElement('button');b.className='pixel';b.type='button';b.dataset.index=i;b.dataset.grid=id;
    b.tabIndex=i===active?0:-1;
    b.addEventListener('keydown',e=>{const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-w,ArrowDown:w}[e.key];if(delta!==undefined){e.preventDefault();const next=Math.max(0,Math.min(values.length-1,i+delta));const target=root.querySelector(`[data-index="${next}"]`);target.focus();target.click();}});
    b.classList.toggle('active',i===active);b.classList.toggle('neighbor',neighbors.includes(i)&&i!==active);b.classList.toggle('pending',i>revealed);
    b.style.background=indexView?'#dbe6fc':cellColor(v,signed,scale);b.style.color=indexView||signed||v/scale>.48?'#14213a':'#fff';
    b.textContent=signed&&v>0?`+${Math.round(v)}`:Math.round(v);
    b.setAttribute('aria-label',`Row ${Math.floor(i/w)+1}, column ${i%w+1}: ${number(v)}${i>revealed?', upcoming':''}`);
    b.addEventListener('click',()=>{stop();let p=i;if(id!=='output-grid'&&state.lesson==='transform'){if($('operation').value==='transpose')p=(i%data.w)*data.h+Math.floor(i/data.w);if($('operation').value==='flip')p=Math.floor(i/data.w)*data.w+data.w-1-i%data.w;}const pass=data.stages===2?(id==='output-grid'?1:id==='middle-grid'?0:Math.floor(state.frame/data.n)):0;state.frame=pass*data.n+p;render();});
    return b;
  }));
}
function render() {
  const focused=document.activeElement?.dataset;const focusGrid=focused?.grid,focusIndex=focused?.index;
  const {a,h,w,n,output,oh,ow,mode}=data,l=state.lesson,stage=Math.floor(state.frame/n),p=state.frame%n,y=Math.floor(p/ow),x=p%ow;
  const descriptions={
    array:['SHAPE · INDEXING · RESHAPE','An image is a rectangular array.','Each brightness value occupies one position. The shape tells APL how to arrange the values; it does not change them.'],
    transform:['SCALAR EXTENSION · COMPARISON · AXES','One expression. Every pixel.','Apply arithmetic to the whole array, or rearrange its axes. Follow the selected input position to its output.'],
    blur:['STENCIL · REDUCTION · RANK','A blur is a weighted neighborhood.','Nearby pixels contribute more. Apply the same one-dimensional Gaussian across rows, then down columns.'],
    sobel:['CORRELATION · SIGNED VALUES · MAGNITUDE','An edge is a change in brightness.','Positive and negative weights measure horizontal and vertical changes. Combine both responses to reveal edge strength.'],
    sharpen:['ARRAY ARITHMETIC · COMPOSITION','Subtract the blur. Add the detail.','A blurred copy contains smooth structure. The difference holds detail; add a scaled amount of it back to the source.']
  };
  const [concept,title,description]=descriptions[l];text('concept',concept);text('title',title);text('description',description);
  let middle=a,middleLabel='02 / PIXEL POSITIONS',middleCaption='⍳ generates positions. Reshape arranges them into rows.', signedMiddle=false;
  if(l==='array')middle=Array.from({length:n},(_,i)=>i+1);
  if(l==='transform'){middleLabel='02 / SOURCE POSITIONS';middle=Array.from({length:n},(_,i)=>i+1);middleCaption='The indices make an axis change easier to follow.';}
  if(l==='blur'){middle=data.horizontal;middleLabel='02 / HORIZONTAL PASS';middleCaption='Each row is filtered independently: Row⍤1.';}
  if(l==='sobel'){middle=data.gx;middleLabel='02 / HORIZONTAL GRADIENT';middleCaption='Signed response: positive means brighter to the right.';signedMiddle=true;}
  if(l==='sharpen'){middle=data.detail;middleLabel='02 / DETAIL = INPUT − BLUR';middleCaption='Positive and negative detail stays unclipped.';signedMiddle=true;}
  let inputP=p;
  if(l==='transform'&&$('operation').value==='transpose')inputP=x*w+y;
  if(l==='transform'&&$('operation').value==='flip')inputP=y*w+w-1-x;
  const neighbors=[];
  if(l==='blur')for(let d=-data.radius;d<=data.radius;d++){const ny=stage?y+d:y,nx=stage?x:x+d;if(ny>=0&&ny<h&&nx>=0&&nx<w)neighbors.push(ny*w+nx);}
  if(l==='sobel')for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++)if(y+j>=0&&y+j<h&&x+i>=0&&x+i<w)neighbors.push((y+j)*w+x+i);
  grid('input-grid',a,h,w,{active:inputP,neighbors:l==='blur'&&stage?[]:neighbors});
  grid('middle-grid',middle,h,w,{active:l==='transform'?inputP:p,neighbors:l==='blur'&&stage?neighbors:[],revealed:data.stages===2&&stage===0?p:Infinity,signed:signedMiddle,scale:signedMiddle?Math.max(1,...middle.map(Math.abs)):255,indexView:l==='array'||l==='transform'});
  grid('output-grid',output,oh,ow,{active:p,revealed:data.stages===2&&stage===0?-1:p,scale:l==='sobel'?Math.max(1,...output):255});
  text('input-shape',`${h} × ${w}`);text('middle-shape',`${h} × ${w}`);text('output-shape',`${oh} × ${ow}`);text('middle-label',middleLabel);text('middle-caption',middleCaption);
  text('output-label',l==='sobel'?'03 / EDGE MAGNITUDE':'03 / RESULT');
  text('output-caption',l==='sobel'?'√(gx² + gy²), scaled for display; values are unchanged.':l==='sharpen'?'Display clipped to 0–255; the numbers retain overshoot.':'Faint cells are upcoming steps. Select a cell or scrub to it.');
  $('position').value=state.frame;text('progress',`${state.frame+1} / ${n*data.stages}`);
  inspect(p,y,x,inputP,stage);
  movingPixel?.remove();
  if(l==='transform'&&$('operation').value==='transpose'&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
    const from=$('input-grid').children[inputP].getBoundingClientRect(),to=$('output-grid').children[p].getBoundingClientRect();
    if(from.top>=0&&to.bottom<=innerHeight){
      movingPixel=document.createElement('div');movingPixel.className='moving-pixel';movingPixel.setAttribute('aria-hidden','true');movingPixel.textContent=a[inputP];
      Object.assign(movingPixel.style,{left:`${from.left}px`,top:`${from.top}px`,width:`${from.width}px`,height:`${from.height}px`});document.body.append(movingPixel);
      const tile=movingPixel;const motion=tile.animate([{transform:'translate(0,0)'},{transform:`translate(${to.left-from.left}px,${to.top-from.top}px)`}],{duration:state.timer?Math.min(+$('speed').value*.85,450):450,easing:'ease-in-out'});motion.onfinish=()=>tile.remove();
    }
  }
  if(focusGrid)$(focusGrid).querySelector(`[data-index="${focusIndex}"]`)?.focus({preventScroll:true});
}
function inspect(p,y,x,inputP,stage){
  const l=state.lesson,{a,h,w,mode,radius,sigma,amount,output}=data;
  let expression='',explanation='',arithmetic='',terms=[],glyphs=[],heading='',result=output[p];
  text('pixel-title',`Row ${y+1}, column ${x+1}`);
  if(l==='blur'){
    heading=stage?'Pass 2 · down the columns':'Pass 1 · across the rows';
    expression=`x ← (⍳1+2×r)-r+1    ⍝ ⎕IO←1\nk ← *¯0.5×(x÷s)*2\nk ← k÷+/k\nRow ← {(k mode) ImageOps.FilterRow ⍵}\n${stage?'result ← ⍉Row⍤1⊢⍉horizontal':'horizontal ← Row⍤1⊢plane'}\n⍝ FilterRow uses {+/k×⍵}⌺(≢k) on padded rows`;
    explanation='⌺ supplies a neighborhood, × multiplies corresponding values, and +/ adds the contributions. Explicit padding implements the selected boundary rule.';
    const source=stage?data.horizontal:a;
    terms=data.kernel.map((weight,i)=>{const d=i-radius;return {weight,value:sample(source,h,w,y+(stage?d:0),x+(stage?0:d),mode)};});
    result=stage?output[p]:data.horizontal[p];arithmetic=terms.map(t=>`${number(t.weight)} × ${number(t.value)}`).join(' + ');glyphs=['⍳ offsets','* exponential','+/ reduction','⌺ stencil','⍤ rank'];
  }else if(l==='sobel'){
    heading=stage?'Combine the two directions':'Measure horizontal change';
    expression=`kx ← 3 3⍴¯1 0 1 ¯2 0 2 ¯1 0 1\nky ← ⍉kx\ngx ← (kx mode) ImageOps.Correlate plane\ngy ← (ky mode) ImageOps.Correlate plane\nmagnitude ← ((gx*2)+gy*2)*0.5`;
    explanation='Each window is multiplied by the kernel as written (correlation). A weighted sum is also an inner product: (,kernel)+.×,window. Signs indicate direction; magnitude combines both.';
    terms=(stage?sobelY:sobelX).map((weight,i)=>({weight,value:sample(a,h,w,y+Math.floor(i/3)-1,x+i%3-1,mode)}));
    result=stage?output[p]:data.gx[p];arithmetic=stage?`Vertical sum = ${number(data.gy[p])}. Magnitude = √(${number(data.gx[p])}² + ${number(data.gy[p])}²).`:`Horizontal sum = ${number(data.gx[p])}. The left column is subtracted from the right column.`;glyphs=['⍴ reshape','⍉ transpose','+.× inner product','* power'];
  }else if(l==='sharpen'){
    heading=stage?'Add scaled detail':'Separate detail from structure';
    expression=`blurred ← (r s mode) ImageOps.BlurPlane plane\ndetail ← plane-blurred\nresult ← plane+amount×detail`;
    explanation='These operations act on complete arrays. The detail layer can be negative; keep that sign until the final display or file conversion.';
    const b=a[p]-data.detail[p];arithmetic=stage?`${number(a[p])} + ${amount} × ${number(data.detail[p])}`:`${number(a[p])} − ${number(b)}`;result=stage?output[p]:data.detail[p];glyphs=['− difference','× scale','+ combine'];
  }else if(l==='array'){
    heading='Shape gives values their positions';expression=`⎕IO ← 1\nplane ← ${h} ${w}⍴values\n⍴plane                 ⍝ ${h} ${w}\nplane[${y+1};${x+1}]            ⍝ ${a[p]}`;explanation='The numeric grid is the image. Reshape fills rows in order; indexing selects one position. A color image adds a leading channel axis.';arithmetic=`Position ${p+1} in the flattened array becomes row ${y+1}, column ${x+1}.`;glyphs=['⍴ shape / reshape','⍳ indices','[;] indexing'];
  }else{
    const op=$('operation').value;heading={invert:'Subtract every value from 255',threshold:'A comparison creates a mask',flip:'Reverse the last axis',transpose:'Swap the two spatial axes'}[op];
    expression={invert:'result ← 255-plane',threshold:`mask ← plane≥${$('threshold').value}\nresult ← 255×mask`,flip:'result ← ⌽plane',transpose:'result ← ⍉plane'}[op];
    explanation=op==='transpose'?'On a matrix, transpose swaps rows and columns. On a rank-three color image, use a plane operation with ⍤2 to avoid swapping channels into a spatial axis.':'The expression describes the whole array. The selected pixel shows one contribution to that result.';
    arithmetic=`Input [${Math.floor(inputP/w)+1};${inputP%w+1}] = ${a[inputP]}; output [${y+1};${x+1}] = ${number(output[p])}.`;glyphs=['255 scalar extension','≥ comparison','⌽ reverse','⍉ transpose'];
  }
  text('stage-title',heading);text('expression',expression);text('code-explanation',explanation);text('arithmetic',arithmetic);text('pixel-result',`This step → ${number(result)}`);
  $('weights').replaceChildren(...terms.map(t=>{const box=document.createElement('div');box.className='weight';box.textContent=`${number(t.weight)} × ${number(t.value)}`;const sub=document.createElement('small');sub.textContent=`= ${number(t.weight*t.value)}`;box.append(sub);return box;}));
  $('glyphs').replaceChildren(...glyphs.map(g=>{const span=document.createElement('span');span.textContent=g;return span;}));
}
function renderLarge(){
  const {pixels,h,w}=fixture($('sample').value,+$('channel').value,112,144);
  const {radius,sigma,amount,mode}=data;
  let result=pixels,oh=h,ow=w;
  if(state.lesson==='blur')result=blur(pixels,h,w,radius,sigma,mode).output;
  if(state.lesson==='sobel')result=sobel(pixels,h,w,mode).magnitude;
  if(state.lesson==='sharpen')result=unsharp(pixels,h,w,radius,sigma,amount,mode).output;
  if(state.lesson==='transform'){result=transform(pixels,h,w,$('operation').value,+$('threshold').value);if($('operation').value==='transpose'){oh=w;ow=h;}}
  function paint(id,values,height,width,scale=255){const canvas=$(id);canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d'),image=ctx.createImageData(width,height);values.forEach((v,i)=>{const byte=Math.round(Math.max(0,Math.min(255,v/scale*255)));image.data.set([byte,byte,byte,255],4*i);});ctx.putImageData(image,0,0);}
  paint('large-input',pixels,h,w);paint('large-output',result,oh,ow,state.lesson==='sobel'?Math.max(1,...result):255);
  text('large-output-label',`RESULT · ${oh} × ${ow}`);
  text('large-caption','This 112 × 144 test image uses the same controls. Radius and sigma stay in pixel units, so the blur covers a smaller fraction of the image. Playback explains the small grid above.');
}
function advance(){if(state.frame>=data.n*data.stages-1){stop();return;}state.frame++;render();}
$('play').addEventListener('click',()=>{if(state.timer){stop();return;}if(state.frame===data.n*data.stages-1)state.frame=0;text('play','Pause');$('pixel-result').setAttribute('aria-live','off');state.timer=setInterval(advance,+$('speed').value);render();});
$('step').addEventListener('click',()=>{stop();advance();});$('reset').addEventListener('click',()=>{stop();state.frame=0;render();});
$('position').addEventListener('input',()=>{stop();state.frame=+$('position').value;render();});
$('speed').addEventListener('change',()=>{if(state.timer){clearInterval(state.timer);state.timer=setInterval(advance,+$('speed').value);}});
for(const id of ['sample','channel','operation','boundary','radius','sigma','amount','threshold'])$(id).addEventListener('input',configure);
document.querySelectorAll('[data-lesson]').forEach(b=>b.addEventListener('click',()=>{state.lesson=b.dataset.lesson;configure();}));
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
configure();
