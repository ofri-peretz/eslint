/**
 * @fileoverview Tests for no-unsafe-output-handling rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noUnsafeOutputHandling } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-unsafe-output-handling', noUnsafeOutputHandling, {
  valid: [
    // Safe: using textContent
    {
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
  ],

  invalid: [
    // eval with AI output - using result.text pattern
    {
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
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// SQL sinks: interpolated *values*, not source text.
// The SQL branch used to pattern-match the whole template/concatenation source,
// so `${result.text}` was caught but a tracked binding — `const { text } =
// await generateText(...)` — was not, even though eval and innerHTML already
// tracked it. Both shapes must fire.
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run('no-unsafe-output-handling (SQL interpolation)', noUnsafeOutputHandling, {
  valid: [
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
  ],
  invalid: [
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
  ],
});
