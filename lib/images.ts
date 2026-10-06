import { uid } from './utils';

const sources = new Map<string, HTMLCanvasElement>();

export const getSource = (id: string) => sources.get(id);
export const setSource = (id: string, c: HTMLCanvasElement) => void sources.set(id, c);
export const dropSource = (id: string) => void sources.delete(id);

const MAX_SIDE = 2400;

export async function loadPhoto(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    if (!nw || !nh) throw new Error('empty image');
    const k = Math.min(1, MAX_SIDE / Math.max(nw, nh));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(nw * k));
    canvas.height = Math.max(1, Math.round(nh * k));
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const id = uid();
    sources.set(id, canvas);
    return { id, url, canvas, width: canvas.width, height: canvas.height };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

/** Small JPEG for the AI request: keeps tokens and upload size low. */
export function makeAIImage(src: HTMLCanvasElement, maxSide = 640): string {
  const k = Math.min(1, maxSide / Math.max(src.width, src.height));
  const c = document.createElement('canvas');
  c.width = Math.round(src.width * k);
  c.height = Math.round(src.height * k);
  c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.8);
}
