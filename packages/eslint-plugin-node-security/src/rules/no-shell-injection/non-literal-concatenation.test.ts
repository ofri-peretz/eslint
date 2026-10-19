/**
 * no-shell-injection — `exec(cmd + args)`.
 *
 * The rule's own message tells the reader not to write `exec(cmd + args)`, yet
 * a `+` between two non-literal operands was silent: the operand test required
 * a literal or template on one side. Owner decision 2026-10-18: report it.
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

ruleTester.run('concatenation of non-literal operands', noShellInjection, {
  valid: [
    {
      name: 'arithmetic other than + is not string building',
      code: `${EXEC}exec(base - offset);`,
    },
    {
      name: 'a unary + is a number, not a concatenation',
      code: `${EXEC}exec(+id);`,
    },
    {
      name: 'two consts that fold to literals are one fixed command',
      code: `${EXEC}const cmd = 'git'; const args = ' status'; exec(cmd + args);`,
    },
  ],
  invalid: [
    {
      name: 'exec(cmd + args) — the shape the rule message cites — is reported',
      code: `${EXEC}function run(cmd, args) { exec(cmd + args); }`,
      errors: [{ messageId: 'shellInjection' }],
    },
    {
      name: 'execSync(base + req.query.flags) is reported',
      code: `import { execSync } from 'node:child_process';\nexecSync(base + req.query.flags);`,
      errors: [{ messageId: 'shellInjection' }],
    },
    {
      name: 'a shell-mode spawn with a concatenated command is reported',
      code: `${SPAWN}spawn(bin + flags, { shell: true });`,
      errors: [{ messageId: 'shellInjection' }],
    },
  ],
});
