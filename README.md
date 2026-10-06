# Shutter Clicks

Turn any photos into film-style frames with swipeable subtitles.

- Any photo size is cropped to a **4:3 frame** inside a **9:16 black canvas** (the reel look).
- Optional light digicam looks: Soft CCD, Faded roll, Disposable, Cool dusk, plus an orange date stamp.
- Captions are written in **SDH style**: spoken lines (`- I think this is peace.`) and sound cues (`- [deep exhale]`).
- **Swipe the frame to the right for the next caption**, to the left for the previous one. Arrow keys work too.
- Export a single PNG, a ZIP of all frames, or a **reel video** (MP4 where the browser supports it, otherwise WebM).

## Run it

```bash
npm install
cp .env.local.example .env.local   # optional: add an API key
npm run dev
```

Open http://localhost:3000. Requires Node 18.18 or newer.

## Captions: AI + on-device fallback

The app works with **no key at all**. It reads each photo's colours and light on your device
(night, dusk, golden light, sky, greenery, water, soft light, strong shadows, a person...)
and picks the best-matching captions from a built-in bank of about 80.

To get captions written by a vision model, add **one** key to `.env.local`:

| Provider | Key | Notes |
| --- | --- | --- |
| Google Gemini (recommended) | `GEMINI_API_KEY` | Free key at https://aistudio.google.com/apikey. Default model `gemini-3.1-flash-lite`. |
| Groq | `GROQ_API_KEY` | Free tier. Set `GROQ_MODEL` to a vision model listed at console.groq.com/docs/models. |
| xAI Grok | `XAI_API_KEY` | Set `XAI_MODEL` to a vision-capable Grok model. xAI's free access varies, so check their pricing page. |

Model names get retired often (Gemini 2.5 shuts down 16 Oct 2026, Groq retired Llama 4 Scout in June 2026),
so if AI captions stop working, change the `*_MODEL` value first. Keys stay on the server
(`app/api/caption/route.ts`) and are never sent to the browser.

### What happens when the free limit is hit

- Every photo gets on-device captions **instantly**, before any AI call.
- AI captions are requested one photo at a time and merged in front when they arrive.
- On a rate limit (HTTP 429), AI pauses for 60 seconds and the app keeps working with on-device matches.
  A short notice explains why. "More captions" also falls back to the on-device bank.
- Only a small 640px JPEG preview is sent to the model. The full photo never leaves your browser.

## How it's organised

```
app/api/caption/route.ts   LLM proxy (Gemini / Groq / xAI) with normalising + error mapping
components/Stage.tsx       canvas preview, swipe + move gestures, caption animation
components/Panel.tsx       captions, look, frame, export controls
components/App.tsx         state, AI queue + fallback, keyboard, drag and drop, export
lib/render.ts              crop math, filter pixel pass, caption drawing (preview == export)
lib/looks.ts               filter presets (tweak the numbers to taste)
lib/captions.ts            on-device caption bank + matching
lib/analyze.ts             on-device scene analysis (colour/light heuristics)
lib/export.ts              PNG, ZIP and reel recording
```

Preview and export use the same renderer, so what you see is what you save.

## Tips

- **Edit the bank**: add your own lines to `BANK` in `lib/captions.ts` with the scene tags they suit.
- **Tune the look**: change numbers in `PRESETS` in `lib/looks.ts`. Lower "Strength" for a subtler result.
- **Reel recording** runs in real time. Keep the tab in front until it finishes.
- iPhone HEIC photos only load in Safari. In other browsers, export them as JPG first.
