/**
 * The flat config ILB-Wild lints every corpus repo with.
 *
 * Lives in a module, not inline in the generated worker, so the lock test
 * (scripts/__tests__/ilb-wild-measures-typescript.lock.test.ts) lints with the
 * exact config the benchmark uses.
 */
// Namespace import, not default: the worker runs as CommonJS under tsx, and
// this package sets `__esModule` without a `default` export — so a default
// import is `undefined` there, and ESLint silently falls back to espree.
import * as tsParser from '@typescript-eslint/parser';
// Same reason for the namespace import.
import * as hermesParser from 'hermes-eslint';
import type { Linter } from 'eslint';

/**
 * Files the TypeScript parser handles. Everything else stays on espree.
 *
 * Until 2026-10 there was no TypeScript parser at all: every .ts/.tsx file hit
 * espree, died on its first type annotation, and was counted as a parse error
 * and skipped. TypeScript-heavy repos were only ever measured on their few .js
 * files. Non-type-aware on purpose — no recommended rule in the corpus plugins
 * requires type information (nestjs-security/no-missing-validation-pipe uses it
 * only when present), and a `project` per corpus repo would need its tsconfig
 * and dependencies installed.
 */
export const TS_FILES = '**/*.{ts,tsx,mts,cts}';

/**
 * Plain .js/.jsx that is Flow-typed (React's sources). Neither espree nor the
 * TypeScript parser accepts Flow annotations; hermes-eslint is Meta's parser
 * for exactly this. Opt-in per repo, so a JS repo is never parsed as Flow.
 */
export const FLOW_FILES = '**/*.{js,jsx,mjs,cjs}';

export function wildOverrideConfig(
  pluginConfigBlocks: Linter.Config[],
  { flow = false }: { flow?: boolean } = {},
): Linter.Config[] {
  return [
    // Base language options apply to every file.
    {
      files: ['**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}'],
      languageOptions: {
        parserOptions: {
          ecmaVersion: 'latest',
          sourceType: 'module',
          ecmaFeatures: { jsx: true },
        },
      },
      // Don't error on third-party eslint-disable comments for rules we don't
      // load — keeps the noise floor low.
      linterOptions: {
        reportUnusedDisableDirectives: 'off',
      },
    },
    // TypeScript needs the TypeScript parser; espree rejects it. JSX in .tsx is
    // decided by the extension, not by ecmaFeatures.
    {
      files: [TS_FILES],
      languageOptions: { parser: tsParser },
    },
    ...(flow
      ? [
          {
            files: [FLOW_FILES],
            languageOptions: {
              parser: hermesParser,
              parserOptions: { sourceType: 'module' },
            },
          },
        ]
      : []),
    // Plugin recommended configs supply their own plugin registration + rule
    // activations. Separate blocks let flat config compose them without
    // namespace conflicts.
    ...pluginConfigBlocks,
  ];
}
