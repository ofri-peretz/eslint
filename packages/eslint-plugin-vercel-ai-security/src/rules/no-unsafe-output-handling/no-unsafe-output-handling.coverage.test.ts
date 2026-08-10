/**
 * @fileoverview Branch-coverage tests for no-unsafe-output-handling.
 * Layer 1 only — every remaining branch is reachable through the real parser.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noUnsafeOutputHandling } from './index';

/**
 * Every fixture imports the AI SDK, because the rules now abstain in files with
 * no `ai` / `@ai-sdk` in them. Wrapping the arrays rather than editing each
 * fixture means one cannot be left behind — a fixture missing the import would
 * pass vacuously on the gate instead of exercising the detection it was written
 * for. `output` and errors[].suggestions[].output are prefixed too, since
 * autofix fixtures assert the whole file back.
 */
// A SIDE-EFFECT import: it satisfies the gate without reserving any binding,
// so fixtures that already declare `generateText`/`openai` do not redeclare.
const asAi = (code: string): string => `import 'ai';\n${code}`;
type AiSuggestion = { output?: string | null };
type AiCase = {
  code: string;
  output?: string | null;
  errors?: ReadonlyArray<{ suggestions?: readonly AiSuggestion[] } | string>;
};
const xai = <T,>(cases: T[]): T[] =>
  cases.map((c) => {
    if (typeof c === 'string') return asAi(c) as T;
    const test = c as AiCase;
    return {
      ...c,
      code: asAi(test.code),
      ...(typeof test.output === 'string' ? { output: asAi(test.output) } : {}),
      ...(test.errors
        ? {
            errors: test.errors.map((e) =>
              typeof e === 'string' || !e.suggestions
                ? e
                : {
                    ...e,
                    suggestions: e.suggestions.map((s) =>
                      typeof s.output === 'string'
                        ? { ...s, output: asAi(s.output) }
                        : s,
                    ),
                  },
            ),
          }
        : {}),
    } as T;
  });


const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-unsafe-output-handling (branch coverage)', noUnsafeOutputHandling, {
  valid: xai([
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
  ]),
  invalid: xai([
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
  ]),
});
