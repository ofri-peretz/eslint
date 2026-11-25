/**
 * Tests for no-static-element-interactions rule
 * Accessibility: WCAG 2.1.1 Keyboard (Level A)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noStaticElementInteractions } from '../rules/no-static-element-interactions';

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

describe('no-static-element-interactions', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - proper interactive elements', noStaticElementInteractions, {
      valid: [
        { name: 'the same handler on a button', code: '<button onClick={handler}>Click</button>' },
        { code: '<a href="#" onClick={handler}>Link</a>' },
        // Interactive ARIA role — element is semantically interactive, not static
        { code: '<div role="button" onClick={handler}></div>' },
        { code: '<div role="link" onClick={handler}></div>' },
        { code: '<div></div>' },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - static element with handlers', noStaticElementInteractions, {
      valid: [],
      invalid: [
        { name: 'a click handler on a div', code: '<div onClick={handler}></div>', errors: [{ messageId: 'noStaticInteraction' }] },
        { name: 'the same handler on a span', code: '<span onClick={handler}></span>', errors: [{ messageId: 'noStaticInteraction' }] },
        // <a> without href has no role (HTML-AAM: generic), so it is static
        { name: 'anchor without href is a static element', code: '<a onClick={handler}>x</a>', errors: [{ messageId: 'noStaticInteraction' }] },
        // Non-interactive roles don't make the element interactive
        { code: '<div role="presentation" onClick={handler}></div>', errors: [{ messageId: 'noStaticInteraction' }] },
        { code: '<div role="none" onClick={handler}></div>', errors: [{ messageId: 'noStaticInteraction' }] },
      ],
    });
  });
});

/**
 * `allowExpressionValues`, cases ported from upstream's
 * `__tests__/src/rules/no-static-element-interactions-test.js` at v6.10.2
 * (the `recommended` block, lines ~430-450, and its invalid block, ~486-501).
 */
describe('no-static-element-interactions allowExpressionValues', () => {
  ruleTester.run('allowExpressionValues', noStaticElementInteractions, {
    valid: [
      {
        name: 'a role read from an identifier, allowed',
        code: '<div role={BUTTON} onClick={() => {}} />;',
        options: [{ allowExpressionValues: true }],
      },
      {
        name: 'a ternary of two literal roles, allowed',
        code: '<div role={isButton ? "button" : "link"} onClick={() => {}} />;',
        options: [{ allowExpressionValues: true }],
      },
      {
        name: 'a ternary of a literal and an identifier, allowed',
        code: '<div role={isButton ? "button" : LINK} onClick={() => {}} />;',
        options: [{ allowExpressionValues: true }],
      },
      {
        name: 'a ternary of two identifiers, allowed',
        code: '<div role={isButton ? BUTTON : LINK} onClick={() => {}} />;',
        options: [{ allowExpressionValues: true }],
      },
    ],
    invalid: [
      {
        name: 'a role read from an identifier, by default',
        code: '<div role={BUTTON} onClick={() => {}} />;',
        errors: [{ messageId: 'noStaticInteraction' }],
      },
      {
        name: 'a role read from an identifier, allowExpressionValues false',
        code: '<div role={BUTTON} onClick={() => {}} />;',
        options: [{ allowExpressionValues: false }],
        errors: [{ messageId: 'noStaticInteraction' }],
      },
      {
        name: 'a ternary of literal roles, allowExpressionValues false',
        code: '<div role={isButton ? "button" : "link"} onClick={() => {}} />;',
        options: [{ allowExpressionValues: false }],
        errors: [{ messageId: 'noStaticInteraction' }],
      },
      {
        name: 'allowExpressionValues does not excuse a div with no role',
        code: '<div onClick={() => {}} />;',
        options: [{ allowExpressionValues: true }],
        errors: [{ messageId: 'noStaticInteraction' }],
      },
      {
        name: 'allowExpressionValues does not excuse a literal presentation role',
        code: '<div role="presentation" onClick={() => {}} />;',
        options: [{ allowExpressionValues: true }],
        errors: [{ messageId: 'noStaticInteraction' }],
      },
    ],
  });
});
