'use client';

import type { Caption, CaptionMode, CaptionPosition, PresetId, Settings, Slide } from '@/lib/types';
import { PRESETS } from '@/lib/looks';
import { TAG_LABELS } from '@/lib/captions';
import { Row, Segmented, Slider, Switch } from './Controls';

type Props = {
  slide: Slide | null;
  captions: Caption[];
  selectedId: string | null;
  settings: Settings;
  provider: string | null | undefined;
  aiPaused: boolean;
  busy: boolean;
  exporting: { label: string; progress: number } | null;
  slideCount: number;
  onSelectCaption: (id: string) => void;
  onEditCaption: (text: string) => void;
  onMore: () => void;
  onMode: (m: CaptionMode) => void;
  onPosition: (p: CaptionPosition) => void;
  onPreset: (p: PresetId) => void;
  onIntensity: (v: number) => void;
  onDateStamp: (v: boolean) => void;
  onUseAI: (v: boolean) => void;
  onZoom: (v: number) => void;
  onSeconds: (v: number) => void;
  onDownloadFrame: () => void;
  onDownloadZip: () => void;
  onExportReel: () => void;
  onCancelExport: () => void;
};

const PROVIDER_NAMES: Record<string, string> = { gemini: 'Gemini', groq: 'Groq', xai: 'Grok' };

export default function Panel(p: Props) {
  const { slide, captions, selectedId, settings, provider, aiPaused, busy, exporting } = p;
  const selected = captions.find((c) => c.id === selectedId) ?? captions[0] ?? null;
  const tags = (slide?.analysis.tags ?? []).filter((t) => t !== 'any').slice(0, 3);
  const aiOn = settings.useAI && !!provider;

  let aiLine: string;
  if (provider === undefined) aiLine = 'Checking AI setup…';
  else if (!provider) aiLine = 'No API key found. Captions are matched on your device.';
  else if (!settings.useAI) aiLine = 'AI is off. Captions are matched on your device.';
  else if (aiPaused) aiLine = `${PROVIDER_NAMES[provider]} hit its limit. Using on-device matches for a minute.`;
  else if (slide?.ai === 'pending') aiLine = `${PROVIDER_NAMES[provider]} is reading this photo…`;
  else aiLine = `AI captions from ${PROVIDER_NAMES[provider]}.`;

  return (
    <div className="panel">
      <section className="group" aria-labelledby="h-captions">
        <h2 id="h-captions">Captions</h2>
        <p className="muted small status" aria-live="polite">{aiLine}</p>

        {slide && tags.length > 0 && (
          <p className="muted small">Matched to: {tags.map((t) => TAG_LABELS[t] ?? t).join(', ')}.</p>
        )}

        <div className="cap-list" role="radiogroup" aria-label="Caption options">
          {captions.map((c) => (
            <button key={c.id} className="cap" role="radio" aria-checked={c.id === selected?.id} data-on={c.id === selected?.id} onClick={() => p.onSelectCaption(c.id)}>
              <span className="cap-text">{c.text}</span>
              {c.source === 'ai' && <span className="chip">AI</span>}
              {c.source === 'custom' && <span className="chip">Edited</span>}
            </button>
          ))}
          {!captions.length && <p className="muted small">No captions yet. Add a photo to start.</p>}
        </div>

        <div className="btn-row">
          <button className="btn" onClick={p.onMore} disabled={!slide || busy}>
            {busy ? 'Writing…' : 'More captions'}
          </button>
        </div>

        <Row label="Edit caption" hint="Start each line with a dash">
          <textarea
            className="textarea"
            rows={3}
            value={selected?.text ?? ''}
            disabled={!selected}
            onChange={(e) => p.onEditCaption(e.target.value)}
            spellCheck={false}
          />
        </Row>

        <Row label="Caption style">
          <Segmented<CaptionMode>
            label="Caption style"
            value={settings.mode}
            onChange={p.onMode}
            options={[{ value: 'mixed', label: 'Mixed' }, { value: 'dialogue', label: 'Dialogue' }, { value: 'sounds', label: 'Sounds' }]}
          />
        </Row>

        <Row label="Use AI captions" hint={provider ? undefined : 'Add a key in .env.local'}>
          <Switch checked={aiOn} disabled={!provider} onChange={p.onUseAI} label="Use AI captions" />
        </Row>
      </section>

      <section className="group" aria-labelledby="h-look">
        <h2 id="h-look">Look</h2>
        <div className="presets" role="radiogroup" aria-label="Filter">
          {PRESETS.map((pr) => (
            <button key={pr.id} className="preset" role="radio" aria-checked={settings.look.preset === pr.id} data-on={settings.look.preset === pr.id} onClick={() => p.onPreset(pr.id)}>
              <span className="preset-name">{pr.name}</span>
              <span className="muted small">{pr.hint}</span>
            </button>
          ))}
        </div>
        <Row label="Strength">
          <Slider id="intensity" min={0} max={1} step={0.05} value={settings.look.intensity} onChange={p.onIntensity} format={(v) => `${Math.round(v * 100)}%`} />
        </Row>
        <Row label="Date stamp" hint="Orange digits, from the file date">
          <Switch checked={settings.look.dateStamp} onChange={p.onDateStamp} label="Date stamp" />
        </Row>
      </section>

      <section className="group" aria-labelledby="h-frame">
        <h2 id="h-frame">Frame</h2>
        <Row label="Caption position">
          <Segmented<CaptionPosition>
            label="Caption position"
            value={settings.position}
            onChange={p.onPosition}
            options={[{ value: 'over', label: 'On photo' }, { value: 'below', label: 'Below photo' }]}
          />
        </Row>
        <Row label="Zoom" hint="Applies to this photo">
          <Slider id="zoom" min={1} max={2.5} step={0.05} value={slide?.crop.zoom ?? 1} onChange={p.onZoom} format={(v) => `${v.toFixed(2)}×`} />
        </Row>
      </section>

      <section className="group" aria-labelledby="h-export">
        <h2 id="h-export">Export</h2>
        <Row label="Time per photo">
          <Slider id="seconds" min={1.2} max={6} step={0.2} value={settings.secondsPerPhoto} onChange={p.onSeconds} format={(v) => `${v.toFixed(1)}s`} />
        </Row>
        <div className="btn-stack">
          <button className="btn btn-primary" onClick={p.onExportReel} disabled={!p.slideCount || !!exporting}>Export reel video</button>
          <div className="btn-row">
            <button className="btn" onClick={p.onDownloadFrame} disabled={!slide || !!exporting}>Save this frame</button>
            <button className="btn" onClick={p.onDownloadZip} disabled={!p.slideCount || !!exporting}>Save all (.zip)</button>
          </div>
        </div>
        {exporting && (
          <div className="progress" role="status" aria-live="polite">
            <div className="progress-top">
              <span>{exporting.label}</span>
              {exporting.label.startsWith('Recording') && <button className="link" onClick={p.onCancelExport}>Cancel</button>}
            </div>
            <div className="progress-bar"><div style={{ width: `${Math.round(exporting.progress * 100)}%` }} /></div>
            {exporting.label.startsWith('Recording') && <p className="muted small">Keep this tab in front while the reel records.</p>}
          </div>
        )}
      </section>
    </div>
  );
}
