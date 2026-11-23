/**
 * @fileoverview Tests for no-unexplained-skip
 *
 * A skip is legal with an issue URL, a decision id or an unexpired date on its
 * line or the line above. Runtime conditions (`skipIf(isWindows)`,
 * Playwright's `test.skip(browserName === 'webkit', …)`) are gates, not skips.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';

import { noUnexplainedSkip } from './index';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('no-unexplained-skip', noUnexplainedSkip, {
  valid: [
    { name: 'a plain test', code: `it('x', () => {});` },
    {
      name: 'an issue URL on the line above',
      code: `// flaky on CI: https://github.com/acme/app/issues/42\nit.skip('x', () => {});`,
    },
    {
      name: 'a decision id on the same line',
      code: `describe.skip('legacy', () => {}); // D-107`,
    },
    {
      name: 'a date that has not passed',
      code: `// until 2999-01-01, waiting on the upstream fix\nit.todo('streams');`,
    },
    {
      name: 'skipIf with a runtime condition is a platform gate',
      code: `it.skipIf(process.platform === 'win32')('x', () => {});`,
    },
    {
      name: 'runIf with a runtime condition',
      code: `describe.runIf(hasDocker)('db', () => {});`,
    },
    {
      name: 'Playwright conditional skip inside a test',
      code: `test('x', async ({ browserName }) => { test.skip(browserName === 'webkit', 'no webkit'); });`,
    },
    {
      name: 'Playwright test.skip(false) skips nothing',
      code: `test.skip(false);\ntest.skip(!1);\ntest.skip(!flag);`,
    },
    {
      name: 'a local xit is not a test runner',
      code: `const xit = () => {};\nxit('x');`,
    },
    {
      name: 'something.skip on a non-test object',
      code: `stream.skip(3);`,
    },
    {
      name: 'a ctx.skip() is a runtime skip',
      code: `it('x', (ctx) => { ctx.skip(); });`,
    },
    {
      name: 'a non-skip member on a test runner',
      code: `it.concurrent('x', () => {});`,
    },
    {
      name: 'a block comment two lines up does not count but the line above does',
      code: `/* https://gitlab.com/acme/app/-/issues/7 */\nit.skip('x', () => {});`,
    },
  ],
  invalid: [
    {
      name: 'it.skip with no comment',
      code: `it.skip('x', () => {});`,
      errors: [{ messageId: 'unexplainedSkip' }],
    },
    {
      name: 'a skip with a non-literal title is still a declared test',
      code: `it.skip(title, () => {});`,
      errors: [{ messageId: 'unexplainedSkip' }],
    },
    {
      name: 'a template-literal title',
      code: 'describe.skip(`suite`, () => {});',
      errors: [{ messageId: 'unexplainedSkip' }],
    },
    {
      name: 'a template-literal title with no body',
      code: 'test.skip(`later`);',
      errors: [{ messageId: 'unexplainedSkip' }],
    },
    {
      name: 'a template title with a substitution',
      code: 'test.skip(`case ${n}`);',
      errors: [{ messageId: 'unexplainedSkip' }],
    },
    {
      name: 'test.todo',
      code: `test.todo('later');`,
      errors: [{ messageId: 'unexplainedSkip' }],
    },
    {
      name: 'xit',
      code: `xit('x', () => {});`,
      errors: [{ messageId: 'unexplainedSkip' }],
    },
    {
      name: 'Playwright unconditional test.skip()',
      code: `test('x', () => { test.skip(); });`,
      errors: [{ messageId: 'unexplainedSkip' }],
    },
    {
      name: 'Playwright test.skip(!0)',
      code: `test.skip(!0);\ntest.skip(-1);`,
      errors: [
        { messageId: 'unexplainedSkip', line: 1 },
        { messageId: 'unexplainedSkip', line: 2 },
      ],
    },
    {
      name: 'Playwright test.skip(true)',
      code: `test.skip(true, 'not now');`,
      errors: [{ messageId: 'unexplainedSkip' }],
    },
    {
      name: 'Playwright test.fixme',
      code: `test.fixme('x', async () => {});`,
      errors: [{ messageId: 'unexplainedSkip' }],
    },
    {
      name: 'skipIf with a constant',
      code: `it.skipIf(true)('x', () => {});`,
      errors: [{ messageId: 'unexplainedSkip' }],
    },
    {
      name: 'runIf with a negated constant',
      code: `describe.runIf(!1)('x', () => {});`,
      errors: [{ messageId: 'unexplainedSkip' }],
    },
    {
      name: 'a skipped each table',
      code: `it.skip.each([1])('x %i', () => {});`,
      errors: [{ messageId: 'unexplainedSkip' }],
    },
    {
      name: 'a comment that is neither a link, an id nor a date',
      code: `// flaky\nit.skip('x', () => {});`,
      errors: [{ messageId: 'unexplainedSkip' }],
    },
    {
      name: 'an expired date',
      code: `// until 2001-01-01\nit.skip('x', () => {});`,
      errors: [{ messageId: 'expiredSkip', data: { date: '2001-01-01' } }],
    },
    {
      name: 'skipIf with no argument is not a constant, but the empty call is still read',
      code: `it.skipIf()('x', () => {});\nit.skip.each([1])('y', () => {});`,
      errors: [{ messageId: 'unexplainedSkip', line: 2 }],
    },
    {
      name: 'imported from vitest',
      code: `import { it } from 'vitest';\nit.skip('x', () => {});`,
      errors: [{ messageId: 'unexplainedSkip' }],
    },
  ],
});
