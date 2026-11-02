/**
 * Fixtures for Stryker survivors of detect-child-process (2026-11 pass).
 *
 * Each case pins a verdict a surviving mutant showed was free to drift.
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
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

const UNRESOLVED = [{ reportUnresolvedCommands: true }];

describe('detect-child-process survivor kills', () => {
  ruleTester.run(
    'operator configuration under reportUnresolvedCommands',
    detectChildProcess,
    {
      valid: [
        {
          // Rule fix (FP): the recursion depth cap counted every `+`, so the
          // leftmost part of a long concatenation sat past it and the whole
          // command read as unresolved.
          name: 'a command concatenated from many process.env values is still operator configuration',
          code: `
          import { exec } from 'child_process';
          exec(process.env.TOOL + ' ' + process.env.MODE + ' ' + process.env.SRC + ' ' + process.env.DEST + ' ' + process.env.EXTRA);
        `,
          options: UNRESOLVED,
        },
        {
          name: 'a template of process.env parts is operator configuration',
          code: `
          import { exec } from 'child_process';
          exec(\`deploy --target \${process.env.TARGET}\`);
        `,
          options: UNRESOLVED,
        },
        {
          name: 'a const copied from process.env is operator configuration',
          code: `
          import { exec } from 'child_process';
          const cmd = process.env.DEPLOY_CMD;
          exec(cmd);
        `,
          options: UNRESOLVED,
        },
        {
          name: 'a process.env command with an options object in the argv position is operator configuration',
          code: `
          import { spawn } from 'child_process';
          spawn(process.env.BUILD_CMD, { shell: true, stdio: 'inherit' });
        `,
          options: UNRESOLVED,
        },
      ],
      invalid: [
        {
          name: 'a field named env on some other object is not process.env',
          code: `
          import { exec } from 'child_process';
          export function deploy(settings) {
            exec(settings.env.DEPLOY_CMD);
          }
        `,
          options: UNRESOLVED,
          errors: [{ messageId: 'childProcessCommandInjection' }],
        },
      ],
    },
  );

  ruleTester.run('default mode', detectChildProcess, {
    valid: [
      {
        name: 'a numeric argv element is passed through, not read as a flag',
        code: `
          import { execFile } from 'child_process';
          export function run(script) {
            execFile('timeout', [30, script]);
          }
        `,
      },
      {
        name: 'spread defaults before shell: false still leave the shell off',
        code: `
          import { spawn } from 'child_process';
          const defaults = { cwd: '/srv/app' };
          spawn('git', ['status'], { ...defaults, shell: false });
        `,
      },
      {
        name: 'a guard on one argv value leaves an unguarded parameter command to the normal verdict',
        code: `
          import { execFile } from 'child_process';
          const FORMATS = ['png', 'jpg'];
          export function convert(tool, req) {
            if (FORMATS.includes(req.query.fmt)) {
              execFile(tool, ['-f', req.query.fmt]);
            }
          }
        `,
      },
      {
        name: 'an allowlisted command with no argv is cleared',
        code: `
          import { execFile } from 'child_process';
          const TOOLS = ['uptime', 'whoami'];
          export function run(req) {
            if (TOOLS.includes(req.query.tool)) {
              execFile(req.query.tool);
            }
          }
        `,
      },
      {
        name: 'an exec declared by a global comment is the environment, not child_process',
        code: `
          /* global exec, deploy */
          export function handle(req) {
            exec(req.body.cmd);
            deploy(req.body.target);
          }
        `,
      },
    ],
    invalid: [
      {
        name: 'execFile with shell: true and a request-supplied argv array is command injection',
        code: `
          import { execFile } from 'child_process';
          export function search(req) {
            execFile('grep', req.body.flags, { shell: true });
          }
        `,
        errors: [{ messageId: 'childProcessCommandInjection' }],
      },
      {
        name: 'an event field in an argv element is attacker-steered without a request property name',
        code: `
          import { execFile } from 'child_process';
          export const handler = async (event) => {
            execFile('git', ['clone', event.repoUrl]);
          };
        `,
        errors: [{ messageId: 'argumentInjection' }],
      },
    ],
  });
});
