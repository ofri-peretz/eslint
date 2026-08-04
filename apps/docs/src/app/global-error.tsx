'use client';

import './global.css';

/**
 * Last-resort error boundary. Only fires when the ROOT layout itself throws —
 * error.tsx cannot catch that, because it renders *inside* the root layout.
 *
 * Because it replaces the root layout, it must supply its own <html>/<body>,
 * and it cannot use anything the layout provides: no theme provider, no font
 * loader, no nav. It imports global.css directly so the brand tokens resolve;
 * if even that fails, the markup below is still semantic and readable.
 *
 * Deliberately dependency-free otherwise — a boundary that can itself throw is
 * worse than no boundary. That includes the mark, which is inlined here rather
 * than imported from the baseline for the same reason.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      {/* Next injects nothing here: global-error replaces the root layout,
          which is what normally supplies these. Without the viewport meta,
          mobile browsers fall back to ~980px desktop-zoom rendering. */}
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Something went wrong</title>
      </head>
      <body className="bg-fd-background text-fd-foreground antialiased">
        <main
          id="main"
          data-slot="global-error-page"
          className="mx-auto flex min-h-screen w-full max-w-prose flex-col items-center justify-center px-6 py-24 text-center"
        >
          <svg
            viewBox="0 0 100 100"
            width={56}
            height={56}
            aria-hidden="true"
            className="shrink-0"
          >
            <g transform="rotate(-30 50 50)">
              <rect
                x="10"
                y="18"
                width="62"
                height="28"
                rx="14"
                fill="var(--brand-mark-bar-o)"
              />
              <rect
                x="28"
                y="54"
                width="62"
                height="28"
                rx="14"
                fill="var(--brand-mark-bar-g)"
              />
            </g>
          </svg>

          <p className="mt-8 font-mono text-sm tracking-widest text-fd-muted-foreground">
            500
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            Something broke on our end
          </h1>

          <p className="mt-4 text-fd-muted-foreground">
            This one is not your fault. The page failed to load — retrying often
            clears it, and the failure has been logged either way.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-9 items-center justify-center rounded-md bg-fd-primary px-4 text-sm font-medium text-fd-primary-foreground"
            >
              Try again
            </button>
            {/* Deliberately a plain <a>, not next/link: this boundary runs when the
                root layout itself failed, so client-side navigation is exactly the
                thing that cannot be trusted. A full document load is the reliable
                escape hatch. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              className="inline-flex h-9 items-center justify-center rounded-md border border-fd-border px-4 text-sm font-medium"
            >
              Go home
            </a>
          </div>

          {error.digest ? (
            <p className="mt-8 font-mono text-xs text-fd-muted-foreground">
              Reference: {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
