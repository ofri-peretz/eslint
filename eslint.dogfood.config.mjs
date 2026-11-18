// @ts-check
/**
 * Dogfood: the plugins' own source, linted by the plugins themselves.
 *
 * `npm run lint:dogfood`. Until 2026-11-17 nothing in this repo ran our security or
 * quality plugins over our own code: the root config wires react-a11y and react-features
 * for packages/ui only, and the plugin packages have no lint script.
 *
 * The plugins are imported by their real names and resolve to the workspace packages,
 * the way ESLint and typescript-eslint lint themselves: CI builds them first, so every PR
 * lints our source with the rules as they are in that PR. A rule change that breaks on our
 * own code fails here, before it is released. Each plugin's own `recommended` preset, no
 * hand-picked rule list, so this measures the default experience.
 */
import tseslint from 'typescript-eslint';
import { configs as secureCoding } from 'eslint-plugin-secure-coding';
import { configs as nodeSecurity } from 'eslint-plugin-node-security';
import { configs as maintainability } from 'eslint-plugin-maintainability';
import { configs as reliability } from 'eslint-plugin-reliability';
import { configs as conventions } from 'eslint-plugin-conventions';
import { configs as operability } from 'eslint-plugin-operability';
import { configs as modernization } from 'eslint-plugin-modernization';
import { configs as modularity } from 'eslint-plugin-modularity';
import { configs as importNext } from 'eslint-plugin-import-next';

const SOURCE = ['packages/*/src/**/*.ts'];

export default [
  {
    ignores: [
      '**/dist/**',
      // Tests and their fixtures are deliberately vulnerable or weird code: the
      // cases each rule is graded against.
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/__compatibility__/**',
      '**/__tests__/**',
      '**/tests/**',
      '**/test/**',
      '**/fixtures/**',
      '**/__fixtures__/**',
    ],
  },
  {
    files: SOURCE,
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
    // Registered so the source's own `@typescript-eslint/*` disable comments resolve.
    plugins: { '@typescript-eslint': tseslint.plugin },
    linterOptions: { reportUnusedDisableDirectives: 'off' },
  },
  ...[
    secureCoding,
    nodeSecurity,
    maintainability,
    reliability,
    conventions,
    operability,
    modernization,
    modularity,
    importNext,
  ].map((c) => ({ ...c.recommended, files: SOURCE })),
  // ── First-run baseline (2026-11-17) ───────────────────────────────────────
  // Every preset rule at `error` that fired on the first run, with its count and
  // verdict. Held at `warn` so the gate can block NEW errors from day one; ratchet
  // each back to `error` as its findings are fixed or its FP ships a fix.
  {
    files: SOURCE,
    rules: {
      // 257, true positives: one module imported in 2-4 statements in the same file
      // (mostly @interlace/eslint-devkit in rule sources). Autofixable; a follow-up
      // because the fix touches ~200 rule files and each trips the per-rule gates.
      'import-next/no-duplicates': 'warn',
      // 17, true positives in the strict sense: ambiguous quantifiers in regexes
      // that rules run over the source they lint. Worth fixing — linted code is
      // attacker-shaped input — rule by rule.
      'secure-coding/no-redos-vulnerable-regex': 'warn',
      // 14, every catch commented (`/* ignore broken symlinks */`); see
      // ofri-peretz/eslint#1554 for why allowWithComment does not cover them.
      'reliability/no-silent-errors': 'warn',
      // 1, by design: eslint-devkit's user-regex compiles a pattern the user configured.
      'secure-coding/no-unsafe-regex-construction': 'warn',
      // 1, FP: 'password' in SENSITIVE_ROUTE_TOKENS (ofri-peretz/eslint#1557).
      'secure-coding/no-hardcoded-credentials': 'warn',
      // 1, true positive: a type import of `@eslint-community/regexpp/ast`, a subpath
      // the package's exports map does not expose.
      'import-next/no-unresolved': 'warn',
    },
  },
];
