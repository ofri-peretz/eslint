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
      { name: 'argv passed as an array', code: `spawn('kill', ['-9', String(pid)]);` },
      { code: `execFile('git', ['clone', repoUrl]);` },
      { code: `cp.spawnSync('ls', ['-la', dir]);` },
      // A shell with a fully static command line
      { code: `spawn('bash', ['-c', 'ls -la']);` },
      { code: `spawn('bash', ['-lc']);` },
      { code: `spawn('bash', ['--login']);` },
      // -e is errexit to a POSIX shell, not a command flag
      { code: `spawn('bash', ['-e', deployScript]);` },
      // /k is a cmd flag, not a POSIX one
      { code: `spawn('sh', ['/k', userCommand]);` },
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
      // Coverage-gap pin: a bare identifier as the WHOLE command line is
      // no-shell-injection's documented gap, and not this rule's shape either
      // (exec is not an argv-taking function). The mirror-image invalid case —
      // the same identifier in a -c argv slot — is asserted below.
      { code: `exec(userCommand);` },
      { code: `execSync(userCommand);` },

      // ── Rule-corpus regressions (benchmarks/rule-corpus/node-security__no-dynamic-command-string)
      // A command line hoisted to a module constant is not assembled. Reporting
      // every bare identifier in command position made `const BUILD = '…'` a
      // false positive — the shape a repo reaches for to keep scripts in one place.
      {
        code: `const BUILD = 'npm ci && npm run build'; spawn('bash', ['-c', BUILD]);`,
      },
      {
        code: `const SCRIPTS = { build: 'npm run build' }; spawn('sh', ['-c', SCRIPTS.build]);`,
      },
      {
        code: `const SCRIPTS = Object.freeze({ build: 'npm run build' }); spawn('sh', ['-c', SCRIPTS.build]);`,
      },
      // Literal keys spell the same object.
      {
        code: `const SCRIPTS = { 'build': \`npm run build\` }; spawn('sh', ['-c', SCRIPTS.build]);`,
      },
      // A shell NAME in the argv vector is not a shell INVOCATION: no command
      // flag follows it, and the `-c` here belongs to apt-get.
      {
        code: `spawn('apt-get', ['install', '-y', '-c', cacheDir, 'bash', 'zsh']);`,
      },
      // `bash <script>` reads a file; nothing on the argv is re-parsed.
      { code: `spawn('bash', [scriptPath]);` },
      // `let` can be rewritten between the declaration and the call, so its
      // initializer proves nothing — deliberately still reported.
      // (asserted in `invalid` below; kept here as the contrast note)
    ],
    invalid: [
      // bash -c with an interpolated command line
      {
        name: 'bash -c with an interpolated string re-enters the shell',
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
      // PowerShell really does take -e (-EncodedCommand)
      {
        code: 'spawn(\'pwsh\', [\'-e\', `Remove-Item ${file}`]);',
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

      // ── Rule-corpus regressions (benchmarks/rule-corpus/node-security__no-dynamic-command-string)
      // Every one of these was a false negative measured on the corpus: the
      // injection is unchanged, only the spelling at the call site moved.
      // The interpreter path behind a `const`.
      {
        code: 'const SHELL = \'/bin/bash\'; spawn(SHELL, [\'-c\', `.githooks/${hook} ${ref}`]);',
        errors: [{ messageId: 'shellFlagInjection' as const }],
      },
      // The argv vector built one statement above the call.
      {
        code: 'const argv = [\'-c\', `pkill -TERM -P ${pid}`]; spawnSync(\'sh\', argv);',
        errors: [{ messageId: 'shellFlagInjection' as const }],
      },
      // Clustered POSIX options: `-lc` is `-l` plus `-c`, and CI runners write
      // it that way so nvm/rbenv shims are on PATH.
      {
        code: 'spawn(\'bash\', [\'-lc\', `nvm use ${version} && ${script}`]);',
        errors: [{ messageId: 'shellFlagInjection' as const }],
      },
      {
        code: 'spawn(\'sh\', [\'-euc\', `deploy ${env}`]);',
        errors: [{ messageId: 'shellFlagInjection' as const }],
      },
      // execa's array form is safe because no shell is involved — unless the
      // program you spawn IS the shell.
      {
        code: 'execa(\'bash\', [\'-c\', `psql -f migrations/${name}.sql`]);',
        errors: [{ messageId: 'shellFlagInjection' as const }],
      },
      {
        code: 'execaSync(\'bash\', [\'-c\', `psql -f migrations/${name}.sql`]);',
        errors: [{ messageId: 'shellFlagInjection' as const }],
      },
      // The shell inside the argument vector: sudo and docker exec forward the
      // rest verbatim, so the re-parse is identical.
      {
        code: 'spawn(\'sudo\', [\'bash\', \'-c\', `useradd -m ${username}`]);',
        errors: [{ messageId: 'shellFlagInjection' as const }],
      },
      {
        code: 'spawnSync(\'docker\', [\'exec\', \'-i\', box, \'sh\', \'-c\', `tail /var/log/${svc}.log`]);',
        errors: [{ messageId: 'shellFlagInjection' as const }],
      },
      // `promisify(execFile)` is the form Node's own docs show; a plain alias is
      // the same hop without the wrapper.
      {
        code: 'const run = promisify(execFile); run(\'bash\', [\'-c\', `aws s3 sync s3://${bucket} .`]);',
        errors: [{ messageId: 'shellFlagInjection' as const }],
      },
      {
        code: 'const run = execFile; run(\'bash\', [\'-c\', `aws s3 sync s3://${bucket} .`]);',
        errors: [{ messageId: 'shellFlagInjection' as const }],
      },
      {
        code: 'const runLine = execaCommand; runLine(`git clone ${url}`);',
        errors: [{ messageId: 'commandStringInterpolation' as const }],
      },
      // A `let` is not a constant: it can be rewritten before the call runs.
      {
        code: `let BUILD = 'npm ci'; spawn('bash', ['-c', BUILD]);`,
        errors: [{ messageId: 'shellFlagInjection' as const }],
      },
      // Const-object resolution stops where the evidence stops: a computed key,
      // a non-literal value, a deeper path and a non-object initializer all mean
      // "unknown", which for a command string is reported, not excused.
      {
        code: `const SCRIPTS = { build: 'npm run build' }; spawn('sh', ['-c', SCRIPTS[key]]);`,
        errors: [{ messageId: 'shellFlagInjection' as const }],
      },
      {
        code: `const SCRIPTS = { build: userCommand }; spawn('sh', ['-c', SCRIPTS.build]);`,
        errors: [{ messageId: 'shellFlagInjection' as const }],
      },
      {
        code: `const SCRIPTS = { [key]: 'npm run build' }; spawn('sh', ['-c', SCRIPTS.build]);`,
        errors: [{ messageId: 'shellFlagInjection' as const }],
      },
      {
        code: `const SCRIPTS = { ...base }; spawn('sh', ['-c', SCRIPTS.build]);`,
        errors: [{ messageId: 'shellFlagInjection' as const }],
      },
      {
        code: `const SCRIPTS = { other: 'npm run build' }; spawn('sh', ['-c', SCRIPTS.build]);`,
        errors: [{ messageId: 'shellFlagInjection' as const }],
      },
      {
        code: `const SCRIPTS = Object.freeze(); spawn('sh', ['-c', SCRIPTS.build]);`,
        errors: [{ messageId: 'shellFlagInjection' as const }],
      },
      {
        code: `const SCRIPTS = loadScripts(); spawn('sh', ['-c', SCRIPTS.build]);`,
        errors: [{ messageId: 'shellFlagInjection' as const }],
      },
      {
        code: `const SCRIPTS = { 1: 'npm run build' }; spawn('sh', ['-c', SCRIPTS.build]);`,
        errors: [{ messageId: 'shellFlagInjection' as const }],
      },
      // A private field is a property that is not an identifier.
      {
        code: `class Runner {
                 #script = 'npm run build';
                 static go(other) { spawn('sh', ['-c', other.#script]); }
               }`,
        errors: [{ messageId: 'shellFlagInjection' as const }],
      },
      {
        code: `spawn('sh', ['-c', config.scripts.build]);`,
        errors: [{ messageId: 'shellFlagInjection' as const }],
      },
      // Alias resolution stops where the evidence stops, too.
      {
        code: 'const run = makeRunner(); run(\'bash\', [\'-c\', `x ${y}`]); spawn(\'bash\', [\'-c\', `x ${y}`]);',
        errors: [{ messageId: 'shellFlagInjection' as const }],
      },
      {
        code: 'const run = promisify(); run(\'bash\', [\'-c\', `x ${y}`]); spawn(\'bash\', [\'-c\', `x ${y}`]);',
        errors: [{ messageId: 'shellFlagInjection' as const }],
      },
      {
        code: 'const run = promisify(unrelated); run(\'bash\', [\'-c\', `x ${y}`]); spawn(\'bash\', [\'-c\', `x ${y}`]);',
        errors: [{ messageId: 'shellFlagInjection' as const }],
      },
      {
        code: 'const run = promisify(obj[method]); run(\'bash\', [\'-c\', `x ${y}`]); spawn(\'bash\', [\'-c\', `x ${y}`]);',
        errors: [{ messageId: 'shellFlagInjection' as const }],
      },
    ],
  });
});
