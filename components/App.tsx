'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Crop, CaptionMode, Settings, Slide } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/types';
import { analyzeCanvas } from '@/lib/analyze';
import { localPicks } from '@/lib/captions';
import { dropSource, getSource, loadPhoto, makeAIImage } from '@/lib/images';
import { currentCaption, ensureMode, makeCaptions, mergeAI, visibleCaptions } from '@/lib/slides';
import { fetchAICaptions, fetchAIStatus } from '@/lib/ai';
import { canvasToBlob, exportReel, renderSlideToCanvas } from '@/lib/export';
import { baseName, downloadBlob, sleep } from '@/lib/utils';
import Stage, { type StageTool } from './Stage';
import Filmstrip from './Filmstrip';
import Panel from './Panel';
import EmptyState from './EmptyState';
import { Segmented } from './Controls';

const MAX_SLIDES = 24;
const COOLDOWN_MS = 60_000;

type Toast = { id: number; text: string };

export default function App() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [tool, setTool] = useState<StageTool>('swipe');
  const [provider, setProvider] = useState<string | null | undefined>(undefined);
  const [aiPaused, setAiPaused] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [fontsReady, setFontsReady] = useState(false);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [playing, setPlaying] = useState(false);
  const [exporting, setExporting] = useState<{ label: string; progress: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const fileInput = useRef<HTMLInputElement>(null);
  const slidesRef = useRef(slides);
  slidesRef.current = slides;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const providerRef = useRef(provider);
  providerRef.current = provider;
  const cooldownUntil = useRef(0);
  const lastWarn = useRef(0);
  const chain = useRef<Promise<void>>(Promise.resolve());
  const exportToken = useRef({ cancelled: false });
  const toastId = useRef(0);

  const toast = useCallback((text: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5200);
  }, []);

  // Fonts + AI status on mount
  useEffect(() => {
    Promise.all([
      document.fonts.load('400 38px "Courier Prime"', '- [abc] “”’'),
      document.fonts.load('700 34px "Courier Prime"', "'26 10 05"),
    ]).catch(() => {}).finally(() => setFontsReady(true));
    fetchAIStatus().then(setProvider);
  }, []);

  const patchSlide = useCallback((id: string, fn: (s: Slide) => Slide) => {
    setSlides((prev) => prev.map((s) => (s.id === id ? fn(s) : s)));
  }, []);

  /* ---------- AI queue (serial, with cooldown + local fallback) ---------- */
  const runAI = useCallback(async (id: string, more = false): Promise<boolean> => {
    const s = slidesRef.current.find((x) => x.id === id);
    if (!s) return false;
    const st = settingsRef.current;
    if (!st.useAI || !providerRef.current || Date.now() < cooldownUntil.current) {
      patchSlide(id, (x) => ({ ...x, ai: 'skipped' }));
      return false;
    }
    const src = getSource(id);
    if (!src) return false;
    patchSlide(id, (x) => ({ ...x, ai: 'pending' }));
    const avoid = more ? s.captions.map((c) => c.text).slice(-12) : [];
    const res = await fetchAICaptions(makeAIImage(src), st.mode, avoid);
    if (res.ok) {
      patchSlide(id, (x) => mergeAI(x, res.captions, settingsRef.current.mode, more ? 'end' : 'front', more || !x.touched));
      return true;
    }
    patchSlide(id, (x) => ({ ...x, ai: 'failed' }));
    if (res.reason === 'rate_limited') {
      cooldownUntil.current = Date.now() + COOLDOWN_MS;
      setAiPaused(true);
      setTimeout(() => setAiPaused(false), COOLDOWN_MS);
      if (Date.now() - lastWarn.current > 30_000) {
        lastWarn.current = Date.now();
        toast('AI limit reached. Captions are matched on your device for the next minute.');
      }
    } else if (res.reason === 'no_key') {
      setProvider(null);
    } else if (Date.now() - lastWarn.current > 30_000) {
      lastWarn.current = Date.now();
      toast(res.reason === 'auth' ? 'The AI key was rejected. Check .env.local. Using on-device captions.' : 'AI captions are unavailable right now. Using on-device matches.');
    }
    return false;
  }, [patchSlide, toast]);

  const queueAI = useCallback((id: string) => {
    chain.current = chain.current.then(async () => { await runAI(id); await sleep(450); }).catch(() => {});
  }, [runAI]);

  /* ---------- add / remove / reorder ---------- */
  const addFiles = useCallback(async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (!images.length) {
      toast('Those files aren’t images. Try JPG, PNG, or WebP.');
      return;
    }
    const room = MAX_SLIDES - slidesRef.current.length;
    if (room <= 0) { toast(`The roll holds up to ${MAX_SLIDES} photos. Remove one to add more.`); return; }
    if (images.length > room) toast(`Added ${room} of ${images.length}. The roll holds up to ${MAX_SLIDES} photos.`);
    const added: string[] = [];
    for (const file of images.slice(0, room)) {
      try {
        const p = await loadPhoto(file);
        const analysis = analyzeCanvas(p.canvas);
        const captions = makeCaptions(localPicks(analysis.tags, settingsRef.current.mode, new Set(), 6), 'local');
        const slide: Slide = {
          id: p.id, name: file.name, url: p.url, width: p.width, height: p.height,
          modified: file.lastModified || Date.now(),
          crop: { zoom: 1, fx: 0.5, fy: p.height > p.width ? 0.35 : 0.5 },
          captions, selectedId: captions[0]?.id ?? null, touched: false, analysis, ai: 'idle',
        };
        setSlides((prev) => [...prev, slide]);
        if (!added.length) setActiveId(slide.id);
        added.push(slide.id);
      } catch {
        toast(`Couldn’t read ${file.name}. Try a JPG, PNG, or WebP.`);
      }
    }
    added.forEach(queueAI);
  }, [queueAI, toast]);

  const removeSlide = useCallback((id: string) => {
    const list = slidesRef.current;
    const i = list.findIndex((s) => s.id === id);
    const target = list[i];
    if (!target) return;
    URL.revokeObjectURL(target.url);
    dropSource(id);
    const next = list.filter((s) => s.id !== id);
    setSlides(next);
    setActiveId((cur) => (cur === id ? next[Math.min(i, next.length - 1)]?.id ?? null : cur));
  }, []);

  /* ---------- derived ---------- */
  const active = useMemo(() => slides.find((s) => s.id === activeId) ?? slides[0] ?? null, [slides, activeId]);
  const visible = useMemo(() => (active ? visibleCaptions(active, settings.mode) : []), [active, settings.mode]);
  const selected = useMemo(() => currentCaption(active, settings.mode), [active, settings.mode]);

  /* ---------- caption actions ---------- */
  const stepCaption = useCallback((dir: 1 | -1) => {
    const s = slidesRef.current.find((x) => x.id === (activeIdRef.current ?? slidesRef.current[0]?.id));
    if (!s) return;
    const list = visibleCaptions(s, settingsRef.current.mode);
    if (list.length < 2) return;
    const cur = Math.max(0, list.findIndex((c) => c.id === s.selectedId));
    const next = list[(cur + dir + list.length) % list.length];
    patchSlide(s.id, (x) => ({ ...x, selectedId: next.id, touched: true }));
  }, [patchSlide]);
  const activeIdRef = useRef<string | null>(null);
  activeIdRef.current = active?.id ?? null;

  const selectCaption = (id: string) => active && patchSlide(active.id, (x) => ({ ...x, selectedId: id, touched: true }));

  const editCaption = (text: string) => {
    if (!active || !selected) return;
    patchSlide(active.id, (x) => ({
      ...x, touched: true,
      captions: x.captions.map((c) => (c.id === selected.id ? { ...c, text, source: 'custom' as const } : c)),
    }));
  };

  const moreCaptions = async () => {
    if (!active) return;
    const id = active.id;
    setBusy((b) => new Set(b).add(id));
    const ok = await new Promise<boolean>((resolve) => {
      chain.current = chain.current.then(async () => { resolve(await runAI(id, true)); await sleep(300); }).catch(() => resolve(false));
    });
    if (!ok) {
      const s = slidesRef.current.find((x) => x.id === id);
      if (s) {
        const texts = localPicks(s.analysis.tags, settingsRef.current.mode, new Set(s.captions.map((c) => c.text)), 5);
        if (!texts.length) toast('No more matches for this photo. Edit a caption to make it yours.');
        else {
          const fresh = makeCaptions(texts, 'local');
          patchSlide(id, (x) => ({ ...x, captions: [...x.captions, ...fresh], selectedId: fresh[0].id, touched: true }));
        }
      }
    }
    setBusy((b) => { const n = new Set(b); n.delete(id); return n; });
  };

  const setMode = (mode: CaptionMode) => {
    setSettings((s) => ({ ...s, mode }));
    setSlides((prev) => prev.map((s) => ensureMode(s, mode)));
  };

  const setCrop = useCallback((crop: Partial<Crop>) => {
    const id = activeIdRef.current;
    if (id) patchSlide(id, (x) => ({ ...x, crop: { ...x.crop, ...crop } }));
  }, [patchSlide]);

  /* ---------- keyboard, drag-and-drop, playback ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); stepCaption(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); stepCaption(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stepCaption]);

  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types?.includes('Files');
    const enter = (e: DragEvent) => { if (hasFiles(e)) { depth++; setDragOver(true); } };
    const leave = (e: DragEvent) => { if (hasFiles(e)) { depth = Math.max(0, depth - 1); if (!depth) setDragOver(false); } };
    const over = (e: DragEvent) => { if (hasFiles(e)) e.preventDefault(); };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault(); depth = 0; setDragOver(false);
      addFiles(Array.from(e.dataTransfer?.files ?? []));
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragleave', leave);
    window.addEventListener('dragover', over);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('dragover', over);
      window.removeEventListener('drop', drop);
    };
  }, [addFiles]);

  useEffect(() => {
    if (!playing || slides.length < 2) return;
    const t = setInterval(() => {
      setActiveId((cur) => {
        const list = slidesRef.current;
        const i = list.findIndex((s) => s.id === cur);
        return list[(i + 1) % list.length].id;
      });
    }, settings.secondsPerPhoto * 1000);
    return () => clearInterval(t);
  }, [playing, slides.length, settings.secondsPerPhoto]);

  /* ---------- exports ---------- */
  const downloadFrame = async () => {
    if (!active) return;
    const blob = await canvasToBlob(renderSlideToCanvas(active, settings, 1));
    downloadBlob(blob, `${baseName(active.name)}-frame.png`);
  };

  const downloadZip = async () => {
    const list = slidesRef.current;
    if (!list.length) return;
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      for (let i = 0; i < list.length; i++) {
        setExporting({ label: `Rendering frame ${i + 1} of ${list.length}`, progress: i / list.length });
        const blob = await canvasToBlob(renderSlideToCanvas(list[i], settings, 1));
        zip.file(`${String(i + 1).padStart(2, '0')}-${baseName(list[i].name)}.png`, blob);
        await sleep(0);
      }
      setExporting({ label: 'Zipping', progress: 0.98 });
      downloadBlob(await zip.generateAsync({ type: 'blob' }), 'shutter-clicks-frames.zip');
    } catch {
      toast('Couldn’t build the zip. Try fewer photos.');
    } finally {
      setExporting(null);
    }
  };

  const startReel = async () => {
    const list = slidesRef.current;
    if (!list.length) return;
    setPlaying(false);
    exportToken.current = { cancelled: false };
    setExporting({ label: 'Recording reel', progress: 0 });
    try {
      const { blob, ext } = await exportReel(list, settings, (progress) => setExporting({ label: 'Recording reel', progress }), exportToken.current);
      downloadBlob(blob, `shutter-clicks-reel.${ext}`);
      toast(ext === 'webm' ? 'Reel saved as WebM. Convert to MP4 if Instagram won’t take it.' : 'Reel saved.');
    } catch (e) {
      if (!(e instanceof Error && e.message === 'cancelled')) toast(e instanceof Error ? e.message : 'Couldn’t record the reel.');
    } finally {
      setExporting(null);
    }
  };

  /* ---------- render ---------- */
  const hasSlides = slides.length > 0;
  const stepIndex = visible.findIndex((c) => c.id === selected?.id);

  return (
    <div className="app">
      <header className="top">
        <a className="brand" href="/" aria-label="Shutter Clicks">[shutter clicks]</a>
        <div className="top-actions">
          {hasSlides && slides.length > 1 && (
            <button className="btn btn-quiet" onClick={() => setPlaying((p) => !p)} aria-pressed={playing}>
              {playing ? 'Pause preview' : 'Play preview'}
            </button>
          )}
          <button className="btn" onClick={() => fileInput.current?.click()}>{hasSlides ? 'Add photos' : 'Choose photos'}</button>
        </div>
        <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
      </header>

      {!hasSlides ? (
        <main className="main-empty"><EmptyState onPick={() => fileInput.current?.click()} /></main>
      ) : (
        <main className="workspace">
          <div className="stage-col">
            <Stage
              slide={active}
              captionId={selected?.id ?? null}
              captionText={selected?.text ?? null}
              look={settings.look}
              position={settings.position}
              tool={tool}
              fontsReady={fontsReady}
              canStep={visible.length > 1}
              onStep={stepCaption}
              onCrop={setCrop}
            />

            <div className="pager" aria-label="Caption pager">
              <button className="icon-btn" onClick={() => stepCaption(-1)} disabled={visible.length < 2} aria-label="Previous caption">
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <div className="dots" role="presentation">
                {visible.slice(0, 9).map((c, i) => (
                  <button key={c.id} className="dot" data-on={i === stepIndex} onClick={() => selectCaption(c.id)} aria-label={`Caption ${i + 1} of ${visible.length}`} />
                ))}
              </div>
              <button className="icon-btn" onClick={() => stepCaption(1)} disabled={visible.length < 2} aria-label="Next caption">
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>

            <Segmented<StageTool>
              label="Drag action"
              value={tool}
              onChange={setTool}
              options={[{ value: 'swipe', label: 'Swipe captions' }, { value: 'move', label: 'Move photo' }]}
            />

            <Filmstrip
              slides={slides}
              activeId={active?.id ?? null}
              onSelect={setActiveId}
              onRemove={removeSlide}
              onReorder={setSlides}
              onAdd={() => fileInput.current?.click()}
            />
          </div>

          <Panel
            slide={active}
            captions={visible}
            selectedId={selected?.id ?? null}
            settings={settings}
            provider={provider}
            aiPaused={aiPaused}
            busy={!!active && busy.has(active.id)}
            exporting={exporting}
            slideCount={slides.length}
            onSelectCaption={selectCaption}
            onEditCaption={editCaption}
            onMore={moreCaptions}
            onMode={setMode}
            onPosition={(position) => setSettings((s) => ({ ...s, position }))}
            onPreset={(preset) => setSettings((s) => ({ ...s, look: { ...s.look, preset } }))}
            onIntensity={(intensity) => setSettings((s) => ({ ...s, look: { ...s.look, intensity } }))}
            onDateStamp={(dateStamp) => setSettings((s) => ({ ...s, look: { ...s.look, dateStamp } }))}
            onUseAI={(useAI) => setSettings((s) => ({ ...s, useAI }))}
            onZoom={(zoom) => setCrop({ zoom })}
            onSeconds={(secondsPerPhoto) => setSettings((s) => ({ ...s, secondsPerPhoto }))}
            onDownloadFrame={downloadFrame}
            onDownloadZip={downloadZip}
            onExportReel={startReel}
            onCancelExport={() => { exportToken.current.cancelled = true; }}
          />
        </main>
      )}

      {dragOver && (
        <div className="drop-overlay" aria-hidden="true"><p>Drop photos to add them</p></div>
      )}

      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => <p key={t.id} className="toast">{t.text}</p>)}
      </div>
    </div>
  );
}
