/**
 * @fileoverview Branch-coverage tests for no-unsafe-output-handling.
 * Layer 1 only — every remaining branch is reachable through the real parser.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noUnsafeOutputHandling } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-unsafe-output-handling (branch coverage)', noUnsafeOutputHandling, {
  valid: [
    // Awaiting something that is not a call — isAISDKCall bails on non-CallExpression.
    {
      code: `async function f() { const r = await pending; }`,
    },
    // Init that is neither await nor an AI SDK call.
    {
      code: `async function f() { const r = await makeThing(); }`,
    },
    // Member callee whose property is not an AI SDK function.
    {
      code: `async function f() { const r = await db.fetchAll(); }`,
    },
    // Member callee with a computed (non-Identifier) property.
    {
      code: `async function f() { const r = await sdk['generateText'](input); }`,
    },
    // Rest element in the destructuring pattern — skipped when tracking names.
    {
      code: `async function f() { const { ...rest } = await generateText({ prompt: p }); }`,
    },
    // Array pattern id — neither Identifier nor ObjectPattern tracking path.
    {
      code: `async function f() { const [first] = await generateText({ prompt: p }); }`,
    },
    // Destructured property whose value is not an Identifier.
    {
      code: `async function f() { const { text: { nested } } = await generateText({ prompt: p }); }`,
    },
    // SQL template that contains no AI output.
    {
      code: `db.query(\`SELECT * FROM t WHERE id = \${id}\`);`,
    },
    // Assignment whose left side is not a MemberExpression.
    {
      code: `count = 5;`,
    },
    // innerHTML assignment from a non-AI source.
    {
      code: `el.innerHTML = safeHtml;`,
    },
  ],
  invalid: [
    // Destructured `text` from generateText tracked into eval — ObjectPattern path.
    {
      code: `
        async function f() {
          const { text } = await generateText({ prompt: p });
          eval(text);
        }
      `,
      errors: [{ messageId: 'unsafeOutputExecution', data: { variable: 'text', function: 'eval' } }],
    },
    // Member-callee AI SDK call (helpers.generateText) tracked, then leaked to eval.
    {
      code: `
        async function f() {
          const r = await helpers.generateText({ prompt: p });
          eval(r.text);
        }
      `,
      errors: [{ messageId: 'unsafeOutputExecution', data: { variable: 'r.text', function: 'eval' } }],
    },
  ],
});
