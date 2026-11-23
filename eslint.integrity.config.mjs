/**
 * Integrity: our test suites and our agent guidance, linted by the rules that
 * hold them honest.
 *
 * `npm run lint:integrity`. Two presets from this repo, imported by their real
 * names so CI lints with the rules as they are in the PR:
 *
 * - eslint-plugin-test-integrity `adoption` over every test file — no `.only`,
 *   no unexplained skip, no fixed sleep, no retry.
 * - eslint-plugin-conventions `guidance` over CLAUDE.md, AGENTS.md, skills and
 *   subagents, on @eslint/markdown.
 *
 * Both ship at `warn` (docs/intents/test-integrity, docs/intents/guidance-placement)
 * and move to `error` by decision once they run clean on `main`.
 *
 * `--max-warnings` in the `lint:integrity` script is the ratchet on the
 * first-run backlog (2026-11-23: 43 test findings, 10 guidance findings); it
 * may only go down. Per-file guidance budgets live in .guidance-budget.json.
 */
import markdown from '@eslint/markdown';
import tseslint from 'typescript-eslint';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import { configs as conventions } from 'eslint-plugin-conventions';
import testIntegrity from 'eslint-plugin-test-integrity';

const TESTS = [
  '**/*.{test,spec}.{ts,tsx,mts,cts,js,mjs,cjs}',
  '**/__tests__/**/*.{ts,tsx,mts,js,mjs}',
  '**/{vitest,jest,playwright}.config.{ts,mts,js,mjs,cjs}',
];

export default [
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/.next/**',
      '**/.turbo/**',
      // Graded corpora and fixtures are deliberately weird code.
      'benchmarks/**',
      '**/fixtures/**',
      '**/__fixtures__/**',
      'sandboxes/**',
      'examples/**',
      '**/benchmark/**',
    ],
  },
  // Registered, with no rules on, so the test files' own disable directives for
  // these plugins resolve. Our justification channel is a plain comment (issue
  // URL, decision id, date), never a disable directive.
  {
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      unicorn: eslintPluginUnicorn,
    },
    linterOptions: { reportUnusedDisableDirectives: 'off' },
  },
  {
    files: TESTS,
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
  },
  { ...testIntegrity.configs.adoption, files: TESTS },
  { plugins: { markdown } },
  conventions.guidance,
];
