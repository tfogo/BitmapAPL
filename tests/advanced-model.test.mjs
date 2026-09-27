import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {canny,hysteresis,minimumSeam,removeSeam,carve} from '../web/model.mjs';
const reference=JSON.parse(readFileSync(new URL('../web/fixtures/advanced-reference.json',import.meta.url)));
function close(a,b){assert.equal(a.length,b.length);a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<1e-8,`${i}: ${v} != ${b[i]}`));}
test('30 complete Canny pipelines agree with Dyalog',()=>{
  for(const c of reference.cannys){
    const actual=canny(c.pixels,...c.shape,c.radius,c.sigma,c.low,c.high);
    for(const field of ['smoothed','gx','gy','magnitude','thin'])close(actual[field],c.apl[field]);
    for(const field of ['direction','weak','strong','edges'])assert.deepEqual(actual[field],c.apl[field]);
  }
});
test('hysteresis reaches exactly the BFS-connected edges',()=>{
  for(const c of reference.links){
    const result=hysteresis(c.pixels,...c.shape,c.low,c.high,true);
    assert.deepEqual(result.edges,c.apl);
    for(let n=1;n<result.steps.length;n++)result.steps[n].forEach((v,i)=>assert.ok(v>=result.steps[n-1][i]&&v<=result.weak[i]));
  }
});
test('30 seam tables, backtracks, and ties agree with exhaustive search and Dyalog',()=>{
  for(const c of reference.seams){
    const result=minimumSeam(c.pixels,...c.shape);
    close(result.cost,c.aplCost);assert.deepEqual(result.parents,c.aplParents);
    assert.deepEqual(result.seam,c.aplSeam);assert.equal(result.total,c.aplTotal);
    if(c.shape[1]>1)assert.equal(removeSeam(c.pixels,...c.shape,result.seam).length,c.shape[0]*(c.shape[1]-1));
  }
});
test('18 repeated vertical/horizontal carvings agree with Dyalog',()=>{
  for(const c of reference.carvings){
    const result=carve(c.pixels,...c.shape,c.count,c.axis);
    assert.deepEqual(result.output,c.apl);assert.deepEqual(result.seams,c.aplSeams);
    assert.deepEqual([result.h,result.w],c.outputShape);
  }
});
test('dimension and threshold limits reject invalid operations',()=>{
  assert.throws(()=>carve([1],1,1,1));assert.throws(()=>carve([1,2],1,2,.5));
  assert.throws(()=>hysteresis([0],1,1,0,10));assert.throws(()=>hysteresis([0],1,1,20,10));
  assert.throws(()=>removeSeam(Array(9).fill(1),3,3,[0,2,0]));
});
