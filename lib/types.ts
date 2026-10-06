export type CaptionMode = 'mixed' | 'dialogue' | 'sounds';
export type CaptionPosition = 'over' | 'below';
export type PresetId = 'natural' | 'ccd' | 'faded' | 'disposable' | 'dusk';

export type Caption = {
  id: string;
  text: string;
  source: 'ai' | 'local' | 'custom';
};

export type Crop = { zoom: number; fx: number; fy: number };

export type Analysis = {
  tags: string[];
  brightness: number;
  saturation: number;
};

export type Slide = {
  id: string;
  name: string;
  url: string;
  width: number;
  height: number;
  modified: number;
  crop: Crop;
  captions: Caption[];
  selectedId: string | null;
  touched: boolean;
  analysis: Analysis;
  ai: 'idle' | 'pending' | 'done' | 'failed' | 'skipped';
};

export type Look = { preset: PresetId; intensity: number; dateStamp: boolean };

export type Settings = {
  mode: CaptionMode;
  position: CaptionPosition;
  look: Look;
  useAI: boolean;
  secondsPerPhoto: number;
};

export const DEFAULT_SETTINGS: Settings = {
  mode: 'mixed',
  position: 'over',
  look: { preset: 'ccd', intensity: 0.6, dateStamp: false },
  useAI: true,
  secondsPerPhoto: 2.6,
};
