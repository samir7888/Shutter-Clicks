/**
 * LandingShell
 *
 * A server-rendered semantic HTML component that provides rich, crawlable content
 * for search engines (especially Google AI Overview / SGE). The shell is visually
 * hidden via CSS (aria-hidden="true") so it doesn't interfere with the interactive
 * app, but is fully readable by search bots.
 *
 * Includes:
 *  - Descriptive hero section (h1, tagline)
 *  - Features grid
 *  - How-it-works steps
 *  - FAQ section (matching the JSON-LD FAQ schema in layout.tsx)
 *  - Footer with site info
 */

export default function LandingShell() {
  return (
    <div className="seo-shell" aria-hidden="true">
      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="seo-section" id="hero">
        <h1>Shutter Clicks — Turn Photos into Cinematic Film Frames with Subtitles</h1>
        <p>
          Shutter Clicks is a free, browser-based tool that wraps your photos in a classic 4:3 film
          frame and adds cinematic, film-style subtitles. Powered by AI, with on-device fallback.
          Your photos never leave your browser.
        </p>
        <p>
          Upload any photo — JPG, PNG, WebP, or AVIF — swipe through AI-generated caption
          suggestions, pick the one that fits the moment, and export a stunning film frame. Perfect
          for photographers, storytellers, and social media creators.
        </p>
      </section>

      {/* ── Features ────────────────────────────────────────────── */}
      <section className="seo-section" id="features">
        <h2>Key Features</h2>
        <ul>
          <li>
            <strong>AI-Powered Captions</strong> — Shutter Clicks uses AI vision models to analyze
            your photo and generate cinematic, mood-matched subtitles automatically.
          </li>
          <li>
            <strong>On-Device Fallback</strong> — No API key? No problem. The caption library runs
            entirely in your browser using local matching — no data sent anywhere.
          </li>
          <li>
            <strong>Swipeable Subtitles</strong> — Each photo comes with multiple caption
            suggestions. Swipe or click through them and choose the line that resonates.
          </li>
          <li>
            <strong>Privacy First</strong> — Your full-resolution photos are never uploaded to any
            server. All processing happens locally in your browser.
          </li>
          <li>
            <strong>Film Frame Export</strong> — Export any frame as a crisp PNG with the film
            border and caption burned in.
          </li>
          <li>
            <strong>ZIP Download</strong> — Process an entire roll of up to 24 photos and download
            all frames as a ZIP archive in one click.
          </li>
          <li>
            <strong>Video Reel Export</strong> — Record a video reel (WebM / MP4) that plays
            through your photo roll with captions, ready to share on social media.
          </li>
          <li>
            <strong>Multiple Film Looks</strong> — Choose from several film presets (cool, warm,
            matte, punch, raw) to style your frames.
          </li>
          <li>
            <strong>Custom Captions</strong> — Edit any AI-generated caption or write your own from
            scratch with the inline text editor.
          </li>
          <li>
            <strong>Drag and Drop</strong> — Drag photos directly onto the page from your desktop
            to load them instantly.
          </li>
          <li>
            <strong>No Account Required</strong> — Shutter Clicks is completely free to use with no
            sign-up, no subscription, and no watermarks.
          </li>
          <li>
            <strong>Date Stamp</strong> — Add an optional Polaroid-style date stamp to your frames
            for a classic analog photography feel.
          </li>
        </ul>
      </section>

      {/* ── How It Works ────────────────────────────────────────── */}
      <section className="seo-section" id="how-it-works">
        <h2>How to Use Shutter Clicks</h2>
        <ol>
          <li>
            <strong>Upload your photos.</strong> Click the &ldquo;Choose photos&rdquo; button or
            drag and drop images anywhere on the page. Shutter Clicks accepts JPG, PNG, WebP, and
            AVIF files — any size or aspect ratio.
          </li>
          <li>
            <strong>Review AI captions.</strong> For each photo, Shutter Clicks generates a set of
            cinematic subtitle suggestions. Swipe left or right through the suggestions on the film
            frame, or browse the caption list in the sidebar.
          </li>
          <li>
            <strong>Pick your line.</strong> Select the caption that best captures the mood of your
            photo. You can also type directly in the caption editor to write a custom subtitle.
          </li>
          <li>
            <strong>Adjust the look.</strong> Choose a film preset (cool, warm, matte, punch, or
            raw), set the intensity, toggle a date stamp, and adjust how the photo is framed using
            the move tool.
          </li>
          <li>
            <strong>Export.</strong> Download the current frame as a PNG, export all frames as a
            ZIP archive, or record a video reel. Share directly to Instagram, TikTok, or anywhere
            else.
          </li>
        </ol>
      </section>

      {/* ── Use Cases ───────────────────────────────────────────── */}
      <section className="seo-section" id="use-cases">
        <h2>Who Is Shutter Clicks For?</h2>
        <p>
          Shutter Clicks is designed for anyone who wants to tell stories with their photos —
          without needing design skills.
        </p>
        <ul>
          <li>
            <strong>Photographers</strong> who want to add narrative captions to their portfolio
            shots in seconds.
          </li>
          <li>
            <strong>Travel bloggers</strong> who want to turn their travel shots into cinematic
            journal entries.
          </li>
          <li>
            <strong>Social media creators</strong> who want to create film-aesthetic posts for
            Instagram Reels or TikTok without complex video editing software.
          </li>
          <li>
            <strong>Filmmakers and screenwriters</strong> who use the subtitle aesthetic to create
            storyboard-style presentations.
          </li>
          <li>
            <strong>Casual users</strong> who just want to add a thoughtful caption to a favourite
            memory in a beautiful format.
          </li>
        </ul>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <section className="seo-section" id="faq">
        <h2>Frequently Asked Questions</h2>

        <article>
          <h3>Do my photos get uploaded to a server?</h3>
          <p>
            No. Your full-resolution photos stay entirely in your browser. Only a small
            low-resolution preview is sent to the AI caption model if you have an API key
            configured. Without a key, captions are generated entirely on your device.
          </p>
        </article>

        <article>
          <h3>What photo formats does Shutter Clicks support?</h3>
          <p>
            Shutter Clicks supports any image format your browser can handle, including JPG, PNG,
            WebP, AVIF, and GIF. Any size or aspect ratio is accepted — everything is cropped to
            the same 4:3 film frame.
          </p>
        </article>

        <article>
          <h3>Do I need an API key to use Shutter Clicks?</h3>
          <p>
            No API key is required. Without one, captions are matched on your device using a
            built-in library. An API key unlocks AI-generated captions that are more specific to the
            content of your photo.
          </p>
        </article>

        <article>
          <h3>What can I export from Shutter Clicks?</h3>
          <p>
            You can export individual frames as PNG files, download all frames as a ZIP archive, or
            record a video reel in WebM or MP4 format that plays through your photos with captions.
          </p>
        </article>

        <article>
          <h3>How does the AI caption generation work?</h3>
          <p>
            Shutter Clicks analyzes your photo and generates cinematic, film-style captions that
            match the mood and content of the scene. You can swipe through multiple caption
            suggestions and pick your favourite, or edit any caption freely.
          </p>
        </article>

        <article>
          <h3>Is Shutter Clicks free?</h3>
          <p>
            Yes. Shutter Clicks is completely free to use. There is no subscription, no account
            required, and no watermarks on exported frames. It runs entirely in your web browser.
          </p>
        </article>

        <article>
          <h3>How many photos can I add at once?</h3>
          <p>
            You can load up to 24 photos at a time. You can add, remove, or reorder photos freely
            within that limit, and process them all in a single export session.
          </p>
        </article>

        <article>
          <h3>Can I use Shutter Clicks on mobile?</h3>
          <p>
            Yes. Shutter Clicks is fully responsive and works on both desktop and mobile browsers.
            The touch interface supports swiping on the film frame to change captions, and the
            layout adapts cleanly to smaller screens.
          </p>
        </article>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="seo-footer">
        <p>
          <strong>Shutter Clicks</strong> — Free browser-based photo captioning tool. Turn your
          photos into cinematic film frames with AI-generated subtitles. No upload. No account.
          Completely free.
        </p>
        <nav aria-label="Site links">
          <a href="/">Home</a>
        </nav>
      </footer>
    </div>
  );
}
