/**
 * @fileoverview Tests for no-danger-with-children rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDangerWithChildren } from '../../rules/react/no-danger-with-children';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

describe('no-danger-with-children', () => {
  ruleTester.run('no-danger-with-children', noDangerWithChildren, {
    valid: [
      // Only dangerouslySetInnerHTML, no children
      {
        name: 'dangerouslySetInnerHTML with no children beside it',
        code: '<div dangerouslySetInnerHTML={{ __html: "<p>hello</p>" }} />',
      },
      // Only children, no dangerouslySetInnerHTML
      '<div>Hello</div>',
      '<div><span>Hello</span></div>',
      // No props
      '<div />',
      // Regular component
      '<MyComponent>Content</MyComponent>',
      {
        name: 'dangerouslySetInnerHTML={undefined} is not set',
        code: '<div dangerouslySetInnerHTML={undefined}>Some text</div>',
      },
      {
        name: 'children={undefined} is no children',
        code: '<div dangerouslySetInnerHTML={{ __html: html }} children={undefined} />',
      },
      {
        name: 'a {undefined} child renders nothing',
        code: '<div dangerouslySetInnerHTML={{ __html: html }}>{undefined}</div>',
      },
      {
        name: 'createElement with an undefined third argument has no children',
        code: 'import React from "react"; React.createElement("div", { dangerouslySetInnerHTML: { __html: html } }, undefined);',
      },
      {
        name: 'createElement with dangerouslySetInnerHTML: null',
        code: 'import React from "react"; React.createElement("div", { dangerouslySetInnerHTML: null }, "text");',
      },
      {
        name: 'a local createElement is not React',
        code: 'function createElement(...a) { return a; } createElement("div", { dangerouslySetInnerHTML: x }, "text");',
      },
    ],
    invalid: [
      {
        name: 'dangerouslySetInnerHTML together with children — React drops one',
        code: '<div dangerouslySetInnerHTML={{ __html: "<p>hello</p>" }}>Children</div>',
        errors: [{ messageId: 'dangerWithChildren' }],
      },
      {
        code: '<div dangerouslySetInnerHTML={{ __html: "<p>hello</p>" }}><span>Child</span></div>',
        errors: [{ messageId: 'dangerWithChildren' }],
      },
      {
        code: '<div dangerouslySetInnerHTML={{ __html: html }} children="text" />',
        errors: [{ messageId: 'dangerWithChildren' }],
      },
      {
        code: '<MyComponent dangerouslySetInnerHTML={{ __html: html }}>Content</MyComponent>',
        errors: [{ messageId: 'dangerWithChildren' }],
      },
      {
        name: 'a single space between the tags is a text child',
        code: '<div dangerouslySetInnerHTML={{ __html: html }}> </div>',
        errors: [{ messageId: 'dangerWithChildren' }],
      },
      {
        name: 'a named createElement import with a children argument',
        code: 'import { createElement } from "react"; createElement("div", { dangerouslySetInnerHTML: { __html: html } }, "text");',
        errors: [{ messageId: 'dangerWithChildren' }],
      },
      {
        name: 'a quoted children key beside dangerouslySetInnerHTML',
        code: 'import * as R from "react"; R.createElement("div", { "dangerouslySetInnerHTML": { __html: html }, "children": "text" });',
        errors: [{ messageId: 'dangerWithChildren' }],
      },
      {
        name: 'two undefined children arguments still make an array',
        code: 'import React from "react"; React.createElement("div", { dangerouslySetInnerHTML: { __html: html } }, undefined, undefined);',
        errors: [{ messageId: 'dangerWithChildren' }],
      },
    ],
  });
});
