/**
 * detect-child-process — divergences the Quint fidelity model found between
 * the rule and its documented contract
 * (benchmarks/suites/fidelity/models/node-security/detect_child_process.qnt).
 *
 *   - `process.env` is configuration, not a request: the "Not a finding" row
 *     `cp.exec(process.env.DEPLOY_CMD)` was reported on every spelling.
 *   - `reportUnresolvedCommands` covers spawn/execFile too: a command "whose
 *     provenance cannot be resolved" is reported whichever method runs it.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { detectChildProcess } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const UNRESOLVED = [{ reportUnresolvedCommands: true }];

describe('detect-child-process fidelity', () => {
  ruleTester.run(
    'process.env and unresolved no-shell commands',
    detectChildProcess,
    {
      valid: [
        {
          name: 'exec of process.env is configuration, not a request',
          code: `const cp = require('child_process');
export function handler(req: any) { cp['exec'](process.env.DEPLOY_CMD); }`,
        },
        {
          name: 'execSync of process.env stays silent under reportUnresolvedCommands',
          code: `const { execSync } = require('node:child_process');
export function handler(req: any) { execSync(process.env.DEPLOY_CMD); }`,
          options: UNRESOLVED,
        },
        {
          name: 'spawn of process.argv has resolved provenance and no shell',
          code: `import { spawn } from 'node:child_process';
export function handler(req: any) { spawn(process.argv[2], ['--version']); }`,
          options: UNRESOLVED,
        },
        {
          name: 'exec of process.env with a callback stays silent under the option',
          code: `const { exec } = require('child_process');
export function handler(req: any, cb: () => void) { exec(process.env.DEPLOY_CMD as string, cb); }`,
          options: UNRESOLVED,
        },
        {
          name: 'a shell spawn of an env command with a literal argv list stays silent under the option',
          code: `const { spawn } = require('child_process');
export function handler(req: any) { spawn(process.env.BIN as string, ['-x'], { shell: true }); }`,
          options: UNRESOLVED,
        },
      ],
      invalid: [
        {
          name: 'reportUnresolvedCommands reports spawn of an unresolved command',
          code: `import { spawn } from 'node:child_process';
export function handler(req: any, cmd: string) { spawn(cmd, ['--version']); }`,
          options: UNRESOLVED,
          errors: [{ messageId: 'untrustedProgram' }],
        },
        {
          name: 'reportUnresolvedCommands reports execFile of an unresolved command',
          code: `const { execFile } = require('child_process');
export function handler(req: any, cmd: string) { execFile(cmd, ['--version']); }`,
          options: UNRESOLVED,
          errors: [{ messageId: 'untrustedProgram' }],
        },
        {
          name: 'process.argv spliced into a shell string still reports',
          code: `const { exec } = require('child_process');
export function handler(req: any) { exec('ls ' + process.argv[2]); }`,
          errors: [{ messageId: 'childProcessCommandInjection' }],
        },
        {
          name: 'a template mixing process.env with an unresolved value reports under the option',
          code: `const { exec } = require('child_process');
export function handler(req: any, dir: string) { exec(\`\${process.env.BIN} \${dir}\`); }`,
          options: UNRESOLVED,
          errors: [{ messageId: 'childProcessCommandInjection' }],
        },
        {
          name: 'a spawn with a shell, an env command and an unresolved argv list reports under the option',
          code: `const { spawn } = require('child_process');
export function handler(req: any, args: string[]) { spawn(process.env.BIN as string, args, { shell: true }); }`,
          options: UNRESOLVED,
          errors: [{ messageId: 'childProcessCommandInjection' }],
        },
        {
          name: 'a cyclic const chain has no resolved provenance under the option',
          code: `const { exec } = require('child_process');
export function handler(req: any) { const a: string = b; const b: string = a; exec(a); }`,
          options: UNRESOLVED,
          errors: [{ messageId: 'childProcessCommandInjection' }],
        },
      ],
    },
  );
});
