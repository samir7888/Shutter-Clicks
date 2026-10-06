import type { CaptionPosition, Crop, Look } from './types';
import { lookParams, type LookParams } from './looks';

export const FRAME_W = 1080;
export const FRAME_H = 1920;
export const PHOTO_W = 1080;
export const PHOTO_H = 810; // 4:3
export const PHOTO_Y = (FRAME_H - PHOTO_H) / 2;
export const CAPTION_FONT = '"Courier Prime", "Courier New", Courier, monospace';

/** Where the 4:3 window sits inside the source image. */
export function cropRect(sw: number, sh: number, crop: Crop) {
  const base = Math.max(PHOTO_W / sw, PHOTO_H / sh);
  const s = base * crop.zoom;
  const vw = PHOTO_W / s;
  const vh = PHOTO_H / s;
  const ox = Math.max(0, sw - vw);
  const oy = Math.max(0, sh - vh);
  return { s, vw, vh, ox, oy, sx: ox * crop.fx, sy: oy * crop.fy };
}

function hash(x: number, y: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function applyLook(d: Uint8ClampedArray, w: number, h: number, p: LookParams) {
  const { contrast, brightness, saturation, fade, tint, grain, vignette } = p;
  const keep = 1 - fade * 0.6;
  const lift = fade * 50;
  let i = 0;
  for (let y = 0; y < h; y++) {
    const ny = y / h - 0.5;
    for (let x = 0; x < w; x++, i += 4) {
      let r = d[i];
      let g = d[i + 1];
      let b = d[i + 2];

      r = (r - 128) * contrast + 128 + brightness;
      g = (g - 128) * contrast + 128 + brightness;
      b = (b - 128) * contrast + 128 + brightness;

      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      r = l + (r - l) * saturation;
      g = l + (g - l) * saturation;
      b = l + (b - l) * saturation;

      r = r * keep + lift + tint[0];
      g = g * keep + lift + tint[1];
      b = b * keep + lift + tint[2];

      if (vignette > 0) {
        const nx = x / w - 0.5;
        const v = 1 - vignette * Math.pow((nx * nx + ny * ny) / 0.5, 1.2);
        r *= v;
        g *= v;
        b *= v;
      }
      if (grain > 0) {
        const n = (hash(x, y) - 0.5) * grain * 70;
        r += n;
        g += n;
        b += n;
      }
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
    }
  }
}

function drawDateStamp(ctx: CanvasRenderingContext2D, text: string, w: number, h: number, scale: number) {
  const fs = 34 * scale;
  ctx.save();
  ctx.font = `700 ${fs}px ${CAPTION_FONT}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ff8a1f';
  ctx.shadowColor = 'rgba(255, 110, 0, 0.65)';
  ctx.shadowBlur = 7 * scale;
  ctx.fillText(text, w - 38 * scale, h - 34 * scale);
  ctx.restore();
}

/** Renders the 4:3 photo window with crop + look applied. */
export function renderPhoto(
  source: HTMLCanvasElement,
  crop: Crop,
  look: Look,
  scale: number,
  dateText?: string,
  out?: HTMLCanvasElement,
): HTMLCanvasElement {
  const w = Math.round(PHOTO_W * scale);
  const h = Math.round(PHOTO_H * scale);
  const canvas = out ?? document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const p = lookParams(look);
  const r = cropRect(source.width, source.height, crop);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (p.soften > 0.01) {
    const k = 1 - 0.6 * p.soften;
    const tw = Math.max(48, Math.round(w * k));
    const th = Math.max(36, Math.round(h * k));
    const tmp = document.createElement('canvas');
    tmp.width = tw;
    tmp.height = th;
    const tctx = tmp.getContext('2d')!;
    tctx.imageSmoothingQuality = 'high';
    tctx.drawImage(source, r.sx, r.sy, r.vw, r.vh, 0, 0, tw, th);
    ctx.drawImage(tmp, 0, 0, tw, th, 0, 0, w, h);
  } else {
    ctx.drawImage(source, r.sx, r.sy, r.vw, r.vh, 0, 0, w, h);
  }

  const needsPass = p.contrast !== 1 || p.brightness !== 0 || p.saturation !== 1 || p.fade > 0 ||
    p.tint.some((t) => t !== 0) || p.grain > 0 || p.vignette > 0;
  if (needsPass) {
    const img = ctx.getImageData(0, 0, w, h);
    applyLook(img.data, w, h, p);
    ctx.putImageData(img, 0, 0);
  }
  if (look.dateStamp && dateText) drawDateStamp(ctx, dateText, w, h, scale);
  return canvas;
}

function wrapLine(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  if (ctx.measureText(text).width <= maxW) return [text];
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word;
    if (cur && ctx.measureText(test).width > maxW) {
      lines.push(cur);
      cur = word;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export type FrameOpts = {
  position: CaptionPosition;
  /** horizontal caption offset in 1080-wide frame pixels */
  dx?: number;
  alpha?: number;
  /** 0..1 white flash over the photo (shutter) */
  flash?: number;
};

function drawCaption(ctx: CanvasRenderingContext2D, text: string, scale: number, opts: FrameOpts) {
  const fs = 38 * scale;
  const lh = fs * 1.42;
  ctx.save();
  ctx.font = `400 ${fs}px ${CAPTION_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const maxW = (FRAME_W - 150) * scale;
  const lines: string[] = [];
  for (const raw of text.split('\n')) {
    const t = raw.trim();
    if (t) lines.push(...wrapLine(ctx, t, maxW));
  }
  if (!lines.length) {
    ctx.restore();
    return;
  }
  const blockH = lines.length * lh;
  const cx = (FRAME_W / 2 + (opts.dx ?? 0)) * scale;
  const photoBottom = (PHOTO_Y + PHOTO_H) * scale;
  const top = opts.position === 'over' ? photoBottom - 44 * scale - blockH : photoBottom + 56 * scale;
  ctx.globalAlpha = opts.alpha ?? 1;
  lines.forEach((line, i) => {
    const y = top + i * lh + lh / 2;
    if (opts.position === 'over') {
      const w = ctx.measureText(line).width;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(cx - w / 2 - 12 * scale, y - lh / 2, w + 24 * scale, lh);
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillText(line, cx, y);
  });
  ctx.restore();
}

/** Draws the full 9:16 frame. ctx canvas must be FRAME_W*scale x FRAME_H*scale. */
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  photo: HTMLCanvasElement | null,
  caption: string | null,
  scale: number,
  opts: FrameOpts,
) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, FRAME_W * scale, FRAME_H * scale);
  if (photo) {
    ctx.drawImage(photo, 0, PHOTO_Y * scale, PHOTO_W * scale, PHOTO_H * scale);
    if (opts.flash && opts.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${opts.flash})`;
      ctx.fillRect(0, PHOTO_Y * scale, PHOTO_W * scale, PHOTO_H * scale);
    }
  }
  if (caption) drawCaption(ctx, caption, scale, opts);
}
