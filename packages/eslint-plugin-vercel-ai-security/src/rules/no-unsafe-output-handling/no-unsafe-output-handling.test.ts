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
