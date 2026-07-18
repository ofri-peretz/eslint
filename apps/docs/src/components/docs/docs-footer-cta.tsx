'use client';

/**
 * DocsFooterCTA — the conversion ask on non-rule docs pages (getting-started,
 * concepts, guides). These pages are read by people *evaluating* the project,
 * which is the highest-intent star/follow audience after a rule actually
 * firing. Rule pages get the contextual `RuleValueCTA` instead; this is the
 * generic footer for everything else.
 *
 * Per CTA_PHILOSOPHY.md: quiet, reason-first, follow (lower friction) before
 * star. Each click is a typed `docs_page:cta_click` event (with the page slug)
 * so we can see which docs convert — the docs side of the download-to-star gap.
 */
import Link from 'next/link';
import { Rss, Star } from 'lucide-react';
import { Button } from '@interlace/ui/button';

import { track } from '@/lib/analytics';

const REPO_URL = 'https://github.com/ofri-peretz/eslint';
const DEVTO_URL = 'https://dev.to/ofri-peretz';

export function DocsFooterCTA({ slug }: { slug: string }) {
  return (
    // A labeled <section> (role=region), not <aside>: this callout renders
    // inside the page's <main> landmark, and axe's strict
    // `landmark-complementary-is-top-level` rule (correctly) requires
    // complementary landmarks to be top-level. A named region is valid nested
    // and keeps the callout discoverable in the AT landmark list.
    <section
      aria-label="Support this project"
      className="mt-12 rounded-lg border border-fd-border bg-fd-muted/30 p-5"
    >
      <p className="text-sm text-fd-muted-foreground">
        <strong className="font-semibold text-fd-foreground">
          Building secure JavaScript with Interlace?
        </strong>{' '}
        Star the repo to get new rules and CWE coverage as we ship them — or
        follow the AI-code-security benchmarks behind them.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          render={
            <Link
              href={DEVTO_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                track('docs_page:cta_click', { action: 'follow', slug })
              }
            />
          }
          variant="default"
          size="sm"
        >
          <Rss />
          Follow the benchmarks
        </Button>
        <Button
          render={
            <Link
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                track('docs_page:cta_click', { action: 'star', slug })
              }
            />
          }
          variant="outline"
          size="sm"
        >
          <Star className="fill-amber-400 text-amber-500" />
          Star on GitHub
        </Button>
      </div>
    </section>
  );
}

export default DocsFooterCTA;
