/**
 * Tests for no-eval rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';
import { noEval } from './index';
import { noWebsocketEval } from '../no-websocket-eval/index';
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
    // A TRUE positive, reported once instead of twice.
    //
    // `deferDynamicPayloads` is now REQUIRED to make these valid. They were
    // unconditional, which meant a consumer installing browser-security without
    // node-security got no eval coverage at all — the partition assumed a plugin
    // that is not a dependency. Handing the deferral to the user turns "silently
    // uncovered" into "covered unless you say otherwise".
    { code: `eval(data);`, options: [{ deferDynamicPayloads: true }] },
    // The generic dynamic case.
    { code: `eval(userInput);`, options: [{ deferDynamicPayloads: true }] },
    // underscore-min.js:1033 / speedscope demangle-cpp — dynamic Function body.
    //
    // These two carried NO options, i.e. they asserted that a browser-only
    // consumer gets nothing on a dynamic Function body. The `NewExpression`
    // visitor applied the node-security deferral unconditionally while the
    // `CallExpression` one honoured `deferDynamicPayloads`, so the Function
    // constructor was still exactly inverted after the eval half was fixed:
    // `new Function('return 1')` reported at CVSS 9.8, `new Function('return ' +
    // userInput)` silent. The option is now required here too.
    {
      code: `const o = new Function(a, '_', i);`,
      options: [{ deferDynamicPayloads: true }],
    },
    {
      code: `const fn = new Function('return ' + userInput);`,
      options: [{ deferDynamicPayloads: true }],
    },
    // Not the platform's evaluator. `.eval` on an arbitrary object is a
    // different API entirely (mathjs, an embedded interpreter, a vm wrapper);
    // the member branch used to accept ANY receiver and reported all of them
    // as CWE-95 / CVSS 9.8.
    { code: `const result = math.eval(userFormula);` },
    { code: `interpreter.eval(program);` },
    // A local binding is not the global, however it is spelled.
    { code: `function Function(x) { return x; }\nFunction(userInput);` },
    // A timer given a function is a timer.
    { code: `setTimeout(handler, 100);` },
    // ONE `.constructor` hop is an ordinary constructor call.
    { code: `obj.constructor(value);` },
    // A sequence whose last operand is not the evaluator.
    { code: `(0, render)(payload);` },
    // A computed key that is not a literal string.
    { code: `window[evalName]('code');` },
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
    // A concatenated timer body is the shape an injection actually takes, and
    // it was invisible while the string-literal spelling was reported.
    {
      code: `setTimeout('go(' + id + ')', 0);`,
      errors: [{ messageId: 'dangerousEval' }],
    },
    {
      code: 'setInterval(`tick(${id})`, 500);',
      errors: [{ messageId: 'dangerousEval' }],
    },
    {
      code: `window.setTimeout('go()', 0);`,
      errors: [{ messageId: 'dangerousEval' }],
    },
    // Indirect reaches for the same global. All three run arbitrary code and
    // none of them writes `eval(` or `new Function(`.
    {
      code: `(0, eval)(userInput);`,
      errors: [{ messageId: 'dangerousEval' }],
    },
    {
      code: `const run = eval;\nrun(userInput);`,
      errors: [{ messageId: 'dangerousEval' }],
    },
    {
      code: `[].constructor.constructor('alert(1)')();`,
      errors: [{ messageId: 'dangerousEval' }],
    },
    // `Function(...)` without `new` is the same constructor.
    {
      code: `Function('return ' + userInput)();`,
      errors: [{ messageId: 'dangerousEval' }],
    },
  ],
});

/**
 * REGRESSION LOCK — the Function constructor must be self-sufficient too.
 *
 * The `deferDynamicPayloads` fix was applied to the `CallExpression` visitor
 * only. `new Function(...)` reports through `NewExpression`, which deferred
 * unconditionally, so for a browser-only consumer the constructor stayed
 * exactly inverted:
 *
 *   new Function('return ' + userInput);   QUIET      <- the vulnerability
 *   new Function('return 1');              CVSS 9.8   <- a constant
 *
 * Both cases below FAIL on the pre-fix rule.
 */
