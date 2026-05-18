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
 * Each story is scanned in BOTH the light and dark theme — token
 * contrast, focus-ring contrast, and `dark:` utility regressions all
 * surface here rather than waiting for a visual audit. A story may opt
 * out of the dark pass via `parameters.a11y.skipDarkTheme: true` (for
 * stories whose decorator already pins the theme).
 *
 * Layer 4 of UX_PHILOSOPHY.md — per-component isolation.
 */
import type { TestRunnerConfig } from '@storybook/test-runner';
import { getStoryContext } from '@storybook/test-runner';
import { injectAxe } from 'axe-playwright';
import type { Page } from 'playwright';

const STRICT_TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
  'best-practice',
  'ACT',
];

// AAA-level rules that the strict stack would otherwise pull in via their
// `ACT` tag (axe's `runOnly: tags` enables every rule that matches any tag,
// even ones disabled by default). Floor is WCAG 2.2 AA — AAA stays
// aspirational and is audited separately via `npm run a11y:gradients`.
const AAA_RULES_DISABLED: string[] = ['color-contrast-enhanced'];

type RuleOverride = { id: string; enabled?: boolean };

interface AxeViolation {
  id: string;
  help: string;
  impact: string | null;
  nodes: Array<{ target: string[]; failureSummary: string; html: string }>;
}

interface AxeResults {
  violations: AxeViolation[];
}

async function runAxeOnRoot(
  page: Page,
  ruleOverrides: RuleOverride[],
): Promise<AxeResults> {
  return page.evaluate(
    async ({ tags, rules, aaaDisabled }) => {
      const opts: Record<string, unknown> = {
        runOnly: { type: 'tag', values: tags },
      };
      const ruleMap: Record<string, { enabled: boolean }> = {};
      for (const id of aaaDisabled) ruleMap[id] = { enabled: false };
      for (const r of rules) ruleMap[r.id] = { enabled: r.enabled !== false };
      if (Object.keys(ruleMap).length > 0) opts.rules = ruleMap;
      // @ts-ignore — axe is injected into the page by injectAxe.
      return (await window.axe.run(
        document.querySelector('#storybook-root'),
        opts,
      )) as AxeResults;
    },
    { tags: STRICT_TAGS, rules: ruleOverrides, aaaDisabled: AAA_RULES_DISABLED },
  );
}

function reportViolations(
  results: AxeResults,
  themeLabel: 'light' | 'dark',
  context: { title: string; name: string },
): void {
  if (results.violations.length === 0) return;
  const lines = [
    '',
    `=== A11Y violations (${themeLabel} theme) in story: ${context.title} > ${context.name} ===`,
  ];
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
    `${results.violations.length} ${themeLabel}-theme a11y violation(s) in ${context.title} > ${context.name} (see logged report above)`,
  );
}

const config: TestRunnerConfig = {
  async preVisit(page) {
    await injectAxe(page);
  },

  async postVisit(page, context) {
    const storyContext = await getStoryContext(page, context);
    if (storyContext.parameters?.a11y?.skip) return;

    const ruleOverrides: RuleOverride[] =
      (storyContext.parameters?.a11y?.config?.rules as
        | RuleOverride[]
        | undefined) ?? [];

    // ─── Light theme scan (default) ─────────────────────────────────
    const lightResults = await runAxeOnRoot(page, ruleOverrides);
    reportViolations(lightResults, 'light', context);

    // ─── Dark theme scan ────────────────────────────────────────────
    // Flip the html.dark class, re-scan, then revert. Stories whose
    // decorators already pin a theme (Button.Dark, Select.Dark) opt out
    // via `parameters.a11y.skipDarkTheme: true` to avoid a redundant
    // double-scan.
    if (!storyContext.parameters?.a11y?.skipDarkTheme) {
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });
      try {
        const darkResults = await runAxeOnRoot(page, ruleOverrides);
        reportViolations(darkResults, 'dark', context);
      } finally {
        await page.evaluate(() => {
          document.documentElement.classList.remove('dark');
        });
      }
    }

    // ─── Styling-sanity sweep ─────────────────────────────────────────
    // Cheap per-story computed-style checks. Catches the failure mode where
    // a CSS-build regression (broken `@source`, missing import) ships an
    // ~unstyled DOM. Each assertion is opt-in via a `data-slot`, so stories
    // without the relevant primitive are no-ops.
    const stylingProblems: string[] = await page.evaluate(() => {
      const problems: string[] = [];
      const parseAlpha = (rgba: string): number => {
        // accepts `rgb(...)`, `rgba(...)`, `oklab(... / 0.5)`, `oklch(... / 0.5)`
        const slash = rgba.match(/\/\s*([0-9.]+)\s*\)/);
        if (slash) return Number.parseFloat(slash[1]);
        const m = rgba.match(/rgba?\([^)]+\)/);
        if (!m) return 1;
        const parts = m[0].replace(/rgba?\(|\)/g, '').split(',');
        return parts.length === 4 ? Number.parseFloat(parts[3]) : 1;
      };

      // Avatar root must be small (size-8 → 32px). If a primitive utility was
      // dropped, the inner SVG fallback fills the canvas and width balloons.
      for (const el of document.querySelectorAll<HTMLElement>('[data-slot="avatar"]')) {
        const w = el.getBoundingClientRect().width;
        if (w > 100) problems.push(`avatar width ${w.toFixed(0)}px > 100px (utility classes likely missing)`);
      }

      // Open Dialog content must be a fixed-position centred panel.
      for (const el of document.querySelectorAll<HTMLElement>('[data-slot="dialog-content"][data-open], [data-slot="dialog-content"][data-state="open"]')) {
        const cs = getComputedStyle(el);
        if (cs.position !== 'fixed') problems.push(`dialog-content position=${cs.position} (expected fixed)`);
      }

      // Dialog overlay must be a visible scrim (alpha > 0). bg-black/50 expands
      // to rgba(0,0,0,0.5) when emitted; if missing, alpha is 0 = invisible.
      for (const el of document.querySelectorAll<HTMLElement>('[data-slot="dialog-overlay"]')) {
        const alpha = parseAlpha(getComputedStyle(el).backgroundColor);
        if (alpha === 0) problems.push(`dialog-overlay background-color alpha=0 (expected > 0)`);
      }

      // Popover / DropdownMenu / Tooltip content panels — same fixed-positioning
      // contract as Dialog when open.
      for (const slot of ['popover-content', 'dropdown-menu-content', 'tooltip-content']) {
        const sel = `[data-slot="${slot}"][data-open], [data-slot="${slot}"][data-state="open"]`;
        for (const el of document.querySelectorAll<HTMLElement>(sel)) {
          const cs = getComputedStyle(el);
          if (cs.position !== 'fixed' && cs.position !== 'absolute') {
            problems.push(`${slot} position=${cs.position} (expected fixed|absolute)`);
          }
        }
      }

      return problems;
    });

    if (stylingProblems.length > 0) {
      const lines = ['', `=== STYLING regressions in story: ${context.title} > ${context.name} ===`];
      for (const p of stylingProblems) lines.push(`  • ${p}`);
      // eslint-disable-next-line no-console
      console.log(lines.join('\n'));
      throw new Error(
        `${stylingProblems.length} styling regression(s) in ${context.title} > ${context.name} (see logged report above)`,
      );
    }
  },
};

export default config;
