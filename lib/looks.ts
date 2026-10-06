import type { Look, PresetId } from './types';

export type LookParams = {
  contrast: number;
  brightness: number;
  saturation: number;
  fade: number;
  tint: [number, number, number];
  grain: number;
  vignette: number;
  soften: number;
};

export const NEUTRAL: LookParams = {
  contrast: 1,
  brightness: 0,
  saturation: 1,
  fade: 0,
  tint: [0, 0, 0],
  grain: 0,
  vignette: 0,
  soften: 0,
};

export const PRESETS: { id: PresetId; name: string; hint: string; params: LookParams }[] = [
  { id: 'natural', name: 'Natural', hint: 'No filter', params: NEUTRAL },
  {
    id: 'ccd',
    name: 'Soft CCD',
    hint: 'Clean, a little cool, slightly soft',
    params: { contrast: 1.06, brightness: 6, saturation: 1.15, fade: 0.06, tint: [0, 3, 7], grain: 0.05, vignette: 0.12, soften: 0.4 },
  },
  {
    id: 'faded',
    name: 'Faded roll',
    hint: 'Lifted blacks, warm cast',
    params: { contrast: 0.92, brightness: 4, saturation: 0.85, fade: 0.17, tint: [7, 4, 0], grain: 0.08, vignette: 0.15, soften: 0.15 },
  },
  {
    id: 'disposable',
    name: 'Disposable',
    hint: 'Punchy, flash falloff',
    params: { contrast: 1.18, brightness: 2, saturation: 1.1, fade: 0.08, tint: [10, 4, -6], grain: 0.14, vignette: 0.3, soften: 0.2 },
  },
  {
    id: 'dusk',
    name: 'Cool dusk',
    hint: 'Blue shadows',
    params: { contrast: 1.05, brightness: -2, saturation: 0.95, fade: 0.1, tint: [-4, 2, 10], grain: 0.07, vignette: 0.2, soften: 0.2 },
  },
];

export function lookParams(look: Look): LookParams {
  const preset = PRESETS.find((p) => p.id === look.preset) ?? PRESETS[0];
  if (preset.id === 'natural') return NEUTRAL;
  const k = look.intensity;
  const p = preset.params;
  const mix = (a: number, b: number) => a + (b - a) * k;
  return {
    contrast: mix(NEUTRAL.contrast, p.contrast),
    brightness: mix(NEUTRAL.brightness, p.brightness),
    saturation: mix(NEUTRAL.saturation, p.saturation),
    fade: mix(NEUTRAL.fade, p.fade),
    tint: [mix(0, p.tint[0]), mix(0, p.tint[1]), mix(0, p.tint[2])],
    grain: mix(0, p.grain),
    vignette: mix(0, p.vignette),
    soften: mix(0, p.soften),
  };
}
