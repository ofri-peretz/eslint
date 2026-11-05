/**
 * Tests for no-aria-hidden-on-focusable rule
 * Accessibility: WCAG 4.1.2 Name, Role, Value (Level A)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noAriaHiddenOnFocusable } from '../rules/no-aria-hidden-on-focusable';

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

describe('no-aria-hidden-on-focusable', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - no aria-hidden on focusable', noAriaHiddenOnFocusable, {
      valid: [
        {
          // @found corpus scan (okta-signin-widget): not extended to components
          name: 'a braced aria-hidden on a component is not judged',
          code: '<Comp aria-hidden={true} tabIndex={0} />',
        },
        { name: 'aria-hidden on a plain div', code: '<div aria-hidden="true"></div>' },
        { code: '<span aria-hidden="true"></span>' },
        { code: '<button>Click</button>' },
        { code: '<a href="#">Link</a>' },
        { code: '<button aria-hidden="false">Click</button>' },
        { code: '<div tabIndex={-1} aria-hidden="true"></div>' },
        {
          name: 'an anchor without href is not focusable',
          code: '<a aria-hidden="true">x</a>',
        },
        {
          name: 'a hidden input is not focusable',
          code: '<input type="hidden" name="id" aria-hidden="true" />',
        },
        {
          name: 'tabIndex -1 takes a native control out of the tab order',
          code: '<button type="button" tabIndex={-1} aria-hidden="true">x</button>',
        },
        {
          name: 'a disabled control cannot take focus',
          code: '<button type="button" disabled aria-hidden="true">x</button>',
        },
        {
          name: 'aria-hidden={false} does not hide',
          code: '<button aria-hidden={false}>x</button>',
        },
        {
          name: 'a hidden state the file cannot know',
          code: '<button aria-hidden={hidden}>x</button>',
        },
        {
          name: 'a tabIndex the file cannot know on a div',
          code: '<div tabIndex={index} aria-hidden="true">x</div>',
        },
        {
          name: 'a disabled state the file cannot know',
          code: '<button disabled={busy} aria-hidden="true">x</button>',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - aria-hidden on focusable', noAriaHiddenOnFocusable, {
      valid: [],
      invalid: [
        { name: 'aria-hidden on a focusable element — reachable by tab, invisible to the reader', code: '<button aria-hidden="true">Click</button>', errors: [{ messageId: 'ariaHiddenFocusable' }] },
        { code: '<a href="#" aria-hidden="true">Link</a>', errors: [{ messageId: 'ariaHiddenFocusable' }] },
        { code: '<input aria-hidden="true" />', errors: [{ messageId: 'ariaHiddenFocusable' }] },
        {
          name: 'aria-hidden={true} hides a focusable button',
          code: '<button aria-hidden={true}>x</button>',
          errors: [{ messageId: 'ariaHiddenFocusable' }],
        },
        {
          name: 'the bare aria-hidden attribute hides a focusable select',
          code: '<select aria-hidden><option>a</option></select>',
          errors: [{ messageId: 'ariaHiddenFocusable' }],
        },
        {
          name: 'tabIndex={0} makes a div focusable',
          code: '<div tabIndex={0} aria-hidden="true">x</div>',
          errors: [{ messageId: 'ariaHiddenFocusable' }],
        },
        {
          name: 'a non-numeric tabIndex leaves a native control focusable',
          code: '<button tabIndex="x" aria-hidden="true">x</button>',
          errors: [{ messageId: 'ariaHiddenFocusable' }],
        },
        {
          name: 'disabled={false} leaves the control focusable',
          code: '<button disabled={false} aria-hidden="true">x</button>',
          errors: [{ messageId: 'ariaHiddenFocusable' }],
        },
      ],
    });
  });
});
