import type { CaptionMode } from './types';
import { modeMatches } from './captionText';

type Entry = { t: string; tags: string[] };

/**
 * On-device caption bank. Each entry is tagged with the scene types it suits.
 * Tags come from lib/analyze.ts: night, dusk, golden, sky, green, water, soft,
 * shadow, people, warm, cool, bright, any.
 */
const BANK: Entry[] = [
  // night
  { t: '- [crickets chirping in the dark]', tags: ['night'] },
  { t: "- It's so quiet out here.\n- [distant dog barking]", tags: ['night'] },
  { t: '- [soft footsteps on gravel]', tags: ['night'] },
  { t: '- Did you hear that?', tags: ['night'] },
  { t: '- [a porch light buzzes]', tags: ['night'] },
  { t: "- Stay a little longer.\n- [night air, faint cicadas]", tags: ['night', 'people'] },
  { t: '- [low hum of a streetlight]', tags: ['night'] },
  { t: "- I don't want tonight to end.", tags: ['night'] },
  { t: '- Shh, you\'ll wake the whole street.\n- [quiet laughter]', tags: ['night', 'people'] },

  // dusk
  { t: '- [birds settling into the trees]', tags: ['dusk'] },
  { t: '- Okay, look at that sky.\n- [shutter clicks]', tags: ['dusk', 'sky'] },
  { t: '- Quick, before it fades.', tags: ['dusk', 'golden'] },
  { t: '- [distant traffic, a long exhale]', tags: ['dusk'] },
  { t: "- The day's almost over.\n- [cicadas fading]", tags: ['dusk'] },
  { t: '- [evening wind through the branches]', tags: ['dusk', 'green'] },
  { t: '- Is this colour even real?', tags: ['dusk', 'sky'] },
  { t: '- [a phone camera clicks, twice]', tags: ['dusk'] },

  // golden hour
  { t: '- [warm light, a slow breath]', tags: ['golden'] },
  { t: "- This is the good hour.\n- [shutter clicks]", tags: ['golden'] },
  { t: '- [low sun, someone laughing nearby]', tags: ['golden', 'people'] },
  { t: "- Hold still, the light's perfect.", tags: ['golden', 'people'] },
  { t: '- [afternoon quiet, a distant radio]', tags: ['golden', 'warm'] },
  { t: '- Everything looks softer right now.', tags: ['golden'] },

  // sky
  { t: '- [wind brushing past the wires]', tags: ['sky'] },
  { t: '- Look up.\n- [birds overhead]', tags: ['sky'] },
  { t: '- [a plane drones far above]', tags: ['sky'] },
  { t: "- It's so blue today.", tags: ['sky', 'bright'] },
  { t: '- [soft breeze, clouds drifting]', tags: ['sky', 'soft'] },
  { t: '- Tilt your head back. Just look.', tags: ['sky'] },

  // greenery / flowers
  { t: '- [leaves rustling in the breeze]', tags: ['green'] },
  { t: '- [wind moving through tall grass]', tags: ['green'] },
  { t: '- Come see this one.\n- [bees humming]', tags: ['green'] },
  { t: "- It's tiny, but it's perfect.", tags: ['green'] },
  { t: '- [birdsong, somewhere close]', tags: ['green'] },
  { t: '- Smells like rain and soil out here.', tags: ['green', 'soft'] },
  { t: '- [a branch creaks, then stillness]', tags: ['green'] },

  // water
  { t: '- [waves rolling in, gulls calling]', tags: ['water'] },
  { t: '- [water lapping at the shore]', tags: ['water'] },
  { t: "- Feel how cold it is!\n- [laughter in the distance]", tags: ['water', 'people'] },
  { t: '- [sea wind, barefoot steps on wet sand]', tags: ['water'] },
  { t: '- I could stay here all day.', tags: ['water'] },
  { t: '- [tide pulling back, slow and steady]', tags: ['water', 'soft'] },
  { t: '- Look how far the water goes.', tags: ['water', 'cool'] },

  // soft / overcast
  { t: '- [muffled quiet, an overcast hush]', tags: ['soft'] },
  { t: "- It's one of those slow days.", tags: ['soft'] },
  { t: '- [soft wind, someone humming]', tags: ['soft'] },
  { t: "- Nothing's happening, and it's perfect.\n- [quiet exhale]", tags: ['soft'] },
  { t: '- [slow footsteps, a distant bell]', tags: ['soft'] },
  { t: '- Let\'s not go back yet.', tags: ['soft'] },

  // shadow / high contrast / interiors
  { t: '- [engine idling, light flickering through the window]', tags: ['shadow'] },
  { t: "- Weirdly, this is my favourite part of the day.\n- [soft engine hum]", tags: ['shadow'] },
  { t: '- [tires humming on the road]', tags: ['shadow'] },
  { t: "- Don't move. The light's doing something.\n- [shutter clicks]", tags: ['shadow', 'people'] },
  { t: '- [seatbelt clicks, quiet settles in]', tags: ['shadow'] },
  { t: '- Nobody say anything for a minute.', tags: ['shadow'] },

  // people
  { t: "- Wait, don't look at the camera.\n- [shutter clicks]", tags: ['people'] },
  { t: '- [soft laughter]', tags: ['people'] },
  { t: "- You know I'm keeping this one, right?", tags: ['people'] },
  { t: '- [someone humming off-key]', tags: ['people'] },
  { t: '- Stay like that.\n- [camera shutter]', tags: ['people'] },
  { t: '- [a warm silence between friends]', tags: ['people'] },
  { t: '- Okay, one more and then we go.', tags: ['people'] },

  // warm
  { t: '- [kettle clicks off, the room goes quiet]', tags: ['warm'] },
  { t: '- [low chatter, cups clinking]', tags: ['warm'] },
  { t: '- It feels like home in here.', tags: ['warm'] },
  { t: '- Is it weird that I love this light?', tags: ['warm', 'golden'] },

  // cool
  { t: '- [cold wind, a zipper pulled up]', tags: ['cool'] },
  { t: '- [rain tapping softly on glass]', tags: ['cool'] },
  { t: '- Bring a jacket next time.', tags: ['cool'] },
  { t: '- [a breath fogging in the air]', tags: ['cool'] },

  // bright
  { t: '- [midday heat, cicadas rising]', tags: ['bright'] },
  { t: '- Too bright to open my eyes.\n- [laughs]', tags: ['bright'] },
  { t: '- [sunlight flaring, a shutter clicks]', tags: ['bright'] },
  { t: '- Squint and it looks like a painting.', tags: ['bright'] },

  // anything
  { t: '- [shutter clicks]', tags: ['any'] },
  { t: '- Hold on, one more.\n- [shutter clicks]', tags: ['any'] },
  { t: '- [a quiet breath]', tags: ['any'] },
  { t: "- I'll remember this one.\n- [camera clicks]", tags: ['any'] },
  { t: '- [wind, softly]', tags: ['any'] },
  { t: '- Okay, now look at this.\n- [shutter clicks]', tags: ['any'] },
  { t: '- Is this what being present feels like?', tags: ['any'] },
  { t: '- [distant music, a low murmur]', tags: ['any'] },
  { t: '- We almost missed it.', tags: ['any'] },
  { t: '- [the world goes quiet for a second]', tags: ['any'] },
  { t: '- Funny, nothing happened here. I still love it.', tags: ['any'] },
];

export const TAG_LABELS: Record<string, string> = {
  night: 'night',
  dusk: 'dusk sky',
  golden: 'golden light',
  sky: 'open sky',
  green: 'greenery',
  water: 'water',
  soft: 'soft light',
  shadow: 'strong shadows',
  people: 'a person',
  warm: 'warm tones',
  cool: 'cool tones',
  bright: 'bright daylight',
};

/** Picks the captions that best match the detected scene tags. */
export function localPicks(tags: string[], mode: CaptionMode, exclude: Set<string>, n: number): string[] {
  const scored = BANK.filter((e) => modeMatches(e.t, mode) && !exclude.has(e.t)).map((e) => {
    let score = Math.random() * 0.8;
    for (const tag of e.tags) {
      if (tag === 'any') score += 0.5;
      else if (tags.includes(tag)) score += 2 + (tags.indexOf(tag) === 0 ? 0.5 : 0);
    }
    return { t: e.t, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, n).map((s) => s.t);
}
