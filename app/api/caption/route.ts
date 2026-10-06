import { NextResponse } from 'next/server';
import { normalizeCaption } from '@/lib/captionText';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Provider = 'gemini' | 'groq' | 'xai';
type Reason = 'no_key' | 'rate_limited' | 'auth' | 'bad_response' | 'error';

class LLMError extends Error {
  constructor(public reason: Reason, message?: string) {
    super(message ?? reason);
  }
}

function pickProvider(): Provider | null {
  const has = {
    gemini: !!process.env.GEMINI_API_KEY,
    groq: !!process.env.GROQ_API_KEY,
    xai: !!process.env.XAI_API_KEY,
  };
  const forced = process.env.LLM_PROVIDER?.toLowerCase();
  if ((forced === 'gemini' || forced === 'groq' || forced === 'xai') && has[forced]) return forced;
  if (has.gemini) return 'gemini';
  if (has.groq) return 'groq';
  if (has.xai) return 'xai';
  return null;
}

export async function GET() {
  return NextResponse.json({ provider: pickProvider() });
}

function buildPrompt(mode: string, avoid: string[]): string {
  const modeRule =
    mode === 'dialogue'
      ? 'Every option is spoken dialogue only. Do not use square brackets.'
      : mode === 'sounds'
        ? 'Every option is sound cues only, each line wrapped in [square brackets].'
        : 'Mix it up: some options are one spoken line plus a sound cue, some are only a sound cue, some are only a spoken line.';
  const avoidRule = avoid.length
    ? `Do not repeat or closely paraphrase any of these existing captions:\n${avoid.map((a) => a.replace(/\n/g, ' / ')).join('\n')}`
    : '';
  return `You write closed captions (SDH style) for a single photo, as if it were a frame from a quiet indie film.

Look at the photo, then write 5 different caption options.

Format rules:
- Each option is 1 or 2 lines. Every line starts with "- ".
- A line is either a short spoken line (ordinary, intimate, never a literal description of the image) or a sound cue in [square brackets] naming sounds that would plausibly exist in this exact scene.
- Max 12 words per line. Sound cues are lowercase. No emojis, no hashtags, no names of people or places.
- Vary the tone: tender, wistful, funny, hushed.
${modeRule}
${avoidRule}

Return ONLY JSON, no markdown fences: {"captions": ["- spoken line\\n- [sound cue]", "- [sound cue]"]}`;
}

function parseCaptions(text: string): string[] {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return [];
  let arr: unknown[] = [];
  try {
    const obj = JSON.parse(text.slice(start, end + 1));
    arr = Array.isArray(obj.captions) ? obj.captions : [];
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const raw of arr) {
    const n = normalizeCaption(raw);
    if (n && !out.includes(n)) out.push(n);
  }
  return out.slice(0, 6);
}

async function http(url: string, init: RequestInit): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25_000);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      if (res.status === 429 || /quota|RESOURCE_EXHAUSTED|rate.?limit/i.test(body)) throw new LLMError('rate_limited', body.slice(0, 200));
      if (res.status === 401 || res.status === 403) throw new LLMError('auth', body.slice(0, 200));
      throw new LLMError('error', `${res.status} ${body.slice(0, 200)}`);
    }
    return await res.json();
  } catch (e) {
    if (e instanceof LLMError) throw e;
    throw new LLMError('error', e instanceof Error ? e.message : 'request failed');
  } finally {
    clearTimeout(timer);
  }
}

async function callGemini(prompt: string, dataUrl: string): Promise<string> {
  const [meta, b64] = dataUrl.split(',');
  const mime = meta.match(/data:(.*?);base64/)?.[1] ?? 'image/jpeg';
  const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
  const json = (await http(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY! },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mime, data: b64 } }] }],
      generationConfig: { temperature: 1, responseMimeType: 'application/json' },
    }),
  })) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
}

async function callOpenAICompat(url: string, key: string, model: string, prompt: string, dataUrl: string): Promise<string> {
  const json = (await http(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 1,
      max_tokens: 600,
      messages: [
        { role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: dataUrl } }] },
      ],
    }),
  })) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? '';
}

export async function POST(req: Request) {
  let body: { image?: unknown; mode?: unknown; avoid?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: 'error' }, { status: 400 });
  }
  const image = typeof body.image === 'string' ? body.image : '';
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(image) || image.length > 2_500_000) {
    return NextResponse.json({ ok: false, reason: 'error' }, { status: 400 });
  }
  const mode = body.mode === 'dialogue' || body.mode === 'sounds' ? body.mode : 'mixed';
  const avoid = Array.isArray(body.avoid) ? body.avoid.filter((a): a is string => typeof a === 'string').slice(0, 14) : [];

  const provider = pickProvider();
  if (!provider) return NextResponse.json({ ok: false, reason: 'no_key' });

  const prompt = buildPrompt(mode, avoid);
  try {
    let text = '';
    if (provider === 'gemini') text = await callGemini(prompt, image);
    else if (provider === 'groq')
      text = await callOpenAICompat('https://api.groq.com/openai/v1/chat/completions', process.env.GROQ_API_KEY!, process.env.GROQ_MODEL || 'qwen/qwen3.6-27b', prompt, image);
    else
      text = await callOpenAICompat('https://api.x.ai/v1/chat/completions', process.env.XAI_API_KEY!, process.env.XAI_MODEL || 'grok-4', prompt, image);

    const captions = parseCaptions(text);
    if (captions.length < 2) return NextResponse.json({ ok: false, reason: 'bad_response' });
    return NextResponse.json({ ok: true, captions, provider });
  } catch (e) {
    const reason: Reason = e instanceof LLMError ? e.reason : 'error';
    if (process.env.NODE_ENV !== 'production') console.warn(`[caption] ${provider} failed: ${reason}`, e instanceof Error ? e.message : '');
    return NextResponse.json({ ok: false, reason });
  }
}
