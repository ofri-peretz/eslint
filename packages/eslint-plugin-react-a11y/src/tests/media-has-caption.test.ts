/**
 * Tests for media-has-caption rule
 * Accessibility: WCAG 1.2.2 Captions (Level A)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { mediaHasCaption } from '../rules/media-has-caption';

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

describe('media-has-caption', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - media with captions', mediaHasCaption, {
      valid: [
        { code: '<video><track kind="captions" /></video>' },
        { code: '<audio><track kind="captions" /></audio>' },
        { code: '<div></div>' },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - media without captions', mediaHasCaption, {
      valid: [],
      invalid: [
        { code: '<video src="video.mp4"></video>', errors: [{ messageId: 'missingCaption' }] },
        { code: '<audio src="audio.mp3"></audio>', errors: [{ messageId: 'missingCaption' }] },
      ],
    });
  });
});
