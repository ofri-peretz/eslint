/**
 * Tests for no-dynamic-command-string rule
 * Security: CWE-77 - Command Injection
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

describe('no-dynamic-command-string', () => {
  ruleTester.run('no-dynamic-command-string', noDynamicCommandString, {
    valid: [
      // THE safe pattern — the program is invoked directly with its own argv
      { code: `spawn('kill', ['-9', String(pid)]);` },
      { code: `execFile('git', ['clone', repoUrl]);` },
      { code: `cp.spawnSync('ls', ['-la', dir]);` },
      // A shell with a fully static command line
      { code: `spawn('bash', ['-c', 'ls -la']);` },
      { code: `spawn('bash', ['-lc']);` },
      { code: `spawn('bash', ['--login']);` },
      { code: `spawn('bash', [flagVar, cmd]);` },
      { code: `spawn('bash', [1, cmd]);` },
      { code: `spawn('bash', [, cmd]);` },
      { code: `spawn('bash', ['-c', , ]);` },
      { code: `spawn('bash', args);` },
      { code: `spawn('bash');` },
      // Not a shell interpreter
      { code: 'spawn(\'git\', [\'-c\', `user.name=${name}`]);' },
      { code: 'spawn(shellPath, [\'-c\', `kill ${pid}`]);' },
      { code: 'spawn(42, [\'-c\', `kill ${pid}`]);' },
      // Escaping forms of the command-runner libraries
      { code: 'await $`git clone ${url}`;' },
      { code: 'await execa`git clone ${url}`;' },
      { code: 'await $.raw`git status`;' },
      { code: `execa('git', ['clone', url]);` },
      { code: `execaCommand('git status');` },
      { code: `execaCommand();` },
      // Unrelated calls
      { code: `run(\`git clone \${url}\`);` },
      { code: `obj[method](\`git clone \${url}\`);` },
      { code: `obj['execaCommand'](\`git clone \${url}\`);` },
      { code: `getRunner()(\`git clone \${url}\`);` },
      { code: `execaCommand({ command: cmd });` },
      { code: `exec(\`git clone \${url}\`);` },
      { code: 'tag`git clone ${url}`;' },
      { code: 'obj[fn]`git clone ${url}`;' },
      { code: 'getTag()`git clone ${url}`;' },
    ],
    invalid: [
      // bash -c with an interpolated command line
      {
        code: 'spawn(\'bash\', [\'-c\', `kill -9 ${pid}`]);',
        errors: [{ messageId: 'shellFlagInjection' as const }],
      },
      // sh -c with concatenation, absolute path spelling
      {
        code: `execFile('/bin/sh', ['-c', 'rm -rf ' + target]);`,
        errors: [{ messageId: 'shellFlagInjection' as const }],
      },
      // A bare identifier is just as unverifiable
      {
        code: `spawnSync('zsh', ['-c', userCommand]);`,
        errors: [{ messageId: 'shellFlagInjection' as const }],
      },
      {
        code: `execFileSync('dash', ['-c', payload.command]);`,
        errors: [{ messageId: 'shellFlagInjection' as const }],
      },
      {
        code: `fork('busybox', ['-c', buildCommand()]);`,
        errors: [{ messageId: 'shellFlagInjection' as const }],
      },
      // Windows interpreters
      {
        code: 'spawn(\'cmd.exe\', [\'/c\', `del ${file}`]);',
        errors: [{ messageId: 'shellFlagInjection' as const }],
      },
      {
        code: 'spawn(\'powershell\', [\'-Command\', `Remove-Item ${file}`]);',
        errors: [{ messageId: 'shellFlagInjection' as const }],
      },
      // Flag not in the first position
      {
        code: 'spawn(\'bash\', [\'--login\', \'-c\', `deploy ${env}`]);',
        errors: [{ messageId: 'shellFlagInjection' as const }],
      },
      // Namespaced child_process import
      {
        code: 'cp.spawn(\'bash\', [\'-c\', `kill ${pid}`]);',
        errors: [{ messageId: 'shellFlagInjection' as const }],
      },
      // execaCommand does not escape its interpolations
      {
        code: 'await execaCommand(`git clone ${url}`);',
        errors: [{ messageId: 'commandStringInterpolation' as const }],
      },
      {
        code: `execaCommandSync('git clone ' + url);`,
        errors: [{ messageId: 'commandStringInterpolation' as const }],
      },
      {
        code: `execaCommand(commandLine);`,
        errors: [{ messageId: 'commandStringInterpolation' as const }],
      },
      // Member-call spelling flattens to the same runner name
      {
        code: 'getRunner().execaCommand(`git clone ${url}`);',
        errors: [{ messageId: 'commandStringInterpolation' as const }],
      },
      // zx's raw escape hatch
      {
        code: 'await $.raw`git clone ${url}`;',
        errors: [{ messageId: 'commandStringInterpolation' as const }],
      },
      {
        code: 'await $.raw(`git clone ${url}`);',
        errors: [{ messageId: 'commandStringInterpolation' as const }],
      },
      // Project-specific runner
      {
        code: 'runShell(`git clone ${url}`);',
        options: [{ extraCommandRunners: ['runShell'] }],
        errors: [{ messageId: 'commandStringInterpolation' as const }],
      },
    ],
  });
});
