/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Layer-1 coverage tests (real parser via RuleTester) for branch gaps in the
 * component-api rules. Each case targets a specific previously-uncovered branch.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noArbitraryTokenClass } from '../../rules/component-api/no-arbitrary-token-class';
import { noInlineStyle } from '../../rules/component-api/no-inline-style';
import { noIsPrefixProp } from '../../rules/component-api/no-is-prefix-prop';
import { noKindPropDiscriminator } from '../../rules/component-api/no-kind-prop-discriminator';
import { noRawColorLiteral } from '../../rules/component-api/no-raw-color-literal';
import { noWrapperSubComponent } from '../../rules/component-api/no-wrapper-sub-component';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2020,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

describe('no-arbitrary-token-class coverage gaps', () => {
  ruleTester.run('no-arbitrary-token-class', noArbitraryTokenClass, {
    valid: [
      { name: 'template literal without arbitrary tokens', code: 'const a = <div className={`p-4 flex`} />;' },
      { name: 'member callee cn-like call is ignored', code: 'const a = styles.cn("px-[18px]");' },
      { name: 'non-string className literal expression', code: 'const a = <div className={42} />;' },
    ],
    invalid: [
      {
        name: 'template literal with arbitrary token class',
        code: 'const a = <div className={`rounded-[12px] ${extra}`} />;',
        errors: [{ messageId: 'arbitraryClass', data: { cls: 'rounded-[12px]' } }],
      },
    ],
  });
});

describe('no-inline-style coverage gaps', () => {
  ruleTester.run('no-inline-style', noInlineStyle, {
    valid: [
      { name: 'style attribute without value', code: 'const a = <div style />;' },
      { name: 'style attribute with string value', code: 'const a = <div style="color: red" />;' },
      { name: 'style object with only spread', code: 'const a = <div style={{ ...base }} />;' },
      { name: 'style object with CSS variable string key', code: 'const a = <div style={{ "--token": "12px" }} />;' },
    ],
    invalid: [
      {
        name: 'style object with spread plus static literal',
        code: 'const a = <div style={{ ...base, margin: 4 }} />;',
        errors: [{ messageId: 'inlineStyle' }],
      },
    ],
  });
});

describe('no-is-prefix-prop coverage gaps', () => {
  ruleTester.run('no-is-prefix-prop', noIsPrefixProp, {
    valid: [
      { name: 'is-prefix prop without type annotation', code: 'interface P { isFoo; }' },
      { name: 'is-prefix prop with non-boolean type', code: 'interface P { isFoo: string; }' },
    ],
    invalid: [],
  });
});

describe('no-kind-prop-discriminator coverage gaps', () => {
  ruleTester.run('no-kind-prop-discriminator', noKindPropDiscriminator, {
    valid: [
      { name: 'non-flagged prop name with string union', code: "interface P { variant: 'a' | 'b'; }" },
    ],
    invalid: [],
  });
});

describe('no-raw-color-literal coverage gaps', () => {
  ruleTester.run('no-raw-color-literal', noRawColorLiteral, {
    valid: [
      { name: 'non-cn identifier call with color string', code: 'logColor("#ff0000");' },
      { name: 'member callee call with color string', code: 'palette.cn("#ff0000");' },
    ],
    invalid: [],
  });
});

describe('no-wrapper-sub-component coverage gaps', () => {
  ruleTester.run('no-wrapper-sub-component', noWrapperSubComponent, {
    valid: [
      { name: 'arrow with non-JSX concise body', code: 'const Wrapper = () => 42;' },
      { name: 'block body with non-return statement', code: 'function Wrapper(props) { doWork(); }' },
      { name: 'block body with bare return', code: 'function Wrapper(props) { return; }' },
      { name: 'block body returning non-JSX', code: 'function Wrapper(props) { return 42; }' },
      { name: 'single non-spread attribute', code: 'const Wrapper = (props) => <Chip variant="a" />;' },
      { name: 'spread of non-identifier argument', code: 'const Wrapper = (props) => <Chip {...{ merged: true }} />;' },
      { name: 'lowercase passthrough element', code: 'const Wrapper = (props) => <div {...props} />;' },
      { name: 'anonymous default function declaration', code: 'export default function (props) { return <Chip {...props} />; }' },
      { name: 'declarator without initializer', code: 'let Wrapper;' },
      { name: 'declarator with non-function initializer', code: 'const Wrapper = 42;' },
    ],
    invalid: [
      {
        name: 'member-expression passthrough element is flagged',
        code: 'const Wrapper = (props) => <Chip.Root {...props} />;',
        errors: [{ messageId: 'wrapperSubComponent' }],
      },
    ],
  });
});
