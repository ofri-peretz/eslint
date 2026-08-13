/**
 * Tests for no-eval rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noEval } from './index';
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

ruleTester.run('no-eval', noEval, {
  valid: [
    // `new Function(...)` reports through the NewExpression visitor, which did
    // not consult the ownership gate — so this line came back from BOTH
    // no-websocket-eval and here. The complement only holds if every reporting
    // path asks the question.
    {
      code: `
        const ws = new WebSocket('wss://example.test');
        ws.onmessage = (event) => { const f = new Function(event.data); f(); };
      `,
    },
    // Owned by no-websocket-eval — see the note in no-innerhtml's tests.
    {
      code: `
        const ws = new WebSocket('wss://example.test');
        ws.onmessage = (event) => { eval(event.data); };
      `,
    },
    // Safe JSON.parse
    {
      code: `const data = JSON.parse(jsonString);`,
    },
    // setTimeout with function
    {
      code: `setTimeout(() => doSomething(), 1000);`,
    },
    // setInterval with function
    {
      code: `setInterval(callback, 500);`,
    },
    // Function constructor allowed
    {
      code: `const fn = new Function('a', 'return a * 2');`,
      options: [{ allowFunctionConstructor: true }],
    },
    // Test file
    {
      code: `eval('test code');`,
      options: [{ allowInTests: true }],
      filename: 'code.test.ts',
    },
    // Not eval
    {
      code: `const result = evaluate(expression);`,
    },

    // ---- Rule partition: owned by node-security's
    // `detect-eval-with-expression`, which classifies the expression and
    // prescribes the matching alternative. See the note above
    // `hasStaticPayload` in index.ts. All four fail on the old code, which
    // reported them here as well, at the identical range.

    // okta-signin-widget generate-phone-codes.js:20 — remote metadata evalled.
    // A TRUE positive, now reported once instead of twice.
    { code: `eval(data);` },
    // The generic dynamic case.
    { code: `eval(userInput);` },
    // underscore-min.js:1033 / speedscope demangle-cpp — dynamic Function body.
    { code: `const o = new Function(a, '_', i);` },
    { code: `const fn = new Function('return ' + userInput);` },
  ],
  invalid: [
    {
      // Worker payload into eval. `no-websocket-eval` does NOT own this, so if
      // the generic rule skips every resolved source the finding is reported by
      // nobody — the complement is per-sink, not per-resolver.
      code: `
        const w = new Worker('worker.js');
        w.onmessage = (event) => { eval(event.data); };
      `,
      errors: 1,
    },
    {
      // Same for FileReader, through the NewExpression path.
      code: `
        const reader = new FileReader();
        reader.onload = (event) => { const f = new Function(event.target.result); f(); };
      `,
      errors: 1,
    },

    // ---- Ours under the partition: a statically known payload. Nothing is
    // being injected, so there is nothing for the specific rule to attribute.
    {
      code: `eval('alert(1)');`,
      errors: [{ messageId: 'dangerousEval' }],
    },
    {
      code: `const fn = new Function('a', 'return a * 2');`,
      errors: [{ messageId: 'dangerousEval' }],
    },
    // Zero arguments is also "nothing dynamic".
    {
      code: `eval();`,
      errors: [{ messageId: 'dangerousEval' }],
    },
    // ---- Ours outright: sinks `detect-eval-with-expression` cannot see. Its
    // `evalFunctions` set is `{eval, Function}` matched on a bare Identifier
    // callee, so indirect access and `execScript` are invisible to it.
    // window.eval
    {
      code: `window.eval(code);`,
      errors: [{ messageId: 'dangerousEval' }],
    },
    // global.eval
    {
      code: `global.eval(code);`,
      errors: [{ messageId: 'dangerousEval' }],
    },
    {
      code: `globalThis['eval'](code);`,
      errors: [{ messageId: 'dangerousEval' }],
    },
    {
      code: `execScript(code);`,
      errors: [{ messageId: 'dangerousEval' }],
    },
    // setTimeout with string
    {
      code: `setTimeout('doSomething()', 1000);`,
      errors: [{ messageId: 'dangerousEval' }],
    },
    // setInterval with string
    {
      code: `setInterval('tick()', 500);`,
      errors: [{ messageId: 'dangerousEval' }],
    },
  ],
});