ruleTester.run('no-eval-function-constructor-self-sufficient', noEval, {
  valid: [
    {
      code: `const fn = new Function('return ' + userInput);`,
      options: [{ deferDynamicPayloads: true }],
    },
  ],
  invalid: [
    {
      code: `const fn = new Function('return ' + userInput);`,
      errors: [{ messageId: 'dangerousEval' }],
    },
    {
      code: `const fn = Function('return ' + userInput);`,
      errors: [{ messageId: 'dangerousEval' }],
    },
  ],
});

/**
 * PARTITION MATRIX — shapes × rules, EXACTLY ONE report per shape.
 *
 * `no-eval` and `no-websocket-eval` are complements. Nothing enforced that but
 * a comment in each file, and the two carried different sink lists, so three
 * shapes fell between them: `window.eval(e.data)`, `execScript(e.data)` and
 * `globalThis['eval'](e.data)` inside a WebSocket handler were reported by
 * NEITHER rule, while the identical three lines outside a handler were reported
 * by `no-eval`. Detection got weaker as the payload got more attacker-controlled.
 *
 * The matrix runs each shape through BOTH rules and asserts the count is 1 —
 * so a double report and a dropped finding fail the same way. Re-run it
 * whenever `src/utils/dynamic-code-sinks.ts` changes: widening one rule
 * silently uncovers shapes its sibling owned, and that has happened here.
 */
describe('eval-partition-matrix', () => {
  const linter = new Linter();

  /** How many of the two rules report on this snippet, and which. */
  function reporters(code: string): string[] {
    const messages = linter.verify(
      code,
      {
        plugins: { bs: { rules: { 'no-eval': noEval, 'no-websocket-eval': noWebsocketEval } } },
        languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
        rules: { 'bs/no-eval': 'error', 'bs/no-websocket-eval': 'error' },
      },
      'partition.js',
    );
    const crashed = messages.filter((m) => !m.ruleId);
    if (crashed.length) throw new Error(`crash: ${crashed[0].message}`);
    return messages.map((m) => (m.ruleId ?? '').replace('bs/', ''));
  }

  const WS = `const ws = new WebSocket('wss://feed.example.test');\n`;

  const shapes: Array<{ name: string; code: string; owner: string }> = [
    // ---- WebSocket-derived payloads: the sibling owns every sink shape.
    {
      name: 'ws + eval',
      code: `${WS}ws.onmessage = (e) => { eval(e.data); };`,
      owner: 'no-websocket-eval',
    },
    {
      name: 'ws + window.eval',
      code: `${WS}ws.onmessage = (e) => { window.eval(e.data); };`,
      owner: 'no-websocket-eval',
    },
    {
      name: "ws + globalThis['eval']",
      code: `${WS}ws.onmessage = (e) => { globalThis['eval'](e.data); };`,
      owner: 'no-websocket-eval',
    },
    {
      name: 'ws + execScript',
      code: `${WS}ws.onmessage = (e) => { execScript(e.data); };`,
      owner: 'no-websocket-eval',
    },
    {
      name: 'ws + new Function',
      code: `${WS}ws.onmessage = (e) => { const f = new Function(e.data); f(); };`,
      owner: 'no-websocket-eval',
    },
    {
      name: 'ws + Function (no new)',
      code: `${WS}ws.addEventListener('message', (e) => { Function(e.data)(); });`,
      owner: 'no-websocket-eval',
    },
    {
      name: 'ws + (0, eval)',
      code: `${WS}ws.onmessage = (e) => { (0, eval)(e.data); };`,
      owner: 'no-websocket-eval',
    },
    {
      name: 'ws + aliased eval',
      code: `const run = eval;\n${WS}ws.onmessage = (e) => { run(e.data); };`,
      owner: 'no-websocket-eval',
    },
    {
      name: 'ws + setTimeout string concat',
      code: `${WS}ws.onmessage = (e) => { setTimeout('go(' + e.data + ')', 0); };`,
      // Timers are not a shape `no-websocket-eval` reports as RCE-via-WebSocket
      // in its message, but the sink is shared, so the generic rule keeps it and
      // it is still reported exactly once.
      owner: 'no-eval',
    },

    // ---- Every other source and every unattributed value: the generic rule.
    {
      name: 'worker + eval',
      code: `const w = new Worker('w.js');\nw.onmessage = (e) => { eval(e.data); };`,
      owner: 'no-eval',
    },
    {
      name: 'filereader + new Function',
      code: `const r = new FileReader();\nr.onload = (e) => { const f = new Function(e.target.result); f(); };`,
      owner: 'no-eval',
    },
    {
      name: 'postmessage + eval',
      code: `window.addEventListener('message', (e) => { eval(e.data); });`,
      owner: 'no-eval',
    },
    { name: 'bare eval', code: `eval(userInput);`, owner: 'no-eval' },
    { name: 'window.eval', code: `window.eval(userInput);`, owner: 'no-eval' },
    { name: 'execScript', code: `execScript(userInput);`, owner: 'no-eval' },
    {
      name: 'new Function dynamic',
      code: `const f = new Function('return ' + userInput);`,
      owner: 'no-eval',
    },
    {
      name: 'new Function static',
      code: `const f = new Function('return 1');`,
      owner: 'no-eval',
    },
    {
      name: 'constructor chain',
      code: `[].constructor.constructor('alert(1)')();`,
      owner: 'no-eval',
    },
    {
      name: 'setTimeout string',
      code: `setTimeout('tick()', 0);`,
      owner: 'no-eval',
    },
  ];

  for (const shape of shapes) {
    it(`${shape.name} -> exactly one report, from ${shape.owner}`, () => {
      const hits = reporters(shape.code);
      expect(hits).toEqual([shape.owner]);
    });
  }

  // The other direction: shapes NEITHER rule may claim.
  const quiet: Array<{ name: string; code: string }> = [
    { name: 'math.eval', code: `const r = math.eval(formula);` },
    { name: 'local Function', code: `function Function(x) { return x; }\nFunction(userInput);` },
    { name: 'timer with function', code: `setTimeout(handler, 100);` },
    { name: 'JSON.parse', code: `const d = JSON.parse(raw);` },
    { name: 'sink in a comment', code: `render(payload); // do not eval(payload)` },
    { name: 'sink in a string', code: `const help = 'never call eval(x) here';` },
  ];

  for (const shape of quiet) {
    it(`${shape.name} -> no report from either rule`, () => {
      expect(reporters(shape.code)).toEqual([]);
    });
  }
});

