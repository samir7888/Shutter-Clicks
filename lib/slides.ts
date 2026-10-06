import type { Caption, CaptionMode, Slide } from './types';
import { modeMatches } from './captionText';
import { localPicks } from './captions';
import { uid } from './utils';

export const makeCaptions = (texts: string[], source: Caption['source']): Caption[] =>
  texts.map((text) => ({ id: uid(), text, source }));

export function visibleCaptions(slide: Slide, mode: CaptionMode): Caption[] {
  return slide.captions.filter((c) => c.source === 'custom' || modeMatches(c.text, mode));
}

export function currentCaption(slide: Slide | null, mode: CaptionMode): Caption | null {
  if (!slide) return null;
  const list = visibleCaptions(slide, mode);
  return list.find((c) => c.id === slide.selectedId) ?? list[0] ?? null;
}

/** After a style change: top up with on-device captions so the list is never empty. */
export function ensureMode(slide: Slide, mode: CaptionMode): Slide {
  let next = slide;
  if (visibleCaptions(next, mode).length < 5) {
    const have = new Set(next.captions.map((c) => c.text));
    const need = 5 - visibleCaptions(next, mode).length;
    const extra = makeCaptions(localPicks(next.analysis.tags, mode, have, need), 'local');
    next = { ...next, captions: [...next.captions, ...extra] };
  }
  const list = visibleCaptions(next, mode);
  if (list.length && !list.some((c) => c.id === next.selectedId)) {
    next = { ...next, selectedId: list[0].id };
  }
  return next;
}

export function mergeAI(
  slide: Slide,
  texts: string[],
  mode: CaptionMode,
  place: 'front' | 'end',
  select: boolean,
): Slide {
  const have = new Set(slide.captions.map((c) => c.text));
  const fresh = makeCaptions(texts.filter((t) => !have.has(t)), 'ai');
  if (!fresh.length) return { ...slide, ai: 'done' };
  const captions = place === 'front' ? [...fresh, ...slide.captions] : [...slide.captions, ...fresh];
  const firstVisible = fresh.find((c) => modeMatches(c.text, mode));
  return {
    ...slide,
    captions,
    ai: 'done',
    selectedId: select && firstVisible ? firstVisible.id : slide.selectedId,
  };
}
