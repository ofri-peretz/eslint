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
        { name: 'a track element is present', code: '<video><track kind="captions" /></video>' },
        { code: '<audio><track kind="captions" /></audio>' },
        { code: '<div></div>' },
        { /* @found fidelity model react-a11y/media_has_caption */ name: 'FP: a muted video has no audio to caption', code: '<video src="a.mp4" muted></video>' },
        { /* @found fidelity model react-a11y/media_has_caption */ name: 'FP: muted={true} has no audio to caption', code: '<video src="a.mp4" muted={true}></video>' },
        { /* @found fidelity model react-a11y/media_has_caption */ name: 'FP: a muted value the file cannot see', code: '<video src="a.mp4" muted={flag}></video>' },
        { /* @found fidelity model react-a11y/media_has_caption */ name: 'FP: kind is an enumerated attribute, case-insensitive', code: '<video><track kind="Captions" /></video>' },
        { /* @found fidelity model react-a11y/media_has_caption */ name: 'FP: a braced captions kind', code: '<video><track kind={"captions"} /></video>' },
        { /* @found fidelity model react-a11y/media_has_caption */ name: 'FP: a kind the file cannot see', code: '<video><track kind={kind} /></video>' },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - media without captions', mediaHasCaption, {
      valid: [],
      invalid: [
        { name: 'a video with no captions track', code: '<video src="video.mp4"></video>', errors: [{ messageId: 'missingCaption' }] },
        { code: '<audio src="audio.mp3"></audio>', errors: [{ messageId: 'missingCaption' }] },
        { name: 'a track with no kind is subtitles, not captions', code: '<video><track src="a.vtt" /></video>', errors: [{ messageId: 'missingCaption' }] },
        { name: 'kind={undefined} renders no kind', code: '<video><track kind={undefined} /></video>', errors: [{ messageId: 'missingCaption' }] },
        { name: 'muted={false} leaves the sound on', code: '<video src="a.mp4" muted={false}></video>', errors: [{ messageId: 'missingCaption' }] },
      ],
    });
  });
});
