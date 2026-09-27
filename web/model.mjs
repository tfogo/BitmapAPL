// Browser teaching model. Numerical parity is checked against exported Dyalog results.
export function gaussian(radius, sigma) {
  if (!Number.isInteger(radius) || radius < 0 || !Number.isFinite(sigma) || sigma <= 0) throw Error('Invalid Gaussian parameters');
  const k = Array.from({length: 2 * radius + 1}, (_, i) => Math.exp(-0.5 * ((i - radius) / sigma) ** 2));
  const sum = k.reduce((a, b) => a + b, 0);
  return k.map(v => v / sum);
}
export function sample(a, h, w, y, x, mode) {
  if (!['zero', 'clamp', 'reflect'].includes(mode)) throw Error('Unknown boundary');
  if (mode === 'zero' && (y < 0 || x < 0 || y >= h || x >= w)) return 0;
  const map = (i, n) => { const j = ((i % (2 * n)) + 2 * n) % (2 * n); return Math.min(j, 2 * n - 1 - j); };
  if (mode === 'reflect') { y = map(y, h); x = map(x, w); }
  return a[Math.max(0, Math.min(h - 1, y)) * w + Math.max(0, Math.min(w - 1, x))];
}
export function correlate(a, h, w, kernel, kh, kw, mode) {
  return a.map((_, p) => {
    let sum = 0;
    for (let j = 0; j < kh; j++) for (let i = 0; i < kw; i++)
      sum += kernel[j * kw + i] * sample(a, h, w, Math.floor(p / w) + j - (kh >> 1), p % w + i - (kw >> 1), mode);
    return sum;
  });
}
export function blur(a, h, w, radius, sigma, mode) {
  const kernel = gaussian(radius, sigma);
  const horizontal = correlate(a, h, w, kernel, 1, kernel.length, mode);
  const output = correlate(horizontal, h, w, kernel, kernel.length, 1, mode);
  return {kernel, horizontal, output};
}
export const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
export const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
export function sobel(a, h, w, mode) {
  const gx = correlate(a, h, w, sobelX, 3, 3, mode), gy = correlate(a, h, w, sobelY, 3, 3, mode);
  return {gx, gy, magnitude: gx.map((v, i) => Math.hypot(v, gy[i]))};
}
export function unsharp(a, h, w, radius, sigma, amount, mode) {
  const b = blur(a, h, w, radius, sigma, mode);
  const detail = a.map((v, i) => v - b.output[i]);
  return {...b, detail, output: a.map((v, i) => v + amount * detail[i])};
}
export function transpose(a, h, w) { return Array.from({length: a.length}, (_, i) => a[(i % h) * w + Math.floor(i / h)]); }
export function transform(a, h, w, op, threshold = 128) {
  if (op === 'invert') return a.map(v => 255 - v);
  if (op === 'threshold') return a.map(v => v >= threshold ? 255 : 0);
  if (op === 'flip') return a.map((_, i) => a[Math.floor(i / w) * w + w - 1 - i % w]);
  if (op === 'transpose') return transpose(a, h, w);
  return a.slice();
}
export function fixture(name, channel = 0, h = 7, w = 9) {
  const pixels = Array.from({length: h * w}, (_, i) => {
    const y = Math.floor(i / w), x = i % w, gx = x * 8 / (w - 1), gy = y * 6 / (h - 1);
    if (name === 'impulse') return x === Math.floor(w/2) && y === Math.floor(h/2) ? 255 : 0;
    if (name === 'edge') return gx >= 4 ? 220 : 25;
    if (name === 'ramp') return Math.round(255 * (x + y) / (w + h - 2));
    if (name === 'color') return [Math.round(255*x/(w-1)), Math.round(255*y/(h-1)), (x+y)%2*220][channel];
    return (gx >= 2 && gx <= 6 && gy >= 1 && gy <= 5 && !(gx >= 4 && gy <= 3)) ? 220 : 15;
  });
  return {h, w, pixels};
}
