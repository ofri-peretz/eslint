/**
 * Tests for mouse-events-have-key-events rule
 * Accessibility: WCAG 2.1.1 Keyboard (Level A)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { mouseEventsHaveKeyEvents } from '../rules/mouse-events-have-key-events';

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

describe('mouse-events-have-key-events', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - mouse with key events', mouseEventsHaveKeyEvents, {
      valid: [
        { name: 'both present', code: '<div onMouseOver={handler} onFocus={handler}></div>' },
        { name: 'onMouseOut with onBlur', code: '<div onMouseOut={handler} onBlur={handler}></div>' },
        { code: '<div onMouseEnter={handler} onFocus={handler}></div>' },
        { code: '<div onMouseLeave={handler} onBlur={handler}></div>' },
        { code: '<div></div>' },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - mouse without key events', mouseEventsHaveKeyEvents, {
      valid: [],
      invalid: [
      {
        name: 'the same omission on a different element',
        code: '<span onMouseOver={handler}></span>',
        errors: [{ messageId: 'missingOnFocus' }],
      },
        { name: 'onMouseOver with no onFocus', code: '<div onMouseOver={handler}></div>', errors: [{ messageId: 'missingOnFocus' }] },
        { code: '<div onMouseOut={handler}></div>', errors: [{ messageId: 'missingOnBlur' }] },
      ],
    });
  });
});

/**
 * `hoverInHandlers` / `hoverOutHandlers`, cases ported from upstream's
 * `__tests__/src/rules/mouse-events-have-key-events-test.js` at v6.10.2
 * (the `<div>` cases that carry these options). Upstream's `<MyElement>`
 * cases and the `onFocus={undefined}` cases test other behaviour and are not
 * ported: this rule still treats a custom component like a DOM element, and an
 * `onFocus` that is present like one that is set.
 */
describe('mouse-events-have-key-events options', () => {
  ruleTester.run('hoverInHandlers and hoverOutHandlers', mouseEventsHaveKeyEvents, {
    valid: [
      {
        name: 'empty option lists check no handler',
        code: '<div onMouseOver={() => {}} onMouseOut={() => {}} />',
        options: [{ hoverInHandlers: [], hoverOutHandlers: [] }],
      },
      {
        name: 'onMouseOver with onFocus when it is listed',
        code: '<div onMouseOver={() => {}} onFocus={() => {}} />',
        options: [{ hoverInHandlers: ['onMouseOver'] }],
      },
      {
        name: 'onMouseEnter with onFocus when it is listed',
        code: '<div onMouseEnter={() => {}} onFocus={() => {}} />',
        options: [{ hoverInHandlers: ['onMouseEnter'] }],
      },
      {
        name: 'onMouseOut with onBlur when it is listed',
        code: '<div onMouseOut={() => {}} onBlur={() => {}} />',
        options: [{ hoverOutHandlers: ['onMouseOut'] }],
      },
      {
        name: 'onMouseLeave with onBlur when it is listed',
        code: '<div onMouseLeave={() => {}} onBlur={() => {}} />',
        options: [{ hoverOutHandlers: ['onMouseLeave'] }],
      },
      {
        name: 'the default handlers are not checked once others are listed',
        code: '<div onMouseOver={() => {}} onMouseOut={() => {}} />',
        options: [{ hoverInHandlers: ['onPointerEnter'], hoverOutHandlers: ['onPointerLeave'] }],
      },
      {
        name: 'a listed hover-out handler leaves hover-in unlisted handlers alone',
        code: '<div onMouseLeave={() => {}} />',
        options: [{ hoverOutHandlers: ['onPointerLeave'] }],
      },
    ],
    invalid: [
      {
        name: 'listing the defaults explicitly reports both',
        code: '<div onMouseOver={() => {}} onMouseOut={() => {}} />',
        options: [{ hoverInHandlers: ['onMouseOver'], hoverOutHandlers: ['onMouseOut'] }],
        errors: [{ messageId: 'missingOnFocus' }, { messageId: 'missingOnBlur' }],
      },
      {
        name: 'pointer handlers when they are listed',
        code: '<div onPointerEnter={() => {}} onPointerLeave={() => {}} />',
        options: [{ hoverInHandlers: ['onPointerEnter'], hoverOutHandlers: ['onPointerLeave'] }],
        errors: [
          { messageId: 'missingOnFocus', data: { handler: 'onPointerEnter' } },
          { messageId: 'missingOnBlur', data: { handler: 'onPointerLeave' } },
        ],
      },
      {
        name: 'a listed hover-in handler alone',
        code: '<div onPointerEnter={() => {}} />',
        options: [{ hoverInHandlers: ['onPointerEnter'] }],
        errors: [{ messageId: 'missingOnFocus', data: { handler: 'onPointerEnter' } }],
      },
      {
        name: 'a listed hover-out handler alone',
        code: '<div onPointerLeave={() => {}} />',
        options: [{ hoverOutHandlers: ['onPointerLeave'] }],
        errors: [{ messageId: 'missingOnBlur', data: { handler: 'onPointerLeave' } }],
      },
      {
        name: 'a spread does not stand in for onFocus (upstream case)',
        code: '<div onMouseOver={() => void 0} {...props} />',
        errors: [{ messageId: 'missingOnFocus', data: { handler: 'onMouseOver' } }],
      },
      {
        name: 'a namespaced attribute next to the handler is not a handler',
        code: '<svg xlink:href="#a" onMouseOut={() => {}} />',
        errors: [{ messageId: 'missingOnBlur', data: { handler: 'onMouseOut' } }],
      },
      {
        name: 'only the first listed handler present is named',
        code: '<div onMouseEnter={() => {}} onMouseOver={() => {}} />',
        options: [{ hoverInHandlers: ['onMouseOver', 'onMouseEnter'] }],
        errors: [{ messageId: 'missingOnFocus', data: { handler: 'onMouseOver' } }],
      },
    ],
  });
});
