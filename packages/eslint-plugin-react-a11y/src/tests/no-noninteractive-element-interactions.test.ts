/**
 * Tests for no-noninteractive-element-interactions rule
 * Accessibility: WCAG 2.1.1 Keyboard (Level A)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noNoninteractiveElementInteractions } from '../rules/no-noninteractive-element-interactions';

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

describe('no-noninteractive-element-interactions', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid interactions', noNoninteractiveElementInteractions, {
      valid: [
        { name: 'the same handler on a button', code: '<button onClick={handler}>Click</button>' },
        { code: '<a href="#" onClick={handler}>Link</a>' },
        { code: '<input onClick={handler} />' },
        { code: '<div role="button" onClick={handler}></div>' },
        { code: '<p>Text only</p>' },
        { code: '<article></article>' },
        // jsx-a11y contract: presentation, hidden from AT and contentEditable are exempt
        { name: 'role presentation opts a non-interactive element out', code: '<li onClick={handler} role="presentation">x</li>' },
        { name: 'role none opts a non-interactive element out', code: '<li onClick={handler} role="none">x</li>' },
        { name: 'aria-hidden element is exempt', code: '<li onClick={handler} aria-hidden="true">x</li>' },
        { name: 'dynamic contentEditable may make it an editing surface', code: '<p onKeyDown={handler} contentEditable={editable}>x</p>' },
        { name: 'contentEditable element is exempt', code: '<p onKeyDown={handler} contentEditable="true">x</p>' },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - interactions on non-interactive', noNoninteractiveElementInteractions, {
      valid: [],
      invalid: [
        { name: 'a click handler on a paragraph', code: '<p onClick={handler}>Click me</p>', errors: [{ messageId: 'noInteraction' }] },
        { code: '<article onClick={handler}>Content</article>', errors: [{ messageId: 'noInteraction' }] },
        { code: '<section onClick={handler}>Section</section>', errors: [{ messageId: 'noInteraction' }] },
        // An explicit non-interactive WAI-ARIA role makes any element non-interactive
        { name: 'explicit non-interactive role article on a div', code: '<div role="article" onClick={handler}>x</div>', errors: [{ messageId: 'noInteraction' }] },
        { name: 'contentEditable false is not an editing surface', code: '<p onKeyDown={handler} contentEditable="false">x</p>', errors: [{ messageId: 'noInteraction' }] },
        { name: 'contentEditable undefined is not an editing surface', code: '<p onKeyDown={handler} contentEditable={undefined}>x</p>', errors: [{ messageId: 'noInteraction' }] },
        { name: 'explicit non-interactive role listitem on a div', code: '<div role="listitem" onClick={handler}>x</div>', errors: [{ messageId: 'noInteraction' }] },
      ],
    });
  });
});
