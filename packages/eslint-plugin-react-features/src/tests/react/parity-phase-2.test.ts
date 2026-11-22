/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Branches of the phase-2 parity work (`no-unknown-property`, `no-deprecated`,
 * `jsx-no-target-blank`, `display-name`) that eslint-plugin-react's own cases
 * do not reach, and the review findings on it.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { displayName } from '../../rules/react/display-name';
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
      {
        name: 'an is attribute with a value makes the element a custom element',
        code: '<div is="x-banner" class="banner" />',
      },
      {
        name: 'a dynamic is attribute may name a custom element',
        code: '<div is={tag} class="banner" />',
      },
      {
        name: 'a bare is attribute is not judged',
        code: '<div is class="banner" />',
      },
      {
        name: 'autoReverse and allowReorder are SVG props React supports',
        code: '<animate autoReverse="true" allowReorder="yes" externalResourcesRequired="true" />',
      },
      {
        name: 'scoped is an HTML property React supports',
        code: '<style scoped />',
      },
      {
        name: 'onAnimationIterationCapture has a capture twin like the other animation events',
        code: '<div onAnimationIterationCapture={f} />',
      },
      {
        name: 'onLoad and onError are listeners on an SVG image',
        code: '<image onLoad={f} onError={g} />',
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
      {
        name: 'is={null} makes no custom element, so an ordinary element is still checked',
        code: '<div is={null} class="banner" />',
        errors: [{ messageId: 'noUnknownProperty' }],
      },
      {
        name: 'is={false} makes no custom element',
        code: '<div is={false} class="banner" />',
        errors: [{ messageId: 'noUnknownProperty' }],
      },
      {
        name: 'is={undefined} makes no custom element',
        code: '<div is={undefined} class="banner" />',
        errors: [{ messageId: 'noUnknownProperty' }],
      },
      {
        name: 'pointer enter and leave have no capture twin',
        code: '<div onPointerEnterCapture={f} onPointerLeaveCapture={g} />',
        errors: [
          { messageId: 'noUnknownProperty' },
          { messageId: 'noUnknownProperty' },
        ],
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
        name: 'an import from another module is not read',
        code: 'import { createClass } from "./mine";',
      },
      {
        name: 'a spread and a computed key in a createReactClass spec name no lifecycle',
        code: 'createReactClass({ ...base, [key]: 1, render() {} });',
      },
      {
        name: 'a local factory with a createClass method is not React',
        code: 'const factory = { createClass: (x) => x }; factory.createClass({ componentWillMount: "metadata" });',
      },
      {
        name: 'a local createReactClass is not the ambient factory',
        code: 'const createReactClass = (x) => x; createReactClass({ componentWillMount() {} });',
      },
      {
        name: 'a member call on an unrelated object is not React.createClass',
        code: 'other.createClass({ componentWillMount() {} });',
      },
      {
        name: "Preact's own render is not React.render",
        code: 'import { h, render } from "preact"; render(h("div"), el);',
      },
      {
        name: 'a call that is not a factory call leaves its object alone',
        code: 'wrap({ componentWillMount() {} });',
      },
      {
        name: 'a createReactClass spec passed as a second argument is not the spec',
        code: 'createReactClass(a, { componentWillMount() {} });',
      },
      {
        name: 'a computed member is not a named factory',
        code: 'React[name]({ componentWillMount() {} });',
      },
    ],
    invalid: [
      {
        name: 'a lifecycle beside a spread and a computed key in a createReactClass spec',
        code: 'createReactClass({ ...base, [key]: 1, componentWillMount() {} });',
        errors: [{ messageId: 'deprecated' }],
      },
      {
        name: 'a string-named import of a deprecated export, never used',
        code: 'import { "createClass" as made } from "react";',
        errors: [{ messageId: 'deprecated' }],
      },
      {
        name: 'the create-react-class package is the factory too',
        code: 'import createReactClass from "create-react-class"; createReactClass({ componentWillMount() {} });',
        errors: [{ messageId: 'deprecated' }],
      },
      {
        name: 'React.createClass is deprecated, and so is the lifecycle in its spec',
        code: 'import React from "react"; React.createClass({ componentWillMount() {} });',
        errors: [{ messageId: 'deprecated' }, { messageId: 'deprecated' }],
      },
      {
        name: 'preact/compat follows React, so its render is the deprecated one',
        code: 'import { render } from "preact/compat"; render(x, y);',
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
      {
        name: 'a ternary target with one unknown branch, paired with a rel on the same condition',
        code: '<a href="https://example.com" target={c ? foo : "_self"} rel={c ? "noreferrer" : undefined} />',
      },
      {
        name: 'a stable member, unary and logical condition is one observation',
        code: '<a href="https://example.com" target={!a.b && this.c ? "_blank" : undefined} rel={!a.b && this.c ? "noreferrer" : undefined} />',
      },
    ],
    invalid: [
      {
        name: 'a ternary target with an unknown branch and no rel',
        code: '<a href="https://example.com" target={c ? foo : "_self"} />',
        output:
          '<a href="https://example.com" target={c ? foo : "_self"} rel="noopener noreferrer" />',
        errors: [{ messageId: 'noTargetBlank' }],
      },
      {
        name: 'a condition with side effects is not one observation',
        code: '<a href="https://example.com" target={i++ === 0 ? "_blank" : "_self"} rel={i++ === 0 ? "noreferrer" : ""} />',
        errors: [{ messageId: 'noRelWithoutNoopener' }],
      },
      {
        name: 'delete is not a stable condition',
        code: '<a href="https://example.com" target={delete o.x ? "_blank" : undefined} rel={delete o.x ? "noreferrer" : undefined} />',
        errors: [{ messageId: 'noRelWithoutNoopener' }],
      },
      {
        name: 'every branch that is _blank needs its own safe rel',
        code: '<a href="https://example.com" target={c ? "_blank" : "_blank"} rel={c ? "noreferrer" : ""} />',
        errors: [{ messageId: 'noRelWithoutNoopener' }],
      },
      {
        name: 'a dynamic target branch counts as possibly _blank',
        code: '<a href="https://example.com" target={c ? "_blank" : t} rel={c ? "noreferrer" : ""} />',
        errors: [{ messageId: 'noRelWithoutNoopener' }],
      },
      {
        name: 'a spread after the target can replace it, so the target says nothing about rel',
        code: '<a target={c ? "_blank" : "_self"} {...props} href="https://example.com" rel={c ? "noreferrer" : undefined} />',
        options: [{ warnOnSpreadAttributes: true }],
        errors: [{ messageId: 'noRelWithoutNoopener' }],
      },
    ],
  });

  ruleTester.run('display-name', displayName, {
    valid: [
      {
        name: 'a later module.exports.displayName names a CommonJS function export',
        code: "module.exports = () => <div />; module.exports.displayName = 'App';",
      },
      {
        name: 'a later module.exports.displayName names a createReactClass export',
        code: "module.exports = createReactClass({ render() { return <div />; } }); module.exports.displayName = 'App';",
      },
      {
        name: 'a factory that returns a named component does not render itself',
        code: 'module.exports = () => { function Named() { return <div />; } return Named; };',
      },
      {
        name: 'a factory that declares a class does not render itself',
        code: 'module.exports = function () { class A { render() { return <div />; } } return A; };',
      },
    ],
    invalid: [
      {
        name: 'an anonymous component returned through a type assertion',
        code: 'function makeRenderer() { return (() => <div />) as React.FC; }',
        errors: [{ messageId: 'displayName' }],
      },
      {
        name: 'an anonymous component returned from a factory that does not render itself',
        code: 'module.exports = () => () => <div />;',
        errors: [{ messageId: 'displayName' }],
      },
    ],
  });
});
