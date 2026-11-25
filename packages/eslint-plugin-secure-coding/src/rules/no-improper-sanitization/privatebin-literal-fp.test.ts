/**
 * no-improper-sanitization: literal-only markup and the `body`/`input` name
 * heuristic. Shapes lifted from PrivateBin's js/test (154 reports, 0 real).
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

ruleTester.run(
  'no-improper-sanitization: literal-only markup',
  noImproperSanitization,
  {
    valid: [
      {
        // @found PrivateBin/PrivateBin 2026-11-24
        name: 'FP: concatenation of string literals assigned to innerHTML',
        code: "el.innerHTML = '<div id=\"a\">' + '<span>x</span>' + '</div>';",
      },
      {
        // @found PrivateBin/PrivateBin 2026-11-24
        name: 'FP: nested concatenation and expression-free template',
        code: "el.innerHTML = ('<a>' + '<b>') + ('<c>' + `<d>`);",
      },
      {
        // @found PrivateBin/PrivateBin 2026-11-24
        name: 'FP: const bound to a literal, resolved through scope',
        code: "const defaultMessage = 'Loading…'; el.innerHTML = '<span>' + defaultMessage + '</span>';",
      },
      {
        // @found PrivateBin/PrivateBin 2026-11-24
        name: 'FP: template whose expressions are literal-only',
        code: "const icon = '<i></i>'; el.innerHTML = '<p>' + `${icon}${'x'}` + '</p>';",
      },
      {
        // @found PrivateBin/PrivateBin 2026-11-24
        name: 'FP: outerHTML takes the same exemption',
        code: "el.outerHTML = '<p>' + '</p>';",
      },
      {
        // @found PrivateBin/PrivateBin 2026-11-24
        name: 'FP: variable named bodyTemplate holding static markup',
        code: "const bodyTemplate = '<div></div>'; el.innerHTML = bodyTemplate;",
      },
      {
        // @found PrivateBin/PrivateBin 2026-11-24
        name: 'FP: identifier named inputGroup is not evidence of input',
        code: "function inputGroup() { return 'x'; } el.innerHTML = inputGroup();",
      },
      {
        name: '.value of a call that is not a DOM lookup is not evidence of input',
        code: "el.innerHTML = store.get('a').value;",
      },
      {
        name: '.value of a plain function call is not evidence of input',
        code: 'el.innerHTML = lookup().value;',
      },
      {
        name: 'a location-named property that is not hash/search/href is not evidence of input',
        code: 'el.innerHTML = location.pathname;',
      },
      {
        name: 'hash on an object that is not the location is not evidence of input',
        code: 'el.innerHTML = config.hash;',
      },
      {
        name: 'hash on a nested object that is not the location is not evidence of input',
        code: 'el.innerHTML = state.view.hash;',
      },
      {
        name: 'hash on a call result is not evidence of input',
        code: 'el.innerHTML = digest().hash;',
      },
    ],
    invalid: [
      {
        name: 'a mutable binding is not a literal',
        code: "let name = 'x'; name = location.hash; el.innerHTML = '<b>' + name + '</b>';",
        errors: 2,
      },
      {
        name: 'a parameter is not a literal',
        code: "function f(name) { el.innerHTML = '<b>' + name + '</b>'; }",
        errors: 2,
      },
      {
        name: 'a const bound to a call is not a literal',
        code: "const v = read(); el.innerHTML = '<b>' + v + '</b>';",
        errors: 2,
      },
      {
        name: 'a template with a non-literal expression is not a literal',
        code: "el.innerHTML = '<b>' + `${userInput}` + '</b>';",
        errors: 2,
      },
      {
        name: 'literal markup that is itself the vector still reports',
        code: "el.innerHTML = '<img src=x onerror=alert(1)>' + 'x';",
        errors: 1,
      },
      {
        name: 'request body assigned straight to innerHTML (provenance: req root)',
        code: 'el.innerHTML = req.body.x;',
        errors: [{ messageId: 'insufficientXssProtection' }],
      },
      {
        name: 'request object under the long name',
        code: 'el.innerHTML = request.query.q;',
        errors: [{ messageId: 'insufficientXssProtection' }],
      },
      {
        name: 'value read from a DOM input reaches innerHTML',
        code: "out.innerHTML = document.getElementById('q').value;",
        errors: [{ messageId: 'insufficientXssProtection' }],
      },
      {
        name: 'location.hash reaches innerHTML',
        code: 'out.innerHTML = window.location.hash;',
        errors: [{ messageId: 'insufficientXssProtection' }],
      },
    ],
  },
);
