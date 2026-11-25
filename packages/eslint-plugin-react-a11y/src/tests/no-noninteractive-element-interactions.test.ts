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
        { name: 'a link with href is interactive', code: '<a href="#" onClick={handler}>Link</a>' },
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

/**
 * Element-keyed handler lists, with the options object of upstream's
 * `recommended` preset for this rule (`src/index.js` v6.10.2, lines 119-137).
 * Cases follow `__tests__/src/rules/no-noninteractive-element-interactions-test.js`:
 * `<body onLoad>`, `<iframe onLoad>` and `<img onLoad>` are valid under those
 * options, `<iframe onClick>` and `<div role="article" onLoad>` are not.
 */
const UPSTREAM_RECOMMENDED_OPTIONS = {
  handlers: ['onClick', 'onError', 'onLoad', 'onMouseDown', 'onMouseUp', 'onKeyPress', 'onKeyDown', 'onKeyUp'],
  alert: ['onKeyUp', 'onKeyDown', 'onKeyPress'],
  body: ['onError', 'onLoad'],
  dialog: ['onKeyUp', 'onKeyDown', 'onKeyPress'],
  iframe: ['onError', 'onLoad'],
  img: ['onError', 'onLoad'],
};

describe('no-noninteractive-element-interactions element keys', () => {
  ruleTester.run('element-keyed handlers', noNoninteractiveElementInteractions, {
    valid: [
      {
        name: 'body onLoad, allowed for body',
        code: '<body onLoad={() => {}} />;',
        options: [UPSTREAM_RECOMMENDED_OPTIONS],
      },
      {
        name: 'body onError, allowed for body',
        code: '<body onError={() => {}} />;',
        options: [UPSTREAM_RECOMMENDED_OPTIONS],
      },
      {
        name: 'iframe onLoad, allowed for iframe',
        code: '<iframe onLoad={() => {}} />;',
        options: [UPSTREAM_RECOMMENDED_OPTIONS],
      },
      {
        name: 'img onLoad, allowed for img',
        code: '<img onLoad={() => {}} />;',
        options: [UPSTREAM_RECOMMENDED_OPTIONS],
      },
      {
        name: 'img onError among other attributes, allowed for img',
        code: '<img src={url} onError={() => {}} alt="for review" />;',
        options: [UPSTREAM_RECOMMENDED_OPTIONS],
      },
    ],
    invalid: [
      {
        name: 'iframe onClick is not in its allowed list',
        code: '<iframe onClick={() => {}} />;',
        options: [UPSTREAM_RECOMMENDED_OPTIONS],
        errors: [{ messageId: 'noInteraction' }],
      },
      {
        name: 'an article-role div with onLoad is not covered by the img key',
        code: '<div role="article" onLoad={() => {}} />;',
        options: [UPSTREAM_RECOMMENDED_OPTIONS],
        errors: [{ messageId: 'noInteraction' }],
      },
      {
        name: 'img onLoad when only the body key lists it',
        code: '<img onLoad={() => {}} />;',
        options: [{ handlers: ['onLoad'], body: ['onLoad'] }],
        errors: [{ messageId: 'noInteraction' }],
      },
      {
        name: 'img onClick is not in the img list',
        code: '<img onClick={() => {}} />;',
        options: [UPSTREAM_RECOMMENDED_OPTIONS],
        errors: [{ messageId: 'noInteraction' }],
      },
      {
        name: 'a non-array element key is not a handler list',
        code: '<img onLoad={() => {}} />;',
        options: [{ handlers: ['onLoad'], img: 'onLoad' }],
        errors: [{ messageId: 'noInteraction' }],
      },
    ],
  });
});
