/**
 * no-shell-injection — cases found by mutation testing (Stryker).
 *
 * Each case pins a line of the rule that no earlier fixture would have
 * noticed changing. See docs/MUTATION_TESTING.md.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noShellInjection } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const SPAWN = "import { spawn } from 'node:child_process';\n";
const EXEC = "import { exec } from 'node:child_process';\n";

ruleTester.run('mutation-guided edges', noShellInjection, {
  valid: [
    {
      name: 'an options object with no shell key does not turn spawn into a shell',
      code: `${SPAWN}spawn(\`ls \${dir}\`, { cwd: '/tmp' });`,
    },
    {
      name: 'a shell path built from a template with expressions is not statically truthy',
      code: `${SPAWN}spawn(\`ls \${dir}\`, { shell: \`/bin/\${name}\` });`,
    },
    {
      name: 'shell: false runs no shell',
      code: `${SPAWN}spawn(\`ls \${dir}\`, [], { shell: false });`,
    },
    {
      name: "shell: '' names no shell",
      code: `${SPAWN}spawn(\`ls \${dir}\`, [], { shell: '' });`,
    },
    {
      name: 'shell: null runs no shell',
      code: `${SPAWN}spawn(\`ls \${dir}\`, [], { shell: null });`,
    },
    {
      name: 'a test file building its own command is skipped',
      code: `${EXEC}exec(\`npm run build:\${suffix}\`);`,
      filename: 'src/build.test.ts',
    },
  ],
  invalid: [
    {
      name: 'a shell named by path makes spawn a shell',
      code: `${SPAWN}spawn(\`ls \${dir}\`, [], { shell: '/bin/sh' });`,
      errors: [{ messageId: 'shellInjection' }],
    },
    {
      name: 'a template concatenated with more input is still a built command',
      code: `${EXEC}exec(\`git \${sub}\` + flags);`,
      errors: [{ messageId: 'shellInjection' }],
    },
    {
      name: 'the same built command outside a test file is reported',
      code: `${EXEC}exec(\`npm run build:\${suffix}\`);`,
      filename: 'src/build.ts',
      errors: [{ messageId: 'shellInjection' }],
    },
  ],
});
