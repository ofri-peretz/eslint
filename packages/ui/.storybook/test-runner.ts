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
import { injectAxe } from 'axe-playwright';

const STRICT_TAGS = [
  'wcag2a',
  'wcag2aa',
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

    // Honor per-story rule overrides written as
    // `parameters: { a11y: { config: { rules: [{ id, enabled }] } } }`
    // (Storybook's standard a11y-addon shape). Each story can disable a
    // specific axe rule with documented justification — see
    // packages/ui/src/stories/Button.stories.tsx (target-size showcase).
    type RuleOverride = { id: string; enabled?: boolean };
    const ruleOverrides: RuleOverride[] =
      (storyContext.parameters?.a11y?.config?.rules as RuleOverride[] | undefined) ?? [];

    // Run axe directly so we can dump the full violation payload (rule id,
    // selectors, failure summary) to stdout when assertions fail. Storybook's
    // default `checkA11y` only prints "N accessibility violations detected"
    // without the rule identifiers, which made CI failures un-diagnosable.
    const results: { violations: Array<{ id: string; help: string; impact: string | null; nodes: Array<{ target: string[]; failureSummary: string; html: string }> }> } =
      await page.evaluate(
        async ({ tags, rules }) => {
          const opts: Record<string, unknown> = {
            runOnly: { type: 'tag', values: tags },
          };
          if (rules.length > 0) {
            opts.rules = Object.fromEntries(
              rules.map((r) => [r.id, { enabled: r.enabled !== false }]),
            );
          }
          // @ts-ignore — axe is injected into the page by injectAxe.
          return await window.axe.run(document.querySelector('#storybook-root'), opts);
        },
        { tags: STRICT_TAGS, rules: ruleOverrides },
      );

    if (results.violations.length > 0) {
      const lines = ['', `=== A11Y violations in story: ${context.title} > ${context.name} ===`];
      for (const v of results.violations) {
        lines.push(`[${v.impact ?? 'unknown'}] ${v.id} — ${v.help}`);
        for (const n of v.nodes) {
          lines.push(`  • ${n.target.join(' ')}`);
          lines.push(`    ${n.failureSummary.replace(/\n/g, '\n    ')}`);
          lines.push(`    html: ${n.html.slice(0, 200)}`);
        }
      }
      // eslint-disable-next-line no-console
      console.log(lines.join('\n'));
      throw new Error(
        `${results.violations.length} accessibility violation(s) in ${context.title} > ${context.name} (see logged report above)`,
      );
    }
  },
};

export default config;
