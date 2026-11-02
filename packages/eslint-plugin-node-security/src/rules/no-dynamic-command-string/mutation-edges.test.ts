/**
 * no-dynamic-command-string — the edges Stryker found unpinned.
 *
 * Each case states one claim about the rule's documented behaviour: which argv
 * elements a shell re-parses, and which `const` object reads are proven static.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDynamicCommandString } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const SHELL_FLAG = [{ messageId: 'shellFlagInjection' as const }];

describe('no-dynamic-command-string mutation edges', () => {
  ruleTester.run('no-dynamic-command-string', noDynamicCommandString, {
    valid: [
      // ── which elements are command flags ─────────────────────────────────
      {
        name: 'a PowerShell script parameter ending in c is not a POSIX option cluster',
        code: "spawn('pwsh', ['-File', 'deploy.ps1', '-Sync', target]);",
      },
      {
        name: 'a long option ending in rc is not a -c cluster',
        code: "spawn('bash', ['--norc', scriptPath]);",
      },
      {
        name: 'an argv built by a call is not an array this rule reads',
        code: "const argv = buildArgv(task); spawn('sh', argv);",
      },
      // ── which object reads are static ────────────────────────────────────
      {
        name: 'a key written after a spread is the value the object holds',
        code: "const SCRIPTS = { ...defaults, build: 'npm run build' }; spawn('sh', ['-c', SCRIPTS.build]);",
      },
      {
        name: 'BUG: a computed string key is the property it spells',
        code: "const SCRIPTS = { ['build']: 'npm run build' }; spawn('sh', ['-c', SCRIPTS.build]);",
      },
    ],
    invalid: [
      {
        name: 'BUG: -c inside an option cluster is a command flag wherever it sits',
        code: "spawn('sh', ['-ce', `deploy ${env}`]);",
        errors: SHELL_FLAG,
      },
      {
        name: 'BUG: a spread after the key may overwrite it',
        code: "const SCRIPTS = { build: 'npm run build', ...overrides }; spawn('sh', ['-c', SCRIPTS.build]);",
        errors: SHELL_FLAG,
      },
      {
        name: 'BUG: the last write of a duplicated key is the one the object holds',
        code: "const SCRIPTS = { build: 'npm run build', build: userCommand }; spawn('sh', ['-c', SCRIPTS.build]);",
        errors: SHELL_FLAG,
      },
      {
        name: 'a computed key named by a variable may overwrite the key',
        code: "const SCRIPTS = { build: 'npm run build', [task]: userCommand }; spawn('sh', ['-c', SCRIPTS.build]);",
        errors: SHELL_FLAG,
      },
      // ── which function a callee names ────────────────────────────────────
      {
        name: 'a const alias of a renamed child_process import keeps the name it is called by',
        code: [
          "import { spawn as rawSpawn } from 'node:child_process';",
          'const spawn = rawSpawn;',
          "spawn('bash', ['-c', `kill -9 ${pid}`]);",
        ].join('\n'),
        errors: SHELL_FLAG,
      },
      {
        name: 'a local bound to execa is judged as execa, not by the name it is given',
        code: [
          "import { execa } from 'execa';",
          'const execaCommand = execa;',
          "execaCommand('bash', ['-c', `deploy ${env}`]);",
        ].join('\n'),
        errors: [
          {
            messageId: 'shellFlagInjection' as const,
            data: { fn: 'execa', shell: 'bash', flag: '-c' },
          },
        ],
      },
      {
        name: 'a computed read through a variable named like a key is still a runtime key',
        code: "const SCRIPTS = { build: 'npm run build' }; spawn('sh', ['-c', SCRIPTS[build]]);",
        errors: SHELL_FLAG,
      },
      {
        name: 'a config returned by a function other than Object.freeze is not an object literal',
        code: "const SCRIPTS = loadScripts({ build: 'npm run build' }); spawn('sh', ['-c', SCRIPTS.build]);",
        errors: SHELL_FLAG,
      },
    ],
  });
});
