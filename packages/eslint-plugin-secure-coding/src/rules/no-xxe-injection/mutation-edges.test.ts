/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-10-19).
 *
 * Each case is the input that tells the rule apart from a surviving mutant.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noXxeInjection } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-xxe-injection (mutation edges)', () => {
  ruleTester.run('no-xxe-injection', noXxeInjection, {
    valid: [
      {
        name: 'a text/html MIME type with parameters is still an HTML parse',
        code: "const doc = new DOMParser().parseFromString(text, 'text/html; charset=utf-8');",
      },
      {
        name: 'a regular expression that matches XXE payloads is a detector, not a DTD',
        code: 'const XXE = /<!ENTITY\\s+\\w+\\s+SYSTEM "/i;',
      },
      {
        name: 'an internal entity with no SYSTEM identifier is not an external entity',
        code: 'const dtd = \'<!DOCTYPE r [<!ENTITY lol "lol">]>\';',
      },
    ],
    invalid: [
      {
        name: 'a SYSTEM keyword followed by several spaces is still an external entity',
        code: 'const dtd = \'<!DOCTYPE r [<!ENTITY x SYSTEM   "file:///etc/passwd">]>\';',
        errors: [{ messageId: 'xxeInjection' as const }],
      },
    ],
  });
});

describe('no-xxe-injection (edges, 2026-11-02)', () => {
  ruleTester.run('no-xxe-injection', noXxeInjection, {
    valid: [
      {
        name: 'a parser assigned after a bare declaration has no construction initializer',
        code: "import { XMLParser } from 'fast-xml-parser'; let parser; parser = new XMLParser(); parser.parse(req.body);",
      },
    ],
    invalid: [
      {
        name: 'the receiver resolves to its own construction, not the first binding in scope',
        code: "import { XMLParser } from 'fast-xml-parser'; const other = 1; const parser = new XMLParser({ processEntities: true }); parser.parse(req.body);",
        errors: [{ messageId: 'unsafeXmlParser' as const }],
      },
    ],
  });
});
