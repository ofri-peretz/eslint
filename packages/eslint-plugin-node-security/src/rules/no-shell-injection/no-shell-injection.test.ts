/**
 * Tests for no-shell-injection rule
 * Security: CWE-78 - OS Command Injection
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

describe('no-shell-injection', () => {
  describe('Valid - Safe Patterns', () => {
    ruleTester.run('valid - literal strings are safe', noShellInjection, {
      valid: [
        // Literal string — no injection surface
        { code: "exec('ls -la /tmp');" },
        // execSync with literal — safe
        { code: "execSync('git status');" },
        // spawn with args array — structurally safe parameterization form
        { code: "spawn('git', ['clone', userRepo]);" },
        // execFile routes via PATH-safe mechanism
        { code: "execFile('/usr/bin/git', ['clone', userRepo]);" },
        // exec with plain identifier — indirect; data-flow out of scope
        { code: "exec(command);" },
        // Template literal with no expressions — just a tagged string
        { code: "exec(`git status`);" },
        // member form with literal
        { code: "child_process.exec('ls -la');" },
        // execFileSync — safe parameterized form
        { code: "execFileSync('npm', ['install']);" },
        // spawnSync — safe parameterized form
        { code: "spawnSync('git', ['pull', '--rebase']);" },
      ],
      invalid: [],
    });
  });

  describe('Invalid - Shell Injection Vulnerabilities', () => {
    ruleTester.run('invalid - template literal with expression', noShellInjection, {
      valid: [],
      invalid: [
        // Template literal with expression — injection surface in command
        {
          code: 'exec(`git clone ${userRepo}`);',
          errors: [{ messageId: 'shellInjection' }],
        },
        // execSync with concatenation
        {
          code: "execSync('rm -rf ' + path);",
          errors: [{ messageId: 'shellInjection' }],
        },
        // Multiple expressions in template
        {
          code: 'exec(`ls ${dir} | grep ${pattern}`);',
          errors: [{ messageId: 'shellInjection' }],
        },
        // Concat chain
        {
          code: "const cmd = 'git'; exec(cmd + ' ' + userInput);",
          errors: [{ messageId: 'shellInjection' }],
        },
        // member form with template literal
        {
          code: 'child_process.exec(`rm -rf ${dir}`);',
          errors: [{ messageId: 'shellInjection' }],
        },
        // execSync with template literal
        {
          code: 'execSync(`npm install ${packageName}`);',
          errors: [{ messageId: 'shellInjection' }],
        },
      ],
    });
  });

  describe('Benchmark FP/FN Regression', () => {
    ruleTester.run('benchmark regression - no FPs on safe patterns', noShellInjection, {
      valid: [
        // spawn with user-controlled args — safe because args[] is the parameterized form
        { code: "spawn('git', ['clone', userInput], { shell: false });" },
        // execFile — PATH-safe; first arg is binary path, second is args array
        { code: "execFile('/bin/ls', [userDir]);" },
        // Indirect variable reference — too indirect for structural detection
        { code: "const cmd = buildSafeCommand(input); exec(cmd);" },
        // Literal-only exec even with trailing callback
        { code: "exec('ls -la', (err, stdout) => console.log(stdout));" },
      ],
      invalid: [
        // TP: classic exec injection
        {
          code: "exec('find ' + userPath + ' -name \"*.js\"');",
          errors: [{ messageId: 'shellInjection' }],
        },
        // TP: template literal in execSync
        {
          code: 'execSync(`ping -c 1 ${host}`);',
          errors: [{ messageId: 'shellInjection' }],
        },
      ],
    });
  });
});
