/**
 * Lock: the peak-value rule-page conversion CTA stays wired.
 *
 * The rule docs page is the single highest-gratitude surface we have — it's
 * where a developer lands right after a rule caught something in their code.
 * The `RuleValueCTA` is the star/follow ask on that page, and the typed
 * `rule_page:cta_click` event is how we measure whether it converts. A refactor
 * that drops either silently re-opens the biggest leak in the funnel
 * (GROWTH_PHILOSOPHY.md: download-to-star) with zero signal. This pins it.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');

describe('rule-page conversion CTA lock', () => {
  it('renders the rule CTA on rule pages, in both experiment slots', () => {
    // The CTA now renders through RuleCTAExperiment, which picks the visible
    // slot from the `rule-cta-placement` flag. Both slots must exist in the
    // page or the experiment can only ever measure one arm — and with the flag
    // unresolved the bottom slot is what ships, exactly as before.
    const page = read('app/docs/[[...slug]]/page.tsx');
    expect(page).toMatch(/import\s+\{\s*RuleCTAExperiment\s*\}/);
    expect(page).toMatch(/<RuleCTAExperiment[\s\S]*?placement="top"/);
    expect(page).toMatch(/<RuleCTAExperiment[\s\S]*?placement="bottom"/);
    const experiment = read('components/docs/rule-cta-experiment.tsx');
    expect(experiment).toMatch(/RULE_CTA_FLAG\s*=\s*'rule-cta-placement'/);
    // Unresolved flag must fall back to today's behaviour, never to nothing.
    expect(experiment).toMatch(/variant === 'top' \? 'top' : 'bottom'/);
  });

  it('asks for both conversions — Dev.to follow and GitHub star', () => {
    const cta = read('components/docs/rule-value-cta.tsx');
    expect(cta).toContain('https://github.com/ofri-peretz/eslint');
    expect(cta).toContain('https://dev.to/ofri-peretz');
    expect(cta).toMatch(/action:\s*'follow'/);
    expect(cta).toMatch(/action:\s*'star'/);
  });

  it('keeps the rule_page:cta_click event typed so the conversion is measurable', () => {
    const analytics = read('lib/analytics.ts');
    expect(analytics).toMatch(/'rule_page:cta_click':\s*\{[^}]*action:\s*'star'\s*\|\s*'follow'/);
  });

  it('renders DocsFooterCTA on every non-rule docs page, instrumented', () => {
    const page = read('app/docs/[[...slug]]/page.tsx');
    expect(page).toMatch(/import\s+\{\s*DocsFooterCTA\s*\}/);
    expect(page).toMatch(/<DocsFooterCTA\s+slug=/);
    const cta = read('components/docs/docs-footer-cta.tsx');
    expect(cta).toContain('https://github.com/ofri-peretz/eslint');
    expect(cta).toContain('https://dev.to/ofri-peretz');
    const analytics = read('lib/analytics.ts');
    expect(analytics).toMatch(/'docs_page:cta_click':\s*\{[^}]*action:\s*'star'\s*\|\s*'follow'/);
  });
});
