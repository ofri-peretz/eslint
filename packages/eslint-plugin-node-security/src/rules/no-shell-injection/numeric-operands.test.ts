/**
 * no-shell-injection: a part that can only be a number is not injectable.
 *
 * nest-cli's tree-kill runs `execSync('taskkill /pid ' + pid + ' /T /F')` with
 * `pid: number`, and the rule reported it as CWE-78. A number interpolates as
 * digits, so there is nothing for an attacker to supply. The invalid half keeps
 * the exemption from widening to anything that is not provably numeric.
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

const EXEC = "import { exec, execSync } from 'node:child_process';\n";

ruleTester.run('numeric operands', noShellInjection, {
  valid: [
    {
      name: 'nest-cli tree-kill: a pid typed number',
      code: `${EXEC}function kill(pid: number) { execSync('taskkill /pid ' + pid + ' /T /F'); }`,
    },
    {
      name: 'a number-typed const in a template',
      code: `${EXEC}function f(n: string) { const port: number = Number(n); exec(\`lsof -i :\${port}\`); }`,
    },
    {
      name: 'a Number() coercion in place',
      code: `${EXEC}function f(id) { exec('kill ' + Number(id)); }`,
    },
    {
      name: 'parseInt and Number.parseInt',
      code: `${EXEC}function f(a, b) { exec(\`kill -\${parseInt(a, 10)} \${Number.parseInt(b)}\`); }`,
    },
    {
      name: 'a unary minus inside a concatenation',
      code: `${EXEC}function f(n) { exec('nice ' + -n); }`,
    },
    {
      // @found synthetic
      name: 'a logical not is a boolean',
      code: `${EXEC}function f(a) { exec('flag ' + !a); }`,
    },
    {
      // @found synthetic
      name: 'a computed Number member is the same coercion',
      code: `${EXEC}function f(a) { exec('kill ' + Number['parseFloat'](a)); }`,
    },
    {
      // @found synthetic
      name: 'arithmetic other than + is a number',
      code: `${EXEC}function f(a, b) { exec('kill ' + (a - b)); }`,
    },
    {
      // @found synthetic
      name: 'a comparison is a boolean',
      code: `${EXEC}function f(a, b) { exec('test ' + (a < b)); }`,
    },
    {
      // @found synthetic
      name: 'a nested + of numbers is a number',
      code: `${EXEC}function f(a: number, b: number) { exec('kill ' + (a + b)); }`,
    },
  ],
  invalid: [
    {
      name: 'an unannotated parameter still reports',
      code: `${EXEC}function kill(pid) { execSync('taskkill /pid ' + pid); }`,
      errors: [{ messageId: 'shellInjection' }],
    },
    {
      name: 'a number | string union still reports',
      code: `${EXEC}function kill(pid: number | string) { execSync('taskkill /pid ' + pid); }`,
      errors: [{ messageId: 'shellInjection' }],
    },
    {
      name: 'a local function named Number is not the global',
      code: `${EXEC}function Number(x) { return x; } function f(id) { exec('kill ' + Number(id)); }`,
      errors: [{ messageId: 'shellInjection' }],
    },
    {
      name: 'a coercion name that is not numeric still reports',
      code: `${EXEC}function f(id) { exec('kill ' + String(id)); }`,
      errors: [{ messageId: 'shellInjection' }],
    },
    {
      name: 'a parseInt on another object still reports',
      code: `${EXEC}function f(id) { exec('kill ' + util.parseInt(id)); }`,
      errors: [{ messageId: 'shellInjection' }],
    },
    {
      name: 'a Number member that is not a coercion still reports',
      code: `${EXEC}function f(id) { exec('kill ' + Number.raw(id)); }`,
      errors: [{ messageId: 'shellInjection' }],
    },
    {
      name: 'a Number member read through a runtime key still reports',
      code: `${EXEC}function f(id, k) { exec('kill ' + Number[k](id)); }`,
      errors: [{ messageId: 'shellInjection' }],
    },
    {
      name: 'a call whose callee is neither a name nor a member still reports',
      code: `${EXEC}function f(id) { exec('kill ' + (0, Number)(id)); }`,
      errors: [{ messageId: 'shellInjection' }],
    },
    {
      name: 'a declared global has no annotation to read',
      code: `/* global pid */\n${EXEC}exec('kill ' + pid);`,
      errors: [{ messageId: 'shellInjection' }],
    },
    {
      name: 'every declaration must say number',
      code: `${EXEC}function f(s: string) { var p: number = 1; var p: string = s; exec('kill ' + p); }`,
      errors: [{ messageId: 'shellInjection' }],
    },
    {
      name: 'a + of a number and a string still reports',
      code: `${EXEC}function f(a: number, raw) { exec('kill ' + (a + raw)); }`,
      errors: [{ messageId: 'shellInjection' }],
    },
    {
      name: 'a + of a string and a number still reports',
      code: `${EXEC}function f(a: number, raw) { exec('kill ' + (raw + a)); }`,
      errors: [{ messageId: 'shellInjection' }],
    },
    {
      name: 'a numeric part does not clear a string part beside it',
      code: `${EXEC}function f(pid: number, sig: string) { exec(\`kill -\${sig} \${pid}\`); }`,
      errors: [{ messageId: 'shellInjection' }],
    },
    {
      name: 'a global with no declaration is not a number',
      code: `${EXEC}exec('kill ' + pid);`,
      errors: [{ messageId: 'shellInjection' }],
    },
    {
      name: 'a boolean beside a raw string still reports',
      code: `${EXEC}function f(a: string) { exec('x ' + !a + a); }`,
      errors: [{ messageId: 'shellInjection' }],
    },
  ],
});
