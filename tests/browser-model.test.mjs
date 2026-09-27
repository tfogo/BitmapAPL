import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {blur, sobel, unsharp, transform, gaussian, median, morphology} from '../web/model.mjs';
const reference = JSON.parse(readFileSync(new URL('../web/fixtures/apl-reference.json', import.meta.url)));
function close(actual, expected) {
  assert.equal(actual.length, expected.length);
  actual.forEach((v, i) => assert.ok(Math.abs(v - expected[i]) < 1e-8, `index ${i}: ${v} != ${expected[i]}`));
}
test('72 browser blurs agree with executed Dyalog', () => {
  for (const c of reference.cases) close(blur(c.pixels, ...c.shape, c.radius, c.sigma, c.mode).output, c.apl);
});
test('24 browser Sobel and sharpening cases agree with executed Dyalog', () => {
  for (const c of reference.edges) {
    const edges = sobel(c.pixels, ...c.shape, c.mode);
    close(edges.gx, c.aplGx); close(edges.gy, c.aplGy); close(edges.magnitude, c.aplMagnitude);
    close(unsharp(c.pixels, ...c.shape, 2, 1, 1.5, c.mode).output, c.aplUnsharp);
  }
});
test('rectangular transformations and threshold equality', () => {
  assert.deepEqual(transform([1,2,3,4,5,6], 2, 3, 'transpose'), [1,4,2,5,3,6]);
  assert.deepEqual(transform([1,2,3,4,5,6], 2, 3, 'flip'), [3,2,1,6,5,4]);
  assert.deepEqual(transform([127,128,129], 1, 3, 'threshold'), [0,255,255]);
  assert.deepEqual(gaussian(0, 1), [1]);
});

test('81 browser medians agree with executed Dyalog', () => {
  for (const c of reference.medians) close(median(c.pixels, ...c.shape, c.radius, c.mode), c.apl);
});
test('552 binary morphology cases agree with executed Dyalog', () => {
  for (const c of reference.morphs) close(morphology(c.pixels, ...c.shape, c.operation, c.footprint), c.apl);
});
