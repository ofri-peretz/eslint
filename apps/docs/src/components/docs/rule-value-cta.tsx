'use client';

/**
 * RuleValueCTA — the peak-value conversion ask on every rule page.
 *
 * Rendered directly after a rule's documentation. This is the page a developer
 * lands on right after the rule caught something in their code (the editor
 * "see docs" link), so it's the highest-gratitude moment we have. Per
 * CTA_PHILOSOPHY.md: quiet, reason-first ("get new coverage" / "the
 * benchmarks"), and the lower-friction *follow* before the *star*.
 *
 * Each click is a typed analytics event (`rule_page:cta_click`) so we can
 * measure rule-page → adoption conversion. The docs-site rule page is the
 * *instrumented* mirror of the un-trackable GitHub rule-doc CTA — the copy that
 * wins here is the copy we reuse there.
 */
import Link from 'next/link';
import { Rss, Star } from 'lucide-react';
import { Button } from '@interlace/ui/button';

import { track } from '@/lib/analytics';

const REPO_URL = 'https://github.com/ofri-peretz/eslint';
const DEVTO_URL = 'https://dev.to/ofri-peretz';

export function RuleValueCTA({ plugin, rule }: { plugin: string; rule: string }) {
  return (
    <aside className="mt-10 rounded-lg border border-fd-border bg-fd-muted/30 p-5">
      <p className="text-sm text-fd-muted-foreground">
        <strong className="font-semibold text-fd-foreground">
          Did this rule catch something?
        </strong>{' '}
        Star the repo to get new CWE coverage as we ship it — or follow the
        AI-code-security benchmarks behind these rules.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          render={
            <Link
              href={DEVTO_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                track('rule_page:cta_click', { action: 'follow', plugin, rule })
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
                track('rule_page:cta_click', { action: 'star', plugin, rule })
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
    </aside>
  );
}

export default RuleValueCTA;
