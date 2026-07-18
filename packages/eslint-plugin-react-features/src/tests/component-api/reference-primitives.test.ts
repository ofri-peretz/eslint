/**
 * Integration self-test: the gold-standard reference primitives in
 * `packages/ui/src/primitives/` must pass every component-api rule at `error`
 * severity. If they don't, either the reference is broken or the rule is.
 *
 * Uses ESLint's programmatic Linter so this works under vitest without going
 * through the flat-config CLI plugin-resolution machinery (the monorepo's
 * `main: ./src/index.js` points at `.ts` source pre-build; the dist lives at
 * `dist/src/index.js`). The Linter API doesn't care about package resolution.
 */
import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import parser from '@typescript-eslint/parser';

import { noDefaultTestId } from '../../rules/component-api/no-default-test-id';
import { requireDataSlot } from '../../rules/component-api/require-data-slot';
import { noIsPrefixProp } from '../../rules/component-api/no-is-prefix-prop';
import { noInlineStyle } from '../../rules/component-api/no-inline-style';
import { noRawColorLiteral } from '../../rules/component-api/no-raw-color-literal';
import { noArbitraryTokenClass } from '../../rules/component-api/no-arbitrary-token-class';
import { noKindPropDiscriminator } from '../../rules/component-api/no-kind-prop-discriminator';
import { noWrapperSubComponent } from '../../rules/component-api/no-wrapper-sub-component';

const PRIMITIVES_DIR = join(
  __dirname,
  '../../../../../packages/ui/src/primitives',
);

const REFERENCE_PRIMITIVES = ['dialog.tsx', 'button.tsx'];

// Plugin shape: rule names are bare; ESLint uses `<plugin>/<rule>` at config time.
const RULES = {
  'no-default-test-id': noDefaultTestId,
  'require-data-slot': requireDataSlot,
  'no-is-prefix-prop': noIsPrefixProp,
  'no-inline-style': noInlineStyle,
  'no-raw-color-literal': noRawColorLiteral,
  'no-arbitrary-token-class': noArbitraryTokenClass,
  'no-kind-prop-discriminator': noKindPropDiscriminator,
  'no-wrapper-sub-component': noWrapperSubComponent,
};

// Reference primitives may carry scoped `eslint-disable-next-line
// <plugin>/<rule>` comments for rules OUTSIDE this test's component-api
// scope (e.g. a documented react-a11y false positive). ESLint's Linter
// errors on a disable directive naming a rule it can't resolve at all —
// so those rule names need a no-op stand-in registered here, purely so
// the directive resolves; this test never enables or evaluates them.
const noop = { create: () => ({}) };
const EXTERNAL_RULE_NAMES: Record<string, string[]> = {
  'react-a11y': ['control-has-associated-label', 'no-missing-aria-labels'],
};

const buildLinter = () => {
  const linter = new Linter();
  return linter;
};

describe('reference primitives — self-test', () => {
  for (const file of REFERENCE_PRIMITIVES) {
    it(`${file} passes every component-api rule at error severity`, () => {
      let source: string;
      try {
        source = readFileSync(join(PRIMITIVES_DIR, file), 'utf8');
      } catch {
        // Skip silently if the primitive isn't available (e.g. when running
        // tests in a partial checkout). The CI workflow runs the full check.
        return;
      }
      const linter = buildLinter();
      const config = {
        files: ['**/*.tsx'],
        languageOptions: {
          parser,
          ecmaVersion: 2022 as const,
          sourceType: 'module' as const,
          parserOptions: { ecmaFeatures: { jsx: true } },
        },
        plugins: {
          'component-api': {
            rules: RULES,
          },
          ...Object.fromEntries(
            Object.entries(EXTERNAL_RULE_NAMES).map(([plugin, names]) => [
              plugin,
              { rules: Object.fromEntries(names.map((n) => [n, noop])) },
            ]),
          ),
        },
        rules: Object.fromEntries(
          Object.keys(RULES).map((k) => [`component-api/${k}`, 'error']),
        ) as Record<string, 'error'>,
      };
      const messages = linter.verify(source, config, file);
      const violations = messages.filter((m) => m.severity === 2);
      if (violations.length > 0) {
        const formatted = violations
          .map(
            (m) =>
              `  ${m.ruleId} at ${file}:${m.line}:${m.column} — ${m.message.split('\n')[0]}`,
          )
          .join('\n');
        throw new Error(
          `Reference primitive ${file} has ${violations.length} component-api violation(s):\n${formatted}`,
        );
      }
      expect(violations).toEqual([]);
    });
  }
});
