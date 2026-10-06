'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Slide } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/types';
import { setSource } from '@/lib/images';
import Stage from './Stage';

const SAMPLE_ID = 'sample-frame';
const SAMPLES = [
  '- Okay, look at that sky.\n- [shutter clicks]',
  '- [birds settling into the trees]',
  "- Quick, before it fades.\n- [cicadas fading]",
];

/** Paints a small dusk scene so the empty state shows the real renderer, not a mockup. */
function paintSample(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 1600;
  c.height = 1200;
  const ctx = c.getContext('2d')!;
  const sky = ctx.createLinearGradient(0, 0, 0, 1200);
  sky.addColorStop(0, '#6c6a9c');
  sky.addColorStop(0.45, '#c7a0bd');
  sky.addColorStop(0.72, '#efc3a6');
  sky.addColorStop(1, '#f3d9b8');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1600, 1200);
  ctx.fillStyle = '#17141f';
  const blobs: [number, number, number, number][] = [
    [1180, 820, 360, 200], [1400, 780, 300, 220], [980, 900, 280, 150], [1560, 880, 260, 200],
    [220, 880, 300, 160], [60, 840, 200, 180], [520, 960, 340, 120],
  ];
  blobs.forEach(([x, y, rx, ry]) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillRect(0, 930, 1600, 270);
  ctx.strokeStyle = '#17141f';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  const branch = (x: number, y: number, dx: number, dy: number) => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx, y + dy); ctx.stroke(); };
  branch(640, 940, 10, -330); branch(650, 760, -90, -120); branch(648, 700, 70, -110); branch(650, 820, 90, -70);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath(); ctx.arc(1010, 260, 7, 0, Math.PI * 2); ctx.fill();
  return c;
}

type Props = { onPick: () => void };

export default function EmptyState({ onPick }: Props) {
  const [ready, setReady] = useState(false);
  const [index, setIndex] = useState(0);
  const [interacted, setInteracted] = useState(false);

  useEffect(() => {
    setSource(SAMPLE_ID, paintSample());
    setReady(true);
  }, []);

  useEffect(() => {
    if (interacted) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % SAMPLES.length), 3200);
    return () => clearInterval(t);
  }, [interacted]);

  const fake: Slide | null = useMemo(
    () =>
      ready
        ? {
            id: SAMPLE_ID, name: 'sample', url: '', width: 1600, height: 1200, modified: new Date(2026, 9, 5).getTime(),
            crop: { zoom: 1, fx: 0.5, fy: 0.5 }, captions: [], selectedId: null, touched: false,
            analysis: { tags: [], brightness: 0.5, saturation: 0.3 }, ai: 'idle',
          }
        : null,
    [ready],
  );

  const step = (dir: 1 | -1) => {
    setInteracted(true);
    setIndex((i) => (i + dir + SAMPLES.length) % SAMPLES.length);
  };

  return (
    <section className="hero">
      <div className="hero-copy">
        <h1>Photos, with subtitles.</h1>
        <p className="lede">
          Drop in a few shots. Each one gets a 4:3 film frame and captions written for the scene, and you swipe to pick the line you like.
        </p>
        <div className="hero-actions">
          <button className="btn btn-primary btn-lg" onClick={onPick}>Choose photos</button>
          <span className="muted">or drop them anywhere on this page</span>
        </div>
        <ul className="hero-notes">
          <li>Any size or shape. Everything is cropped to the same frame.</li>
          <li>Photos stay in your browser. Only a small preview goes to the caption model.</li>
          <li>No API key? Captions are matched on your device instead.</li>
        </ul>
      </div>
      <div className="hero-stage">
        <Stage
          slide={fake}
          captionId={`s${index}`}
          captionText={SAMPLES[index]}
          look={DEFAULT_SETTINGS.look}
          position="over"
          tool="swipe"
          fontsReady
          canStep
          onStep={step}
          onCrop={() => {}}
        />
        <p className="muted hero-hint">Try swiping the frame to the right.</p>
      </div>
    </section>
  );
}
