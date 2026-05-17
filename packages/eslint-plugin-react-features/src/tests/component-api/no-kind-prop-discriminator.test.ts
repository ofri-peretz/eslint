/**
 * Tests for no-kind-prop-discriminator (R11)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noKindPropDiscriminator } from '../../rules/component-api/no-kind-prop-discriminator';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

describe('no-kind-prop-discriminator', () => {
  ruleTester.run('no-kind-prop-discriminator', noKindPropDiscriminator, {
    valid: [
      // `variant` is allow-listed (CVA pattern dominates)
      { code: `interface Props { variant: "primary" | "secondary"; }` },
      // Single-member union — not a real discriminator
      { code: `interface Props { type: "submit"; }` },
      // Non-string union — leave to type-system enforcement
      { code: `interface Props { kind: 1 | 2 | 3; }` },
      // No type annotation
      { code: `interface Props { type; }` },
      // Property other than type/kind
      { code: `interface Props { mode: "a" | "b"; }` },
    ],
    invalid: [
      {
        code: `interface Props { type: "checkbox" | "radio" | "switch"; }`,
        errors: [{ messageId: 'kindProp' }],
      },
      {
        code: `type Props = { kind: "primary" | "secondary"; };`,
        errors: [{ messageId: 'kindProp' }],
      },
      {
        code: `interface ListItemProps { type: "list" | "listbox"; children: ReactNode; }`,
        errors: [{ messageId: 'kindProp' }],
      },
    ],
  });
});
