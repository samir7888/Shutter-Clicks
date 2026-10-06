import type { Metadata } from 'next';
import App from '@/components/App';
import LandingShell from '@/components/LandingShell';

export const metadata: Metadata = {
  title: 'Shutter Clicks - Photos with Subtitles',
  description:
    'Turn your photos into cinematic 4:3 film frames with AI-generated subtitles and swipeable captions. Free, private, browser-based. No account needed.',
};

export default function Page() {
  return (
    <>
      {/* Client-side app — renders the full interactive tool */}
      <App />
      {/* SEO shell — hidden from view but visible to search crawlers */}
      <LandingShell />
    </>
  );
}