/**
 * REGRESSION LOCK — browser-security must cover eval() on its own.
 *
 * The payload partition with `node-security/detect-eval-with-expression` was
 * applied unconditionally, and eslint-plugin-browser-security does not depend
 * on eslint-plugin-node-security. For anyone installing this plugin alone the
 * rule was exactly inverted:
 *
 *   eval(userInput);   QUIET      <- the actual vulnerability
 *   eval("2 + 2");     CVSS 9.8   <- a constant
 *
 * A rule cannot see which other plugins are enabled, so the partition is now
 * the user's declaration via `deferDynamicPayloads`, off by default.
 *
 * This block FAILS on the pre-fix rule: the invalid case was QUIET.
 */
ruleTester.run('no-eval-self-sufficient-by-default', noEval, {
  valid: [
    // The partition, opted into explicitly by a user who runs both plugins.
    {
      code: 'eval(userInput);',
      options: [{ deferDynamicPayloads: true }],
    },
  ],
  invalid: [
    {
      code: 'eval(userInput);',
      errors: [{ messageId: 'dangerousEval' }],
    },
    {
      // Still ours under the partition — a static payload has nothing to attribute.
      code: 'eval("2 + 2");',
      options: [{ deferDynamicPayloads: true }],
      errors: [{ messageId: 'dangerousEval' }],
    },
    {
      // Still ours under the partition even when DYNAMIC, because the payload
      // has a browser source this package can attribute. Yielding it would drop
      // the finding entirely: node-security would classify `event.data` as "a
      // dynamic expression", which adds nothing, and no other rule owns Worker.
      code: `const w = new Worker('w.js');\nw.onmessage = (event) => { eval(event.data); };`,
      options: [{ deferDynamicPayloads: true }],
      errors: [{ messageId: 'dangerousEval' }],
    },
    {
      // A concatenation whose LEFT operand is not provably a string. The right
      // one is, so the timer body is still code.
      code: `setTimeout(prefix + 'tick()', 0);`,
      errors: [{ messageId: 'dangerousEval' }],
    },
  ],
});
