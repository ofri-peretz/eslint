/**
 * Storybook test-runner config.
 *
 * Runs axe-core against every story and asserts zero violations at the
 * strict tag stack (matches apps/docs/e2e/a11y.spec.ts and
 * scripts/a11y-summary.ts).
 *
 * The test-runner walks every story by composing them in a headless
 * browser and invoking the story's `play` function. Stories without play
 * functions still get the axe scan; stories with play functions execute
 * their interactions first, then get scanned (interactive states are
 * a11y-tested too, not just the initial render).
 *
 * Layer 4 of UX_PHILOSOPHY.md — per-component isolation.
 */
import type { TestRunnerConfig } from '@storybook/test-runner';
import { getStoryContext } from '@storybook/test-runner';
import { injectAxe, checkA11y, configureAxe } from 'axe-playwright';

const STRICT_TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag2aaa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
  'best-practice',
  'ACT',
];

const config: TestRunnerConfig = {
  async preVisit(page) {
    await injectAxe(page);
  },

  async postVisit(page, context) {
    const storyContext = await getStoryContext(page, context);
    // Per-story opt-out: set `parameters.a11y.skip = true` in a story.
    if (storyContext.parameters?.a11y?.skip) return;

    await configureAxe(page, { rules: [] });

    await checkA11y(page, '#storybook-root', {
      detailedReport: true,
      detailedReportOptions: { html: true },
      axeOptions: {
        runOnly: { type: 'tag', values: STRICT_TAGS },
      },
    });
  },
};

export default config;
