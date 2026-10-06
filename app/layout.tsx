import type { Metadata, Viewport } from 'next';
import { Analytics } from "@vercel/analytics/next"
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource/courier-prime/400.css';
import '@fontsource/courier-prime/700.css';
import './globals.css';

const BASE_URL = 'https://shutter-clicks.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Shutter Clicks - Photos with Subtitles',
    template: '%s | Shutter Clicks',
  },
  description:
    'Turn your photos into cinematic film frames with AI-generated subtitles. Free, browser-based photo captioning with swipeable captions. No upload, no account needed.',
  keywords: [
    'photo captions',
    'AI photo subtitles',
    'film frame generator',
    'photo to film frame',
    'cinematic photo editor',
    'AI captions for photos',
    'photo subtitle generator',
    'browser photo editor',
    'free photo editor',
    'film strip photo',
  ],
  authors: [{ name: 'Shutter Clicks' }],
  creator: 'Shutter Clicks',
  publisher: 'Shutter Clicks',
  category: 'Photography',
  applicationName: 'Shutter Clicks',
  referrer: 'origin-when-cross-origin',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: BASE_URL,
    siteName: 'Shutter Clicks',
    title: 'Shutter Clicks - Photos with Subtitles',
    description:
      'Turn your photos into cinematic film frames with AI-generated subtitles. Free, browser-based. Your photos never leave your device.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Shutter Clicks - Photos with Subtitles',
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shutter Clicks - Photos with Subtitles',
    description:
      'Turn your photos into cinematic film frames with AI-generated subtitles. Free, browser-based. Your photos never leave your device.',
    images: ['/og-image.jpg'],
  },
  alternates: {
    canonical: BASE_URL,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#ECEEF1',
  width: 'device-width',
  initialScale: 1,
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Shutter Clicks',
  url: BASE_URL,
  description:
    'Turn your photos into cinematic 4:3 film frames with AI-generated subtitles and swipeable captions. Free, private, browser-based.',
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'Any',
  browserRequirements: 'Requires a modern web browser with JavaScript enabled.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  featureList: [
    'AI-powered photo captions',
    'Film frame photo export',
    'Swipeable subtitle selection',
    'Privacy-first photos stay in your browser',
    'Export as PNG ZIP or video reel',
    'No account or signup required',
  ],
  screenshot: BASE_URL + '/og-image.jpg',
  creator: {
    '@type': 'Organization',
    name: 'Shutter Clicks',
    url: BASE_URL,
  },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Do my photos get uploaded to a server?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. Your full-resolution photos stay entirely in your browser. Only a small low-resolution preview is sent to the AI caption model if you have an API key configured. Without a key, captions are generated entirely on your device.',
      },
    },
    {
      '@type': 'Question',
      name: 'What photo formats does Shutter Clicks support?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Shutter Clicks supports any image format your browser can handle, including JPG, PNG, WebP, AVIF, and GIF. Any size or aspect ratio is accepted. Everything is cropped to the same 4:3 film frame.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do I need an API key to use Shutter Clicks?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No API key is required. Without one, captions are matched on your device using a built-in library. An API key unlocks AI-generated captions that are more specific to the content of your photo.',
      },
    },
    {
      '@type': 'Question',
      name: 'What can I export from Shutter Clicks?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'You can export individual frames as PNG files, download all frames as a ZIP archive, or record a video reel in WebM or MP4 format that plays through your photos with captions.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does the AI caption generation work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Shutter Clicks analyzes your photo and generates cinematic film-style captions that match the mood and content of the scene. You can swipe through multiple caption suggestions and pick your favourite, or edit any caption freely.',
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      </head>
      <body>{children}
        <Analytics /> 
      </body>
    </html>
  );
}
