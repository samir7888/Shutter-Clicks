import type { CaptionMode } from './types';

export type AIResult =
  | { ok: true; captions: string[]; provider: string }
  | { ok: false; reason: 'no_key' | 'rate_limited' | 'auth' | 'bad_response' | 'error' | 'network' };

export async function fetchAIStatus(): Promise<string | null> {
  try {
    const res = await fetch('/api/caption', { cache: 'no-store' });
    const json = await res.json();
    return json.provider ?? null;
  } catch {
    return null;
  }
}

export async function fetchAICaptions(image: string, mode: CaptionMode, avoid: string[]): Promise<AIResult> {
  try {
    const res = await fetch('/api/caption', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, mode, avoid }),
    });
    return (await res.json()) as AIResult;
  } catch {
    return { ok: false, reason: 'network' };
  }
}
