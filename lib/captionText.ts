import type { CaptionMode } from './types';

export type CaptionKind = 'dialogue' | 'sound' | 'mixed';

const isSoundLine = (l: string) => /^-?\s*\[.*\]$/.test(l.trim());

export function kindOf(text: string): CaptionKind {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return 'dialogue';
  const sounds = lines.filter(isSoundLine).length;
  if (sounds === 0) return 'dialogue';
  if (sounds === lines.length) return 'sound';
  return 'mixed';
}

export function modeMatches(text: string, mode: CaptionMode): boolean {
  if (mode === 'mixed') return true;
  const k = kindOf(text);
  return mode === 'dialogue' ? k === 'dialogue' : k === 'sound';
}

/** Cleans up a raw model string into the "- line\n- [cue]" format, or null if unusable. */
export function normalizeCaption(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const lines = raw
    .replace(/\r/g, '')
    .split(/\n|\\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 2);
  if (!lines.length) return null;
  const out: string[] = [];
  for (const l of lines) {
    const t = l.replace(/^[-–—•*]\s*/, '').replace(/\s+/g, ' ').trim();
    if (!t || t.length > 90) return null;
    out.push(`- ${t}`);
  }
  return out.join('\n');
}
