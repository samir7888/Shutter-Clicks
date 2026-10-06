import type { Analysis } from './types';

/**
 * Lightweight on-device scene read: colour + light statistics on a 64x64 sample.
 * No models, no network. Produces tags that the caption bank is matched against.
 */
export function analyzeCanvas(src: HTMLCanvasElement): Analysis {
  const N = 64;
  const c = document.createElement('canvas');
  c.width = N;
  c.height = N;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0, N, N);
  const d = ctx.getImageData(0, 0, N, N).data;

  let sumV = 0, sumV2 = 0, sumS = 0, dark = 0, bright = 0, skin = 0;
  const bins = { warm: 0, green: 0, cyan: 0, blue: 0, purple: 0 };
  const top = { warm: 0, blue: 0, purple: 0, v: 0 };
  const bottom = { blue: 0, cyan: 0 };
  const third = N / 3;
  const regionN = N * third;

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = (y * N + x) * 4;
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const rf = r / 255, gf = g / 255, bf = b / 255;
      const max = Math.max(rf, gf, bf), min = Math.min(rf, gf, bf);
      const v = max;
      const s = max === 0 ? 0 : (max - min) / max;
      let h = 0;
      if (max !== min) {
        const diff = max - min;
        if (max === rf) h = ((gf - bf) / diff) % 6;
        else if (max === gf) h = (bf - rf) / diff + 2;
        else h = (rf - gf) / diff + 4;
        h *= 60;
        if (h < 0) h += 360;
      }
      sumV += v;
      sumV2 += v * v;
      sumS += s;
      if (v < 0.2) dark++;
      if (v > 0.85) bright++;
      if (r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15 && s > 0.15 && s < 0.7) skin++;

      const inTop = y < third;
      const inBottom = y >= N - third;
      if (inTop) top.v += v;
      if (s > 0.22 && v > 0.18) {
        const warm = h >= 15 && h <= 65;
        const green = h > 65 && h <= 170;
        const cyan = h > 170 && h <= 200;
        const blue = h > 200 && h <= 255;
        const purple = h > 255 && h <= 345;
        if (warm) { bins.warm++; if (inTop) top.warm++; }
        if (green) bins.green++;
        if (cyan) { bins.cyan++; if (inBottom) bottom.cyan++; }
        if (blue) { bins.blue++; if (inTop) top.blue++; if (inBottom) bottom.blue++; }
        if (purple) { bins.purple++; if (inTop) top.purple++; }
      }
    }
  }

  const n = N * N;
  const meanV = sumV / n;
  const meanS = sumS / n;
  const std = Math.sqrt(Math.max(0, sumV2 / n - meanV * meanV));
  const darkR = dark / n;
  const brightR = bright / n;
  const f = (v: number) => v / n;
  const topV = top.v / regionN;

  const tags: string[] = [];
  const add = (t: string) => { if (!tags.includes(t)) tags.push(t); };

  if (meanV < 0.24 || darkR > 0.55) add('night');
  if (top.purple / regionN > 0.3 || (top.warm / regionN > 0.3 && meanV < 0.55 && topV < 0.8)) add('dusk');
  if (f(bins.warm) > 0.28 && meanV > 0.38) add('golden');
  if (top.blue / regionN > 0.35 && meanV > 0.4) add('sky');
  if (f(bins.green) > 0.18) add('green');
  if ((bottom.blue + bottom.cyan) / regionN > 0.3 || f(bins.cyan) > 0.15) add('water');
  if (std > 0.27 && darkR > 0.18 && brightR > 0.04) add('shadow');
  if (f(skin) > 0.08) add('people');
  if (meanS < 0.2 && meanV > 0.45) add('soft');
  if (f(bins.warm) > 0.2) add('warm');
  if (f(bins.blue) + f(bins.cyan) > 0.35) add('cool');
  if (meanV > 0.68) add('bright');

  return { tags, brightness: meanV, saturation: meanS };
}
