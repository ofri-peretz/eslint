'use client';

import { useEffect } from 'react';
import Link from 'next/link';

import { buttonVariants } from '#interlace/components/ui/button-variants';
import { InterlaceMark } from '#interlace/layouts/layout-options';

/**
 * Route-level error boundary. Catches render/data errors in any segment below
 * the root layout and replaces just that subtree — the shell stays mounted.
 *
 * Must be a Client Component (React error boundaries are client-only), which
 * is also why there is no `metadata` export here: Next serves a 500 for these
 * and the page is never indexable anyway.
 *
 * Errors in the ROOT layout itself escape this boundary — global-error.tsx
 * catches those.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Surface the failure to client-side monitoring. Without this the error
  // exists only in the server log and is invisible to anything running in
  // the browser. Mirrors the scorecard boundary's convention.
  useEffect(() => {
    console.error('[error-boundary] render failed:', error);
  }, [error]);

  return (
    <main
      id="main"
      data-slot="error-page"
      className="mx-auto flex min-h-[70vh] w-full max-w-prose flex-col items-center justify-center px-6 py-24 text-center"
    >
      <InterlaceMark size={56} />

      <p className="mt-8 font-mono text-sm tracking-widest text-fd-muted-foreground">
        500
      </p>

      <h1 className="mt-3 text-3xl font-bold tracking-tight text-fd-foreground">
        Something broke on our end
      </h1>

      <p className="mt-4 text-fd-muted-foreground">
        This one is not your fault. The page failed to render — retrying often
        clears it, and the failure has been logged either way.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {/* reset() re-renders the failed segment without a full page load. */}
        <button
          type="button"
          onClick={reset}
          className={buttonVariants({ variant: 'default' })}
        >
          Try again
        </button>
        <Link href="/" className={buttonVariants({ variant: 'outline' })}>
          Go home
        </Link>
      </div>

      {/*
        The digest is a hash Next assigns to the server-side error; the real
        message and stack stay on the server. Showing it lets someone quote a
        reference in an issue without us leaking internals into the page.
      */}
      {error.digest ? (
        <p className="mt-8 font-mono text-xs text-fd-muted-foreground">
          Reference: {error.digest}
        </p>
      ) : null}
    </main>
  );
}
