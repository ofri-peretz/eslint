/**
 * @fileoverview Tests for no-unsafe-output-handling rule
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

ruleTester.run('no-unsafe-output-handling', noUnsafeOutputHandling, {
  valid: xai([
    // Safe: using textContent
    {
      name: 'model output assigned as text',
      code: `
        const result = await generateText({ prompt: 'Hello' });
        element.textContent = result.text;
      `,
    },
    // Safe: parameterized query
    {
      code: `
        const result = await generateText({ prompt: 'Hello' });
        db.query('SELECT * FROM users WHERE id = ?', [userId]);
      `,
    },
    // Safe: not AI output
    {
      code: `
        eval('console.log("hello")');
      `,
    },
    // Safe: sandboxed execution
    {
      code: `
        const result = await generateText({ prompt: 'Hello' });
        const sanitized = sanitize(result.text);
        runInSandbox(sanitized);
      `,
    },
  ]),

  invalid: xai([
    // eval with AI output - using result.text pattern
    {
      name: 'model output passed to eval',
      code: `
        const result = await generateText({ prompt: 'Generate code' });
        eval(result.text);
      `,
      errors: [{ messageId: 'unsafeOutputExecution' }],
    },
    // innerHTML with AI output
    {
      code: `
        const result = await generateText({ prompt: 'Generate HTML' });
        element.innerHTML = result.text;
      `,
      errors: [{ messageId: 'unsafeOutputInHTML' }],
    },
    // exec with completion pattern
    {
      code: `
        const completion = await generateText({ prompt: 'Generate command' });
        execSync(completion);
      `,
      errors: [{ messageId: 'unsafeOutputExecution' }],
    },
    // SQL query with AI output in template
    {
      code: `
        const llmOutput = await generateText({ prompt: 'Generate query' });
        db.query(\`SELECT * FROM \${llmOutput.text}\`);
      `,
      errors: [{ messageId: 'unsafeOutputInSQL' }],
    },
    // eval with aiOutput pattern
    {
      code: `
        const aiOutput = await generateText({ prompt: 'Code' });
        eval(aiOutput);
      `,
      errors: [{ messageId: 'unsafeOutputExecution' }],
    },
  ]),
});

// ─────────────────────────────────────────────────────────────────────────────
// SQL sinks: interpolated *values*, not source text.
// The SQL branch used to pattern-match the whole template/concatenation source,
// so `${result.text}` was caught but a tracked binding — `const { text } =
// await generateText(...)` — was not, even though eval and innerHTML already
// tracked it. Both shapes must fire.
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run('no-unsafe-output-handling (SQL interpolation)', noUnsafeOutputHandling, {
  valid: xai([
    // Non-AI interpolation stays quiet
    {
      code: `
        const { text } = await generateText({ prompt: 'Hello' });
        db.query(\`SELECT * FROM users WHERE id = \${userId}\`);
      `,
    },
    // Non-AI concatenation stays quiet
    {
      code: `
        const { text } = await generateText({ prompt: 'Hello' });
        db.query('SELECT * FROM users WHERE id = ' + userId);
      `,
    },
    // A table name that merely *reads* like a pattern is not a value leak
    { code: `db.query(\`SELECT * FROM generated_reports WHERE id = \${id}\`);` },
    // A *shadowed* `text` is a different variable. Tracking names rather than
    // resolved bindings reports this, and `text` is common enough that the
    // false positive would land on ordinary code.
    {
      code: `
        const { text } = await generateText({ prompt: 'Hello' });
        console.log(text);
        function render(text) {
          db.query(\`SELECT * FROM users WHERE name = '\${text}'\`);
        }
      `,
    },
    // Only `+` builds a string. Other operators compare or compute — there is
    // no interpolation to report, even on a tracked binding.
    {
      code: `
        const { text } = await generateText({ prompt: 'Hello' });
        db.query(rowCount > text);
      `,
    },
  ]),
  invalid: xai([
    // Destructured `text` interpolated into a template — the reported FN
    {
      code: `
        const { text } = await generateText({ prompt: 'Generate query' });
        db.query(\`SELECT * FROM users WHERE name = '\${text}'\`);
      `,
      errors: [{ messageId: 'unsafeOutputInSQL' }],
    },
    // Same binding, string concatenation instead of a template
    {
      code: `
        const { text } = await generateText({ prompt: 'Generate query' });
        db.query('SELECT * FROM users WHERE name = ' + text);
      `,
      errors: [{ messageId: 'unsafeOutputInSQL' }],
    },
    // Nested concatenation chain — `'a' + 'b' + text` parses as `('a' + 'b') + text`
    {
      code: `
        const { text } = await generateText({ prompt: 'Generate query' });
        db.query('SELECT * ' + 'FROM users WHERE name = ' + text);
      `,
      errors: [{ messageId: 'unsafeOutputInSQL' }],
    },
    // Whole-result binding interpolated as `result.text`
    {
      code: `
        const result = await generateText({ prompt: 'Generate query' });
        db.query(\`SELECT * FROM users WHERE name = '\${result.text}'\`);
      `,
      errors: [{ messageId: 'unsafeOutputInSQL' }],
    },
    // Untracked binding still caught by the source-pattern fallback
    {
      code: `db.query(\`SELECT * FROM users WHERE name = '\${payload.aiOutput}'\`);`,
      errors: [{ messageId: 'unsafeOutputInSQL' }],
    },
  ]),
});

// ─────────────────────────────────────────────────────────────────────────────
// FP/FN audit 2026-10-10 (benchmarks/audits/2026-10-10-fp-fn-vercel-ai-security.md)
// Sinks are matched by exact, resolved callee; a tool's `execute` parameters
// are model-chosen by the SDK's contract, so they count as model output.
// ─────────────────────────────────────────────────────────────────────────────
const jsx = { parserOptions: { ecmaFeatures: { jsx: true } } };
ruleTester.run('no-unsafe-output-handling (fp-fn audit)', noUnsafeOutputHandling, {
  valid: xai([
    {
      name: 'RegExp#exec parses model output; it executes nothing',
      code: `
        const result = await generateText({ prompt: 'x' });
        const fence = /\`\`\`json([\\s\\S]*?)\`\`\`/.exec(result.text);
        const pattern = /Answer: (.*)/;
        const m = pattern.exec(result.text);
      `,
    },
    {
      name: 'sanitized HTML assigned to innerHTML',
      code: `
        const result = await generateText({ prompt: 'x' });
        el.innerHTML = DOMPurify.sanitize(result.text);
      `,
    },
    {
      name: 'a function whose name merely contains "eval" is not eval',
      code: `
        const result = await generateText({ prompt: 'x' });
        const score = await evaluateAnswer(result.text, 'rubric');
      `,
    },
    {
      name: 'a function whose name merely contains "run" is not a SQL sink',
      code: `
        const result = await generateText({ prompt: 'x' });
        const preview = truncate(\`\${result.text}\`, 120);
      `,
    },
    {
      name: 'a tool that fetches a fixed host with the model input as a query value is not SSRF',
      code: `
        const weather = tool({
          inputSchema,
          execute: async ({ city }) => fetch(\`https://api.weather.example/v1?q=\${city}\`),
        });
      `,
    },
    {
      name: 'a tool parameter bound as a query parameter is not SQL injection',
      code: `
        const lookup = tool({
          inputSchema,
          execute: async ({ id }) => db.query('SELECT * FROM t WHERE id = $1', [id]),
        });
      `,
    },
    {
      name: 'an execute() that is not a tool definition does not seed model output',
      code: `
        const job = { execute: async ({ command }) => execSync(command) };
      `,
    },
    {
      name: 'exec imported from a module other than child_process is not a shell sink',
      code: `
        import { exec } from './my-runner';
        const { text } = await generateText({ prompt: 'x' });
        exec(text);
      `,
    },
    {
      name: 'a local function named Function is not the Function constructor',
      code: `
        function Function(x) { return x; }
        const { text } = await generateText({ prompt: 'x' });
        new Function(text);
      `,
    },
    {
      name: 'dangerouslySetInnerHTML with non-model content',
      code: `export const A = () => <div dangerouslySetInnerHTML={{ __html: staticHtml }} />;`,
      languageOptions: jsx,
    },
    {
      name: 'a dangerouslySetInnerHTML value that is not an object literal is not inspected',
      code: `export const A = () => <div dangerouslySetInnerHTML={html} />;`,
      languageOptions: jsx,
    },
  ]),
  invalid: xai([
    {
      name: 'tool execute runs a model-chosen shell command',
      code: `
        import { execSync } from 'node:child_process';
        const runCommand = tool({
          description: 'Run a shell command',
          inputSchema: z.object({ command: z.string() }),
          execute: async ({ command }) => execSync(command).toString(),
        });
      `,
      errors: [{ messageId: 'unsafeOutputExecution' }],
    },
    {
      name: 'method-form execute interpolates model input into a shell command',
      code: `
        import * as cp from 'child_process';
        const tools = {
          list: tool({ inputSchema, async execute({ dir }) { return cp.exec(\`ls \${dir}\`); } }),
        };
      `,
      errors: [{ messageId: 'unsafeOutputExecution' }],
    },
    {
      name: 'object-literal tool (has inputSchema) passes model SQL to sql.unsafe',
      code: `
        const tools = {
          queryDb: { inputSchema, execute: async ({ q }) => sql.unsafe(q) },
        };
      `,
      errors: [{ messageId: 'unsafeOutputInSQL' }],
    },
    {
      name: 'tool fetches a model-chosen URL (SSRF)',
      code: `
        const fetchUrl = tool({ inputSchema, execute: async ({ url }) => (await fetch(url)).text() });
      `,
      errors: [{ messageId: 'unsafeOutputInRequest' }],
    },
    {
      name: 'tool fetches a URL whose host the model chooses',
      code: `
        const fetchUrl = dynamicTool({ inputSchema, execute: async ({ host }) => fetch(\`\${host}/admin\`) });
      `,
      errors: [{ messageId: 'unsafeOutputInRequest' }],
    },
    {
      name: 'new Function on model output',
      code: `
        const { text } = await generateText({ prompt: 'x' });
        const fn = new Function(text);
      `,
      errors: [{ messageId: 'unsafeOutputExecution' }],
    },
    {
      name: 'node:vm on model output',
      code: `
        import vm from 'node:vm';
        const { text } = await generateText({ prompt: 'x' });
        vm.runInNewContext(text);
        new vm.Script(text);
      `,
      errors: [{ messageId: 'unsafeOutputExecution' }, { messageId: 'unsafeOutputExecution' }],
    },
    {
      name: 'v5 streamText result awaited into a variable, then eval-ed',
      code: `
        const r = streamText({ prompt: 'write js' });
        const code = await r.text;
        eval(code);
      `,
      errors: [{ messageId: 'unsafeOutputExecution' }],
    },
    {
      name: 'a property read straight off the awaited call',
      code: `
        const out = (await generateText({ prompt: 'x' })).text;
        eval(out);
      `,
      errors: [{ messageId: 'unsafeOutputExecution' }],
    },
    {
      name: 'a string method on model output is still model output',
      code: `
        const { text } = await generateText({ prompt: 'x' });
        eval(text.trim());
      `,
      errors: [{ messageId: 'unsafeOutputExecution' }],
    },
    {
      name: 'model output rendered through dangerouslySetInnerHTML',
      code: `
        const result = await generateText({ prompt: 'x' });
        export const A = () => <div dangerouslySetInnerHTML={{ __html: result.text }} />;
      `,
      languageOptions: jsx,
      errors: [{ messageId: 'unsafeOutputInHTML' }],
    },
    {
      name: 'model SQL passed as the whole query string',
      code: `
        const { text } = await generateText({ prompt: 'write sql' });
        await db.query(text);
      `,
      errors: [{ messageId: 'unsafeOutputInSQL' }],
    },
  ]),
});

// ─────────────────────────────────────────────────────────────────────────────
// Zero-deferral pass 2026-10-11: model output reaching dangerouslySetInnerHTML
// through a component prop typed with an AI SDK message type, a useChat /
// useCompletion result, or `.map(m => <C m={m} />)` into a same-file component.
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run('no-unsafe-output-handling (UI message flow)', noUnsafeOutputHandling, {
  valid: xai([
    {
      // guard reasoned from X-FN-2b: a prop typed with the app's own type is not model output
      name: 'guard: a prop typed with a non-SDK type rendered as HTML',
      code: `
        type Article = { html: string };
        export function Body({ a }: { a: Article }) {
          return <div dangerouslySetInnerHTML={{ __html: a.html }} />;
        }
      `,
      languageOptions: jsx,
    },
    {
      // guard reasoned from X-FN-2b: a same-file component fed only static content
      name: 'guard: a same-file component whose only caller passes static HTML',
      code: `
        const LEGAL = { body: '<p>Terms</p>' };
        function Bubble({ m }) { return <div dangerouslySetInnerHTML={{ __html: m.body }} />; }
        export const Page = () => <Bubble m={LEGAL} />;
      `,
      languageOptions: jsx,
    },
    {
      name: 'a function in a non-execute property of a tool-shaped object is not a tool input',
      code: `
        import { execSync } from 'node:child_process';
        const t = tool({ inputSchema, onInput: async ({ cmd }) => execSync(cmd), execute: async () => ({}) });
      `,
    },
    {
      name: 'a prop typed through an interface with no SDK type',
      code: `
        interface Props { m: { html: string } }
        export function Body({ m }: Props) { return <div dangerouslySetInnerHTML={{ __html: m.html }} />; }
      `,
      languageOptions: jsx,
    },
    {
      name: 'a prop typed with an unresolvable type name, or with mutually recursive aliases',
      code: `
        type A = { next: B }; type B = { prev: A };
        export function One({ m }: Unknown) { return <div dangerouslySetInnerHTML={{ __html: m.html }} />; }
        export function Two({ m }: { m: A }) { return <div dangerouslySetInnerHTML={{ __html: m.html }} />; }
        export function Three({ m }: { m: string }) { return <div dangerouslySetInnerHTML={{ __html: m }} />; }
        export function Four({ m }: Unknown.Thing) { return <div dangerouslySetInnerHTML={{ __html: m.html }} />; }
      `,
      languageOptions: jsx,
    },
    {
      // guard reasoned from X-FN-2b: a hook with the same name from another package
      name: 'guard: useChat imported from a non-SDK package',
      code: `
        import { useChat } from '@kapaai/react-sdk';
        export function Chat() {
          const { messages } = useChat();
          return messages.map((m) => <div dangerouslySetInnerHTML={{ __html: m.answer }} />);
        }
      `,
      languageOptions: jsx,
    },
  ]),
  invalid: xai([
    {
      // @found X-FN-2b, harness-reproduced FP/FN audit 2026-10-10 (benchmarks/audits/2026-10-10-fp-fn-vercel-ai-security.md)
      name: 'FN: a component prop typed as the SDK UIMessage rendered as HTML',
      code: `
        import type { UIMessage } from 'ai';
        export function Msg({ m }: { m: UIMessage }) {
          return <div dangerouslySetInnerHTML={{ __html: m.parts.map((p) => p.text).join('') }} />;
        }
      `,
      languageOptions: jsx,
      errors: [{ messageId: 'unsafeOutputInHTML' }],
    },
    {
      // @found reasoned from X-FN-2b: the same type through a same-file props alias
      name: 'FN: a props alias whose field is an SDK message type',
      code: `
        import type { Message } from '@ai-sdk/react';
        type Props = { message: Message };
        export function Msg(props: Props) {
          return <div dangerouslySetInnerHTML={{ __html: props.message.content }} />;
        }
      `,
      languageOptions: jsx,
      errors: [{ messageId: 'unsafeOutputInHTML' }],
    },
    {
      // @found reasoned from X-FN-2b: the SDK type behind a same-file interface and a qualified name
      name: 'FN: a destructured prop whose interface field is an SDK message type',
      code: `
        import * as ai from 'ai';
        interface Props { m: ai.UIMessage }
        export function Msg({ m }: Props) {
          return <div dangerouslySetInnerHTML={{ __html: JSON.stringify(m.parts) }} />;
        }
      `,
      languageOptions: jsx,
      errors: [{ messageId: 'unsafeOutputInHTML' }],
    },
    {
      // @found residual "Model Output Passed Through Another Variable or Helper" in docs/rules/no-unsafe-output-handling.md (2026-10-10)
      name: 'FN: model output wrapped by a same-file helper and a second variable before eval',
      code: `
        function wrap(t) { return \`(\${t.trim()})\`; }
        const { text } = await generateText({ prompt: 'write js' });
        const foo = wrap(text);
        let bar;
        bar = foo;
        eval(bar);
      `,
      errors: [{ messageId: 'unsafeOutputExecution' }],
    },
    {
      // @found reasoned from X-FN-2b: useChat messages rendered in the same file
      name: 'FN: useChat messages rendered as HTML',
      code: `
        import { useChat } from '@ai-sdk/react';
        export function Chat() {
          const { messages } = useChat();
          return messages.map((m) => <div dangerouslySetInnerHTML={{ __html: m.content }} />);
        }
      `,
      languageOptions: jsx,
      errors: [{ messageId: 'unsafeOutputInHTML' }],
    },
    {
      // @found reasoned from X-FN-2b: useChat messages passed into a same-file component
      name: 'FN: useChat messages mapped into a same-file component that renders HTML',
      code: `
        import { useChat } from '@ai-sdk/react';
        function Bubble({ m }) { return <div dangerouslySetInnerHTML={{ __html: m.content }} />; }
        export function Chat() {
          const { messages } = useChat();
          return <div>{messages.map((m) => <Bubble key={m.id} m={m} />)}</div>;
        }
      `,
      languageOptions: jsx,
      errors: [{ messageId: 'unsafeOutputInHTML' }],
    },
    {
      // @found reasoned from X-FN-2b: useCompletion's completion string
      name: 'FN: a useCompletion completion rendered as HTML',
      code: `
        import { useCompletion } from 'ai/react';
        export function Box() {
          // renamed on purpose: the name pattern \`completion\` must not be what fires
          const { completion: foo } = useCompletion();
          return <div dangerouslySetInnerHTML={{ __html: foo }} />;
        }
      `,
      languageOptions: jsx,
      errors: [{ messageId: 'unsafeOutputInHTML' }],
    },
  ]),
});
