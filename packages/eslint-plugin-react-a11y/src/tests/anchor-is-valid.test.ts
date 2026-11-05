/**
 * Tests for anchor-is-valid rule
 * Accessibility: WCAG 2.4.4 Link Purpose (Level A)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { anchorIsValid } from '../rules/anchor-is-valid';

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

describe('anchor-is-valid', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid anchors', anchorIsValid, {
      valid: [
        { /* @found fidelity model react-a11y/anchor_is_valid */ name: 'FP: aspects [noHref] does not check href values', code: '<a href="#">x</a>', options: [{ aspects: ['noHref'] }] },
        { /* @found fidelity model react-a11y/anchor_is_valid */ name: 'FP: aspects [noHref] does not check javascript: hrefs', code: '<a href="javascript:void(0)" onClick={go}>x</a>', options: [{ aspects: ['noHref'] }] },
        { /* @found fidelity model react-a11y/anchor_is_valid */ name: 'FP: aspects [preferButton] alone ignores a handler-less #', code: '<a href="#">x</a>', options: [{ aspects: ['preferButton'] }] },
        { /* @found fidelity model react-a11y/anchor_is_valid */ name: 'FP: aspects [invalidHref] alone ignores a missing href', code: '<a onClick={go}>x</a>', options: [{ aspects: ['invalidHref'] }] },
        { name: 'a dynamic href is a destination', code: '<a href={url}>x</a>' },
        { name: 'an anchor with a real destination', code: '<a href="https://example.com">Link</a>' },
        { code: '<a href="/page">Link</a>' },
        { code: '<a href="#section">Link</a>' },
        { code: '<a href="mailto:test@example.com">Email</a>' },
        { code: '<a href="tel:+1234567890">Call</a>' },
        { code: '<button onClick={handleClick}>Button</button>' },
        // specialLink makes anchor valid even without href
        {
          code: '<a to="/page">Link</a>',
          options: [{ specialLink: ['to'] }],
        },
        // Custom component with special link prop
        {
          code: '<Link to="/page">Link</Link>',
          options: [{ components: ['Link'], specialLink: ['to'] }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid anchors', anchorIsValid, {
      valid: [],
      invalid: [
        { /* @found fidelity model react-a11y/anchor_is_valid */ name: 'FN: a braced # goes nowhere', code: '<a href={"#"}>x</a>', errors: [{ messageId: 'invalidHref' }] },
        { /* @found fidelity model react-a11y/anchor_is_valid */ name: 'FN: a template javascript: URL goes nowhere', code: '<a href={`javascript:void(0)`}>x</a>', errors: [{ messageId: 'invalidHref' }] },
        { /* @found fidelity model react-a11y/anchor_is_valid */ name: 'FN: specialLink names the destination attribute', code: '<Link to="#">x</Link>', options: [{ components: ['Link'], specialLink: ['to'] }], errors: [{ messageId: 'invalidHref' }] },
        { name: 'with preferButton off, a handler on # is an invalid href', code: '<a href="#" onClick={go}>x</a>', options: [{ aspects: ['invalidHref'] }], errors: [{ messageId: 'invalidHref' }] },
        { name: 'an anchor whose href is a bare fragment', code: '<a href="#">Link</a>', errors: [{ messageId: 'invalidHref' }] },
        { code: '<a href="javascript:void(0)">Link</a>', errors: [{ messageId: 'invalidHref' }] },
        { code: '<a onClick={handleClick}>Link</a>', errors: [{ messageId: 'preferButton' }] },
        { code: '<a href="#" onClick={handleClick}>Link</a>', errors: [{ messageId: 'preferButton' }] },
        // No href and no onClick = noHref
        { code: '<a>Link</a>', errors: [{ messageId: 'noHref' }] },
        // Custom component without href
        {
          code: '<Link>No href</Link>',
          options: [{ components: ['Link'] }],
          errors: [{ messageId: 'noHref' }],
        },
      ],
    });
  });
});
