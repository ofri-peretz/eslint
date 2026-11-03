/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-11-02).
 *
 * Each case is the input that tells the rule apart from a surviving mutant.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noImproperSanitization } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const incomplete = [{ messageId: 'incompleteHtmlEscaping' as const }];
const xss = [{ messageId: 'insufficientXssProtection' as const }];
const unsafe = [{ messageId: 'unsafeReplaceSanitization' as const }];

describe('no-improper-sanitization (mutation edges)', () => {
  ruleTester.run('no-improper-sanitization', noImproperSanitization, {
    valid: [
      {
        name: 'a sanitizer listed after the first default still sanitizes',
        code: 'el.innerHTML = DOMPurify.sanitize(req.body.html);',
      },
      {
        name: 'a replace with no arguments has no pattern to judge',
        code: 's.replace();',
      },
      {
        name: 'an interpolated replacement is not a known entity',
        code: 's.replace(/</g, `&lt;${suffix}`);',
      },
      {
        name: 'a decimal &#39; is a quote entity',
        code: "s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\"/g, '&#39;');",
      },
      {
        name: 'assigning markup to a plain variable is not a sink',
        code: "let html; html = '<b>bold</b>';",
      },
      {
        name: 'a non-null asserted literal argument is still a literal',
        code: "res.send(('<b>' + '</b>')!);",
      },
      {
        name: 'a type-asserted literal argument is still a literal',
        code: "res.send(<string>'<b>bold</b>');",
      },
      {
        name: 'a bigint beside a string literal carries no markup',
        code: 'res.json({ id: 10n, msg: "don\'t" });',
      },
      {
        name: 'an expression-free template is developer text',
        code: "res.send('<p>' + `static` + '</p>');",
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FP: a unary-plus number carries no markup',
        code: "res.send('<p>' + +count + '</p>');",
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FP: an arithmetic product carries no markup',
        code: "res.send('<p>Total: ' + price * qty + '</p>');",
      },
      {
        name: 'escaped text beside user input is not reported',
        code: "res.send(req.query.x + '&lt;b>');",
      },
    ],
    invalid: [
      {
        name: 'a hex entity of two digits is still an entity',
        code: "s.replace(/</g, '&#x3c;');",
        errors: incomplete,
      },
      {
        name: 'a decimal entity of two digits is still an entity',
        code: "s.replace(/</g, '&#60;');",
        errors: incomplete,
      },
      {
        name: 'req. alone marks user input',
        code: 'el.innerHTML = req.params.name;',
        errors: xss,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: outerHTML parses markup like innerHTML',
        code: 'el.outerHTML = req.body.html;',
        errors: xss,
      },
      {
        name: 'a script tag with attributes is dangerous markup at innerHTML',
        code: 'el.innerHTML = \'<script src="x.js">\';',
        errors: unsafe,
      },
      {
        name: 'an inline handler is dangerous markup at innerHTML',
        code: "el.innerHTML = '<img src=x onerror=alert(1)>';",
        errors: unsafe,
      },
      {
        name: 'an inline handler with a space before = is dangerous markup at innerHTML',
        code: 'el.innerHTML = \'<div onclick ="go()">\';',
        errors: unsafe,
      },
      {
        name: 'a script tag with attributes is dangerous markup in a response',
        code: 'res.send(\'<script src="x.js">\');',
        errors: unsafe,
      },
      {
        name: 'an inline handler with a space before = is dangerous markup in a response',
        code: 'res.send(\'<div onclick ="go()">\');',
        errors: unsafe,
      },
      {
        name: 'a call on a call result is not a named sanitizer',
        code: "res.send('<p>' + getRenderer()(name) + '</p>');",
        errors: [...unsafe, ...unsafe],
      },
      {
        name: 'one user field in a response object taints it',
        code: 'res.json({ msg: "don\'t", name: req.query.name });',
        errors: unsafe,
      },
      {
        name: 'a spread in a response object is not developer text',
        code: 'res.json({ ...extra, msg: "don\'t" });',
        errors: unsafe,
      },
      {
        name: 'an array method other than join is not developer text',
        code: "res.send('<p>' + ['a', 'b'].reverse() + '</p>');",
        errors: [...unsafe, ...unsafe],
      },
      {
        name: 'join on a variable is not developer text',
        code: "res.send('<p>' + names.join(', ') + '</p>');",
        errors: [...unsafe, ...unsafe],
      },
    ],
  });
});
