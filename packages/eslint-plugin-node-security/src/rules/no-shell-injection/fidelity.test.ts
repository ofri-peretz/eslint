/**
 * no-shell-injection — divergence the Quint fidelity model found
 * (benchmarks/suites/fidelity/models/node-security/no_shell_injection.qnt): a
 * renamed destructured child_process binding was matched by its local
 * spelling (`run`), which names no shell function, so it went silent.
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

describe('no-shell-injection fidelity', () => {
  ruleTester.run('renamed child_process bindings', noShellInjection, {
    valid: [
      {
        name: 'a local function named exec is not child_process',
        code: `const exec = (s: string) => s;
export function go(repoUrl: string) { exec('git clone ' + repoUrl); }`,
      },
    ],
    invalid: [
      {
        name: 'a renamed destructured exec is reported',
        code: `const { exec: run } = require('node:child_process');
export function go(repoUrl: string) { run('git clone ' + repoUrl); }`,
        errors: [{ messageId: 'shellInjection' }],
      },
      {
        name: 'a renamed destructured execSync with a template is reported',
        code: `const { execSync: run } = require('child_process');
export function go(repoUrl: string) { run(\`git clone \${repoUrl}\`); }`,
        errors: [{ messageId: 'shellInjection' }],
      },
      {
        name: 'a renamed destructured spawn with shell true is reported',
        code: `const { spawn: run } = require('child_process');
export function go(repoUrl: string) { run('git clone ' + repoUrl, { shell: true }); }`,
        errors: [{ messageId: 'shellInjection' }],
      },
      {
        name: 'a renamed exec is reported with requireModuleEvidence off',
        code: `const { exec: run } = require('node:child_process');
export function go(repoUrl: string) { run('git clone ' + repoUrl); }`,
        options: [{ requireModuleEvidence: false }],
        errors: [{ messageId: 'shellInjection' }],
      },
    ],
  });
});
