import type { Settings, Slide } from './types';
import { FRAME_H, FRAME_W, drawFrame, renderPhoto } from './render';
import { getSource } from './images';
import { currentCaption } from './slides';
import { clamp, dateStampText } from './utils';

export function renderSlideToCanvas(slide: Slide, settings: Settings, scale = 1): HTMLCanvasElement {
  const src = getSource(slide.id);
  const photo = src ? renderPhoto(src, slide.crop, settings.look, scale, dateStampText(slide.modified)) : null;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(FRAME_W * scale);
  canvas.height = Math.round(FRAME_H * scale);
  const ctx = canvas.getContext('2d')!;
  drawFrame(ctx, photo, currentCaption(slide, settings.mode)?.text ?? null, scale, { position: settings.position });
  return canvas;
}

export const canvasToBlob = (c: HTMLCanvasElement, type = 'image/png') =>
  new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), type));

export async function exportReel(
  slides: Slide[],
  settings: Settings,
  onProgress: (p: number) => void,
  token: { cancelled: boolean },
): Promise<{ blob: Blob; ext: string }> {
  const candidates = [
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  const mime = typeof MediaRecorder !== 'undefined' ? candidates.find((t) => MediaRecorder.isTypeSupported(t)) : undefined;
  if (!mime) throw new Error('This browser can’t record video. Try Chrome, Edge, or Safari 17+.');

  const photos = slides.map((s) => {
    const src = getSource(s.id);
    return src ? renderPhoto(src, s.crop, settings.look, 1, dateStampText(s.modified)) : null;
  });
  const captions = slides.map((s) => currentCaption(s, settings.mode)?.text ?? null);

  const canvas = document.createElement('canvas');
  canvas.width = FRAME_W;
  canvas.height = FRAME_H;
  const ctx = canvas.getContext('2d')!;

  const D = settings.secondsPerPhoto * 1000;
  const total = D * slides.length + 400;

  const drawAt = (t: number) => {
    const idx = Math.min(Math.floor(t / D), slides.length - 1);
    const local = t - idx * D;
    const p = clamp(local / 260, 0, 1);
    const e = 1 - Math.pow(1 - p, 3);
    drawFrame(ctx, photos[idx], captions[idx], 1, {
      position: settings.position,
      dx: (1 - e) * -50,
      alpha: e,
      flash: local < 140 ? 0.35 * (1 - local / 140) : 0,
    });
  };

  drawAt(0);
  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const stopped = new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });
  recorder.start(250);

  const start = performance.now();
  await new Promise<void>((resolve) => {
    const tick = () => {
      if (token.cancelled) return resolve();
      const t = performance.now() - start;
      if (t >= total) return resolve();
      drawAt(t);
      onProgress(t / total);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  recorder.stop();
  await stopped;
  stream.getTracks().forEach((tr) => tr.stop());
  if (token.cancelled) throw new Error('cancelled');
  onProgress(1);
  return { blob: new Blob(chunks, { type: mime.split(';')[0] }), ext: mime.startsWith('video/mp4') ? 'mp4' : 'webm' };
}
