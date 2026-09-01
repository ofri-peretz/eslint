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
