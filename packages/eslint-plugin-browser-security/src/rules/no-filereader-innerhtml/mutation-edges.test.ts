/**
 * Mutation-survivor kill fixtures for no-filereader-innerhtml.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noFilereaderInnerhtml } from './index';
import * as vitest from 'vitest';

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

const R = (body: string) =>
  `const reader = new FileReader(); reader.onload = (e) => { ${body} };`;

ruleTester.run('no-filereader-innerhtml', noFilereaderInnerhtml, {
  valid: [
    // ── readsFileReaderResult: `result` read directly off e or e.target ────
    {
      name: 'e.target.metadata.result is some other object result, not the file content',
      code: R('el.innerHTML = e.target.metadata.result;'),
    },
    {
      name: 'e.detail.result is not read off the reader (e.target)',
      code: R('el.innerHTML = e.detail.result;'),
    },
    {
      name: 'a target nested under another member is not the event target',
      code: R('el.innerHTML = e.a.target.result;'),
    },
    {
      name: 'assigning the result to a plain variable is not a sink',
      code: R('let html; html = e.target.result;'),
    },
    // ── method sinks: the argument must be the reader result ───────────────
    {
      name: 'a static insertAdjacentHTML argument inside the handler is not file content',
      code: R("el.insertAdjacentHTML('beforeend', '<b>done</b>');"),
    },
    {
      name: 'a reader field other than result passed to insertAdjacentHTML is not file content',
      code: R("el.insertAdjacentHTML('beforeend', e.target.fileName);"),
    },
    {
      name: 'a .result read outside any FileReader handler is not this rule’s source',
      code: "el.insertAdjacentHTML('beforeend', job.result);",
    },
  ],
  invalid: [],
});
