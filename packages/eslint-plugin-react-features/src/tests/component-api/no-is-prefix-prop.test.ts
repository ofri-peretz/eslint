/**
 * Tests for no-is-prefix-prop (R8)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noIsPrefixProp } from '../../rules/component-api/no-is-prefix-prop';

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

describe('no-is-prefix-prop', () => {
  ruleTester.run('no-is-prefix-prop', noIsPrefixProp, {
    valid: [
      {
        name: 'a union of boolean and string is not a boolean prop',
        code: 'interface Props { isLooped: boolean | string; }',
      },
      {
        name: 'an is-prefixed prop that is not boolean',
        code: 'interface Props { isLooped: string | undefined; }',
      },
      // Boolean without `is` prefix
      {
        name: 'the same prop without the prefix',
        code: `interface Props { looped: boolean; }`,
      },
      // Non-boolean type — even with `is` prefix, not flagged
      {
        name: 'a non-boolean is-prefixed member of a Props interface',
        code: `interface Props { isLooped: string; }`,
      },
      {
        name: '`is` followed by a lowercase letter is a word, not a prefix',
        code: `interface Props { island: boolean; }`,
      },
      // Other patterns
      { code: `interface Props { disabled: boolean; loading: boolean; }` },
      // Property is a function — not a flagged shape
      { code: `interface Props { isOpen: () => boolean; }` },
      // #1556: a data interface mapped into JSX elsewhere is not a props
      // type — R8 applies to component props, not to every interface.
      {
        name: 'a boolean field of a non-Props-named data interface is not a component prop',
        code: `interface FunnelStep { id: string; isGoal?: boolean }`,
      },
      {
        name: 'a boolean field of a non-Props-named type alias is not a component prop',
        code: `type FunnelStep = { id: string; isGoal?: boolean };`,
      },
      // Inline types: a component's props are a real prop type, any other function's
      // parameter is not (#1556 must not drop the first, and must keep the second).
      {
        name: 'an inline boolean parameter of a lowercase helper that returns no JSX is not a prop',
        code: `function describeFlag(opts: { isOn: boolean }) { return String(opts.isOn); }`,
      },
      {
        name: 'an inline boolean parameter of a lowercase arrow helper is not a prop',
        code: `const describeFlag = (opts: { isOn: boolean }) => String(opts.isOn);`,
      },
      {
        name: 'an inline boolean in the second parameter of a component is not its props',
        code: `export function Card(props: { id: string }, extra: { isOpen: boolean }) { return <div />; }`,
      },
      {
        name: 'a generic argument that is not a component type is not a prop type',
        code: `type Box = Array<{ isOpen: boolean }>;`,
      },
      {
        name: 'an inline boolean parameter of a callback is not a prop',
        code: `const labels = items.map((item: { isOn: boolean }) => String(item.isOn));`,
      },
      {
        name: 'a generic call argument is not a props type',
        code: `const [state] = useState<{ isOpen: boolean }>(init);`,
      },
    ],
    invalid: [
      {
        name: 'a quoted is-prefixed boolean key',
        code: "interface Props { 'isLooped': boolean; }",
        errors: [
          {
            messageId: 'isPrefix',
            suggestions: [
              {
                messageId: 'renameSuggestion',
                output: 'interface Props { looped: boolean; }',
              },
            ],
          },
        ],
      },
      {
        name: 'an is-prefixed prop typed boolean | undefined',
        code: 'type Props = { isLooped?: boolean | undefined };',
        errors: [
          {
            messageId: 'isPrefix',
            suggestions: [
              {
                messageId: 'renameSuggestion',
                output: 'type Props = { looped?: boolean | undefined };',
              },
            ],
          },
        ],
      },
      {
        name: 'an is-prefixed boolean prop',
        code: `interface Props { isLooped: boolean; }`,
        errors: [
          {
            messageId: 'isPrefix',
            suggestions: [
              {
                messageId: 'renameSuggestion',
                output: `interface Props { looped: boolean; }`,
              },
            ],
          },
        ],
      },
      {
        code: `type Props = { isOpen: boolean; };`,
        errors: [
          {
            messageId: 'isPrefix',
            suggestions: [
              {
                messageId: 'renameSuggestion',
                output: `type Props = { open: boolean; };`,
              },
            ],
          },
        ],
      },
      {
        /*
         * `isTTY` mirrors Node's own `process.stdin` shape. The rename has to
         * stay a usable identifier: a leading run of capitals is an acronym,
         * not a word boundary.
         * @found burgee FP/FN sweep 2026-09-15, packages/flagstaff/src/ora.ts:76
         */
        name: 'an acronym after the prefix lowercases as a whole run, not one character',
        code: `interface Props { isTTY: boolean; }`,
        errors: [
          {
            messageId: 'isPrefix',
            suggestions: [
              {
                messageId: 'renameSuggestion',
                output: `interface Props { tty: boolean; }`,
              },
            ],
          },
        ],
      },
      {
        // The acronym run ends where the next word starts, so the capital that
        // begins that word survives: `isURLPath` -> `urlPath`, not `urlpath`.
        name: 'an acronym followed by a word keeps the word boundary',
        code: `interface Props { isURLPath: boolean; }`,
        errors: [
          {
            messageId: 'isPrefix',
            suggestions: [
              {
                messageId: 'renameSuggestion',
                output: `interface Props { urlPath: boolean; }`,
              },
            ],
          },
        ],
      },
      {
        // A digit is not a word start, so the whole capital run is the
        // acronym: `isURL2FA` -> `url2FA`, not `urL2FA`. PR #1067 review.
        name: 'an acronym followed by a digit lowercases the whole run',
        code: `interface Props { isURL2FA: boolean; }`,
        errors: [
          {
            messageId: 'isPrefix',
            suggestions: [
              {
                messageId: 'renameSuggestion',
                output: `interface Props { url2FA: boolean; }`,
              },
            ],
          },
        ],
      },
      {
        /*
         * A two-letter acronym.
         * @found burgee FP/FN sweep 2026-09-15, packages/caique/src/terminal.ts:20
         */
        name: 'a two-letter acronym lowercases fully',
        code: `interface Props { isID: boolean; }`,
        errors: [
          {
            messageId: 'isPrefix',
            suggestions: [
              {
                messageId: 'renameSuggestion',
                output: `interface Props { id: boolean; }`,
              },
            ],
          },
        ],
      },
      {
        code: `interface Props { isDisabled: boolean; isHidden: boolean; }`,
        errors: [
          {
            messageId: 'isPrefix',
            suggestions: [
              {
                messageId: 'renameSuggestion',
                output: `interface Props { disabled: boolean; isHidden: boolean; }`,
              },
            ],
          },
          {
            messageId: 'isPrefix',
            suggestions: [
              {
                messageId: 'renameSuggestion',
                output: `interface Props { isDisabled: boolean; hidden: boolean; }`,
              },
            ],
          },
        ],
      },
      {
        name: 'an inline boolean prop of a PascalCase function component',
        code: `export function Card(props: { isOpen: boolean }) { return <div />; }`,
        errors: [
          {
            messageId: 'isPrefix',
            suggestions: [
              {
                messageId: 'renameSuggestion',
                output: `export function Card(props: { open: boolean }) { return <div />; }`,
              },
            ],
          },
        ],
      },
      {
        name: 'an inline boolean prop of a destructured function component',
        code: `function Card({ isOpen }: { isOpen: boolean }) { return <div />; }`,
        errors: [
          {
            messageId: 'isPrefix',
            suggestions: [
              {
                messageId: 'renameSuggestion',
                output: `function Card({ isOpen }: { open: boolean }) { return <div />; }`,
              },
            ],
          },
        ],
      },
      {
        name: 'an inline boolean prop of a PascalCase arrow component',
        code: `const Card = ({ isOpen }: { isOpen: boolean }) => <div />;`,
        errors: [
          {
            messageId: 'isPrefix',
            suggestions: [
              {
                messageId: 'renameSuggestion',
                output: `const Card = ({ isOpen }: { open: boolean }) => <div />;`,
              },
            ],
          },
        ],
      },
      {
        name: 'an inline boolean prop of a lowercase arrow that returns JSX',
        code: `const card = (props: { isOpen: boolean }) => <div />;`,
        errors: [
          {
            messageId: 'isPrefix',
            suggestions: [
              {
                messageId: 'renameSuggestion',
                output: `const card = (props: { open: boolean }) => <div />;`,
              },
            ],
          },
        ],
      },
      {
        name: 'an inline boolean prop of a lowercase function declaration that returns JSX',
        code: `function card(props: { isOpen: boolean }) { return <div />; }`,
        errors: [
          {
            messageId: 'isPrefix',
            suggestions: [
              {
                messageId: 'renameSuggestion',
                output: `function card(props: { open: boolean }) { return <div />; }`,
              },
            ],
          },
        ],
      },
      {
        name: 'a boolean prop in the type argument of FC',
        code: `const Card: FC<{ isOpen: boolean }> = () => null;`,
        errors: [
          {
            messageId: 'isPrefix',
            suggestions: [
              {
                messageId: 'renameSuggestion',
                output: `const Card: FC<{ open: boolean }> = () => null;`,
              },
            ],
          },
        ],
      },
      {
        name: 'a boolean prop in the type argument of React.FC',
        code: `const Card: React.FC<{ isOpen: boolean }> = () => null;`,
        errors: [
          {
            messageId: 'isPrefix',
            suggestions: [
              {
                messageId: 'renameSuggestion',
                output: `const Card: React.FC<{ open: boolean }> = () => null;`,
              },
            ],
          },
        ],
      },
      {
        name: 'an inline boolean prop of an anonymous default-exported component',
        code: `export default function (props: { isOpen: boolean }) { return <div />; }`,
        errors: [
          {
            messageId: 'isPrefix',
            suggestions: [
              {
                messageId: 'renameSuggestion',
                output: `export default function (props: { open: boolean }) { return <div />; }`,
              },
            ],
          },
        ],
      },
    ],
  });
});
