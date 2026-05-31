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
  it('renders RuleValueCTA on every rule page (wired into remote-rule-doc)', () => {
    const doc = read('components/docs/remote-rule-doc.tsx');
    expect(doc).toMatch(/import\s+\{\s*RuleValueCTA\s*\}/);
    expect(doc).toMatch(/<RuleValueCTA\s+plugin=\{plugin\}\s+rule=\{rule\}\s*\/>/);
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
});
