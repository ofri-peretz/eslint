/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Branches of the phase-2 parity work (`no-unknown-property`, `no-deprecated`,
 * `jsx-no-target-blank`) that eslint-plugin-react's own cases do not reach.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDeprecated } from '../../rules/react/no-deprecated';
import { jsxNoTargetBlank } from '../../rules/react/jsx-no-target-blank';
import { noUnknownProperty } from '../../rules/react/no-unknown-property';

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

describe('phase 2 branches', () => {
  ruleTester.run('no-unknown-property', noUnknownProperty, {
    valid: [
      {
        name: 'a namespaced element name has no tag to judge a property by',
        code: '<a:b c="1" />;',
      },
      {
        name: 'allowTransparency is still a property before React 16.1',
        code: '<div allowTransparency="true" />',
        settings: { react: { version: '16.0.0' } },
      },
      {
        name: 'pointer events are properties from React 16.4',
        code: '<div onPointerDown={f} />',
        settings: { react: { version: '16.4.0' } },
      },
      {
        name: 'precedence is a property from React 19',
        code: '<link precedence="high" href="a" rel="stylesheet" />',
        settings: { react: { version: '19.0.0' } },
      },
    ],
    invalid: [
      {
        name: 'pointer events are unknown before React 16.4',
        code: '<div onPointerDown={f} />',
        settings: { react: { version: '16.3.0' } },
        errors: [{ messageId: 'noUnknownProperty' }],
      },
      {
        name: 'precedence is unknown before React 19',
        code: '<link precedence="high" href="a" rel="stylesheet" />',
        settings: { react: { version: '18.3.0' } },
        errors: [{ messageId: 'noUnknownProperty' }],
      },
      {
        name: 'a property of another tag is reported on this one, naming the tags',
        code: '<div crossOrigin="anonymous" />',
        errors: [{ messageId: 'invalidPropOnTag' }],
      },
    ],
  });

  ruleTester.run('no-deprecated', noDeprecated, {
    valid: [
      {
        name: 'a deeper this path is not this.transferPropsTo',
        code: 'class A { m() { this.props.transferPropsTo(); } }',
      },
      {
        name: 'a string-named import is not a React export that is deprecated',
        code: 'import { "createClass" as made } from "react";',
      },
      {
        name: 'an import from another module is not read',
        code: 'import { createClass } from "./mine";',
      },
      {
        name: 'a spread and a computed key in a createReactClass spec name no lifecycle',
        code: 'createReactClass({ ...base, [key]: 1, render() {} });',
      },
    ],
    invalid: [
      {
        name: 'a lifecycle beside a spread and a computed key in a createReactClass spec',
        code: 'createReactClass({ ...base, [key]: 1, componentWillMount() {} });',
        errors: [{ messageId: 'deprecated' }],
      },
    ],
  });

  ruleTester.run('jsx-no-target-blank', jsxNoTargetBlank, {
    valid: [
      {
        name: 'a ternary target of known non-blank values is no target at all',
        code: '<a href="https://example.com" target={c ? "_self" : null} />',
      },
    ],
    invalid: [
      {
        name: 'a ternary target with one unknown branch is dynamic, and a rel keyed on it proves nothing',
        code: '<a href="https://example.com" target={c ? foo : "_self"} rel={c ? "noreferrer" : undefined} />',
        errors: [{ messageId: 'noRelWithoutNoopener' }],
      },
      {
        name: 'a ternary target with an unknown branch and no rel',
        code: '<a href="https://example.com" target={c ? foo : "_self"} />',
        output:
          '<a href="https://example.com" target={c ? foo : "_self"} rel="noopener noreferrer" />',
        errors: [{ messageId: 'noTargetBlank' }],
      },
    ],
  });
});
