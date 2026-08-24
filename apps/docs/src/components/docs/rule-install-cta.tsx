'use client';

/**
 * RuleInstallCTA — the adoption ask on rule pages.
 *
 * Who actually lands on a rule page, per 30 days of PostHog data: searchers,
 * pre-install. Sessions ≈ pageviews (almost nobody views a second page), median
 * max scroll is 0%, and `install:command_click` had never fired anywhere on the
 * site — because no rule page offered an install command at all. The only ask
 * was RuleValueCTA's star/follow, which presumes a reader who already uses the
 * plugin. Rule pages are landing pages; this is the buy button they lacked.
 *
 * Deliberately compact: one line of context and the instrumented
 * InstallSnippet (which emits `install:command_click` / `install:pm_update`),
 * so rule-page → install intent finally becomes measurable.
 */
import { InstallSnippet } from '@/components/mdx/install-snippet';

export function RuleInstallCTA({ plugin }: { plugin: string }) {
  const pkg = `eslint-plugin-${plugin}`;
  return (
    <section
      aria-label={`Install ${pkg}`}
      className="mb-8 rounded-lg border border-fd-border bg-fd-muted/30 p-4"
    >
      <p className="mb-3 text-sm text-fd-muted-foreground">
        This rule ships in{' '}
        <code className="font-mono text-fd-foreground">{pkg}</code>:
      </p>
      <InstallSnippet packages={pkg} dev />
    </section>
  );
}
