import type { Metadata } from 'next';
import Link from 'next/link';

import { buttonVariants } from '#interlace/components/ui/button-variants';
import { InterlaceMark } from '#interlace/layouts/layout-options';

export const metadata: Metadata = {
  title: 'Page not found',
  description: 'This page does not exist on eslint.interlace.tools.',
  // A 404 has no content worth ranking, and indexing it competes with the real
  // pages for the same queries.
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main
      id="main"
      data-slot="not-found-page"
      className="mx-auto flex min-h-[70vh] w-full max-w-prose flex-col items-center justify-center px-6 py-24 text-center"
    >
      {/* The mark reads the --brand-mark-bar-* tokens, so it stays AA-safe in both themes. */}
      <InterlaceMark size={56} />

      <p className="mt-8 font-mono text-sm tracking-widest text-fd-muted-foreground">
        404
      </p>

      <h1 className="mt-3 text-3xl font-bold tracking-tight text-fd-foreground">
        That page wandered off
      </h1>

      <p className="mt-4 text-fd-muted-foreground">
        The URL does not match anything published here. It may have been moved,
        renamed, or never existed in the first place.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className={buttonVariants({ variant: 'default' })}>
          Go home
        </Link>
        <Link href="/docs" className={buttonVariants({ variant: 'outline' })}>
          Browse docs
        </Link>
      </div>
    </main>
  );
}
