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
      {
        name: "an undeclared type is not followed",
        code: "interface Props { kind: Imported }",
      },
      {
        name: "an interface named by the prop type is not a union",
        code: "interface Kind { a: 1 } interface Props { kind: Kind }",
      },
      {
        name: "a self-referencing alias ends",
        code: "type K = K; interface Props { kind: K }",
      },
      {
        name: "a type alias that is not a string-literal union",
        code: "type Kind = string; interface Props { kind: Kind }",
      },
      {
        name: "a generic type reference is not followed",
        code: "interface Props { kind: Pick<Other, \"a\"> }",
      },
      // `variant` is allow-listed (CVA pattern dominates)
      { name: '`variant`', code: `interface Props { variant: "primary" | "secondary"; }` },
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
        name: 'a nullable kind union',
        code: "interface Props { kind: 'checkbox' | 'radio' | null }",
        errors: [{ messageId: 'kindProp' }],
      },
      {
        name: "a quoted kind key",
        code: "interface Props { 'type': 'checkbox' | 'radio' }",
        errors: [{ messageId: 'kindProp' }],
      },
      {
        name: "an optional kind written with | undefined",
        code: "interface Props { kind: 'checkbox' | 'radio' | undefined }",
        errors: [{ messageId: 'kindProp' }],
      },
      {
        name: "a kind union through a local type alias",
        code: "type RowKind = 'checkbox' | 'radio'; interface Props { type: RowKind }",
        errors: [{ messageId: 'kindProp' }],
      },
      {
        name: '`type` as the discriminator name — it collides with the DOM attribute',
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
