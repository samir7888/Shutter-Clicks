'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { Crop, Look, CaptionPosition, Slide } from '@/lib/types';
import { FRAME_H, FRAME_W, cropRect, drawFrame, renderPhoto } from '@/lib/render';
import { getSource } from '@/lib/images';
import { clamp, dateStampText } from '@/lib/utils';

const SCALE = 2 / 3; // preview resolution: 720 x 1280
export type StageTool = 'swipe' | 'move';

type Props = {
  slide: Slide | null;
  captionId: string | null;
  captionText: string | null;
  look: Look;
  position: CaptionPosition;
  tool: StageTool;
  fontsReady: boolean;
  canStep: boolean;
  onStep: (dir: 1 | -1) => void;
  onCrop: (crop: Partial<Crop>) => void;
};

type DragState = { x0: number; t0: number; y0: number; crop0: Crop; dx: number };

export default function Stage({ slide, captionId, captionText, look, position, tool, fontsReady, canStep, onStep, onCrop }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const photoRef = useRef<HTMLCanvasElement | null>(null);
  const anim = useRef({ dx: 0, alpha: 1, raf: 0 });
  const drag = useRef<DragState | null>(null);
  const lastDir = useRef<1 | -1>(1);
  const prevSlide = useRef<string | undefined>(undefined);

  const textRef = useRef(captionText);
  textRef.current = captionText;
  const posRef = useRef(position);
  posRef.current = position;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    drawFrame(ctx, photoRef.current, textRef.current, SCALE, {
      position: posRef.current,
      dx: anim.current.dx,
      alpha: anim.current.alpha,
    });
  }, []);

  // Photo layer: only re-rendered when crop / look / slide change.
  const slideId = slide?.id;
  const modified = slide?.modified;
  const zoom = slide?.crop.zoom;
  const fx = slide?.crop.fx;
  const fy = slide?.crop.fy;
  useEffect(() => {
    if (!slideId || zoom === undefined || fx === undefined || fy === undefined) {
      photoRef.current = null;
      draw();
      return;
    }
    const src = getSource(slideId);
    if (!src) {
      photoRef.current = null;
      draw();
      return;
    }
    photoRef.current = renderPhoto(src, { zoom, fx, fy }, look, SCALE, dateStampText(modified ?? Date.now()), photoRef.current ?? undefined);
    draw();
  }, [slideId, modified, zoom, fx, fy, look, fontsReady, draw]);

  // Caption enter animation when the selected caption changes.
  useEffect(() => {
    cancelAnimationFrame(anim.current.raf);
    const changedSlide = prevSlide.current !== slideId;
    prevSlide.current = slideId;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (changedSlide || reduce || !textRef.current) {
      anim.current.dx = 0;
      anim.current.alpha = 1;
      draw();
      return;
    }
    const from = -lastDir.current * 70;
    anim.current.dx = from;
    anim.current.alpha = 0;
    draw();
    const start = performance.now();
    const step = (now: number) => {
      const p = clamp((now - start) / 240, 0, 1);
      const e = 1 - Math.pow(1 - p, 3);
      anim.current.dx = from * (1 - e);
      anim.current.alpha = e;
      draw();
      if (p < 1) anim.current.raf = requestAnimationFrame(step);
    };
    anim.current.raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(anim.current.raf);
  }, [captionId, slideId, draw]);

  // Text edits or position changes: just repaint.
  useEffect(() => {
    draw();
  }, [captionText, position, fontsReady, draw]);

  const settle = useCallback(() => {
    cancelAnimationFrame(anim.current.raf);
    const from = anim.current.dx;
    const a0 = anim.current.alpha;
    const start = performance.now();
    const step = (now: number) => {
      const p = clamp((now - start) / 180, 0, 1);
      const e = 1 - Math.pow(1 - p, 3);
      anim.current.dx = from * (1 - e);
      anim.current.alpha = a0 + (1 - a0) * e;
      draw();
      if (p < 1) anim.current.raf = requestAnimationFrame(step);
    };
    anim.current.raf = requestAnimationFrame(step);
  }, [draw]);

  const toFrame = (px: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    return rect && rect.width ? px * (FRAME_W / rect.width) : px;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!slide) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    cancelAnimationFrame(anim.current.raf);
    drag.current = { x0: e.clientX, y0: e.clientY, t0: performance.now(), crop0: slide.crop, dx: 0 };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || !slide) return;
    const dx = toFrame(e.clientX - d.x0);
    const dy = toFrame(e.clientY - d.y0);
    if (tool === 'swipe') {
      d.dx = dx;
      anim.current.dx = clamp(dx, -420, 420);
      anim.current.alpha = 1 - Math.min(Math.abs(dx) / 700, 0.5);
      draw();
    } else {
      const src = getSource(slide.id);
      if (!src) return;
      const r = cropRect(src.width, src.height, d.crop0);
      onCrop({
        fx: r.ox > 0 ? clamp(d.crop0.fx - dx / (r.s * r.ox), 0, 1) : d.crop0.fx,
        fy: r.oy > 0 ? clamp(d.crop0.fy - dy / (r.s * r.oy), 0, 1) : d.crop0.fy,
      });
    }
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const d = drag.current;
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (!d || tool !== 'swipe') return;
    const dt = Math.max(performance.now() - d.t0, 1);
    const v = Math.abs(d.dx) / dt;
    const commit = !cancelled && canStep && (Math.abs(d.dx) > 110 || (Math.abs(d.dx) > 40 && v > 0.6));
    if (commit) {
      // Swipe right = next caption, swipe left = previous.
      const dir: 1 | -1 = d.dx > 0 ? 1 : -1;
      lastDir.current = dir;
      onStep(dir);
    } else {
      settle();
    }
  };

  return (
    <div
      className="stage"
      data-tool={tool}
      data-empty={slide ? 'false' : 'true'}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => endDrag(e, false)}
      onPointerCancel={(e) => endDrag(e, true)}
      role="img"
      aria-label={captionText ? `Frame with caption: ${captionText.replace(/\n/g, ' ')}` : 'Photo frame'}
    >
      <canvas
        ref={canvasRef}
        className="stage-canvas"
        width={Math.round(FRAME_W * SCALE)}
        height={Math.round(FRAME_H * SCALE)}
      />
    </div>
  );
}
