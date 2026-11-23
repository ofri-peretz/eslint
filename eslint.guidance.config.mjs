/**
 * Guidance: our agent guidance files, linted by the rules that decide where
 * each line of guidance belongs.
 *
 * `npm run lint:guidance` runs eslint-plugin-conventions' `guidance` preset
 * (imported by its real name, so CI lints with the rules as they are in the PR)
 * over CLAUDE.md, AGENTS.md, skills and subagents, on @eslint/markdown.
 *
 * The preset ships at `warn` (docs/intents/guidance-placement) and moves to
 * `error` by decision once it runs clean on `main`.
 *
 * `--max-warnings` in the `lint:guidance` script is the ratchet on the
 * first-run backlog (2026-11-23: 10 findings); it may only go down. Per-file
 * budgets live in .guidance-budget.json.
 */
import markdown from '@eslint/markdown';
import { configs as conventions } from 'eslint-plugin-conventions';

export default [
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/.next/**',
      '**/.turbo/**',
      'benchmarks/**',
      '**/fixtures/**',
      '**/__fixtures__/**',
      'sandboxes/**',
      'examples/**',
      '**/benchmark/**',
    ],
  },
  { plugins: { markdown } },
  conventions.guidance,
];
