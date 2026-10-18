/**
 * Mutation-guided edge fixtures for detect-child-process.
 *
 * Each case pins a verdict that a surviving Stryker mutant showed was free to
 * drift: the guard or detection branch it exercises had no fixture whose
 * outcome depended on it. Most need an attacker-steered value (`req.*`) to
 * matter, because the default mode is silent on unresolved-but-local input —
 * a suppressing branch is only observable when the call would otherwise report.
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

describe('detect-child-process mutation-guided edges', () => {
  ruleTester.run('mutation-guided edges', detectChildProcess, {
    valid: [
      // --- allowlist guards (hasPrecedingAllowlistValidation) ---------------
      {
        name: 'an argv value checked by an enclosing allowlist includes() is not reported',
        code: `
          import { execFile } from 'child_process';
          const FORMATS = ['png', 'jpg'];
          export function convert(req) {
            const fmt = req.query.fmt;
            if (FORMATS.includes(fmt)) {
              execFile('convert', ['in.png', fmt]);
            }
          }
        `,
      },
      {
        name: 'an allowlisted name interpolated next to a constant directory is not reported',
        code: `
          import { spawn } from 'child_process';
          const BIN_DIR = '/usr/local/bin';
          const TOOLS = ['convert', 'ffmpeg'];
          export function run(req) {
            const name = req.query.tool;
            if (TOOLS.includes(name)) {
              spawn(\`\${BIN_DIR}/\${name}\`, []);
            }
          }
        `,
      },
      {
        name: 'a throw-block allowlist guard before a spawn assigned to a variable clears the call',
        code: `
          import { spawn } from 'child_process';
          const TOOLS = ['convert', 'ffmpeg'];
          export function run(req) {
            const tool = req.query.tool;
            if (!TOOLS.includes(tool)) {
              throw new Error('unknown tool');
            }
            const child = spawn(tool, []);
            return child;
          }
        `,
      },
      {
        name: 'a bare `return` allowlist guard clears the call',
        code: `
          import { spawn } from 'child_process';
          const TOOLS = ['convert', 'ffmpeg'];
          export function run(req) {
            const tool = req.query.tool;
            if (!TOOLS.includes(tool)) return;
            spawn(tool, []);
          }
        `,
      },
      {
        name: 'a bare `throw` allowlist guard clears the call',
        code: `
          import { spawn } from 'child_process';
          const TOOLS = ['convert', 'ffmpeg'];
          export function run(req) {
            const tool = req.query.tool;
            if (!TOOLS.includes(tool)) throw new Error('unknown tool');
            spawn(tool, []);
          }
        `,
      },
      {
        name: 'an allowlist guard whose block starts with `return` clears the call',
        code: `
          import { spawn } from 'child_process';
          const TOOLS = ['convert', 'ffmpeg'];
          export function run(req) {
            const tool = req.query.tool;
            if (!TOOLS.includes(tool)) {
              return null;
            }
            spawn(tool, []);
          }
        `,
      },
      {
        name: 'a guarded name interpolated into a fixed path clears the call',
        code: `
          import { spawn } from 'child_process';
          const TOOLS = ['convert', 'ffmpeg'];
          export function run(req) {
            const name = req.query.tool;
            if (!TOOLS.includes(name)) throw new Error('unknown tool');
            spawn(\`/opt/tools/\${name}\`, []);
          }
        `,
      },
      {
        name: 'a guard on the request field itself clears the local copy passed to execFile',
        code: `
          import { execFile } from 'child_process';
          const TOOLS = ['convert', 'ffmpeg'];
          export function run(req) {
            const tool = req.query.tool;
            if (!TOOLS.includes(req.query.tool)) return;
            execFile(tool, []);
          }
        `,
      },

      // --- argument-injection prefix analysis (cannotStartWithDash) ---------
      {
        name: 'a templated argv element with a fixed non-dash prefix cannot become an option',
        code: `
          import { spawn } from 'child_process';
          export function render(req) {
            spawn('convert', ['in.png', \`report-\${req.query.id}.pdf\`]);
          }
        `,
      },
      {
        name: 'a concatenated argv element with a fixed non-dash prefix cannot become an option',
        code: `
          import { spawn } from 'child_process';
          export function render(req) {
            spawn('convert', ['in.png', 'out-' + req.query.id]);
          }
        `,
      },
      {
        name: 'spawning a resolved local binary path with no argv is not reported',
        code: `
          import { spawn } from 'child_process';
          import path from 'path';
          const bin = path.join(__dirname, 'bin/tool');
          spawn(bin);
        `,
      },
      {
        name: "a quoted 'shell': false key keeps the shell off",
        code: `
          import { spawn } from 'child_process';
          export function list(req) {
            spawn('ls', ['--', req.query.dir], { 'shell': false });
          }
        `,
      },
      {
        name: 'a spawn with no arguments is not reported',
        code: `
          import { spawn } from 'child_process';
          spawn();
        `,
      },

      // --- unknowable / free reference --------------------------------------
      {
        name: 'a command returned by a helper declared in this file is not unknowable',
        code: `
          import { execSync } from 'child_process';
          const getCommand = () => 'git rev-parse HEAD';
          export function sha() {
            return execSync(getCommand());
          }
        `,
      },
      {
        name: 'a module-level command read inside a function is not unknowable',
        code: `
          import { execSync } from 'child_process';
          let CMD = 'git status';
          export function status() {
            return execSync(CMD);
          }
        `,
      },

      // --- callee resolution -------------------------------------------------
      {
        name: "a RegExp registry looked up with 'child_process' is not the module",
        code: `
          export function match(req) {
            return getPattern('child_process').exec(req.body.text);
          }
        `,
      },
      {
        name: "a non-require call with 'child_process' is not reported as a bare require",
        code: `getPattern('child_process');`,
      },
      {
        name: 'exec imported from a local module is not child_process',
        code: `
          import { exec } from './sql';
          export function query(req) {
            return exec(req.query.q);
          }
        `,
      },
      {
        name: 'a callee declared without an initializer is not child_process',
        code: `
          import { exec } from 'child_process';
          let runner;
          runner = makeRunner();
          export function run(req) {
            return runner(req.query.cmd);
          }
        `,
      },
      {
        name: 'RegExp exec on a member chain is not child_process',
        code: `
          import { exec } from 'child_process';
          export class Matcher {
            match(req) {
              return this.pattern.exec(req.body.text);
            }
          }
        `,
      },
      {
        name: 'RegExp exec on a regex assigned after its declaration is not child_process',
        code: `
          let re;
          re = /a+/;
          export function match(req) {
            return re.exec(req.body.text);
          }
        `,
      },
      {
        name: 'an unrelated function called with request data in a child_process module is not reported',
        code: `
          import { exec } from 'child_process';
          export function handle(req) {
            audit(req.query.cmd);
          }
        `,
      },

      // --- fully-literal calls under reportUnresolvedCommands ----------------
      {
        name: 'a literal execSync command is not reported even when reporting unresolved commands',
        code: `
          import { execSync } from 'child_process';
          execSync('git status');
        `,
        options: UNRESOLVED,
      },
      {
        name: 'a literal exec command is not reported even when reporting unresolved commands',
        code: `
          import { exec } from 'child_process';
          exec('ls -la');
        `,
        options: UNRESOLVED,
      },
      {
        name: 'allowLiteralStrings keeps a literal exec with a dynamic options object quiet',
        code: `
          import { exec } from 'child_process';
          exec('ls', { cwd: dir });
        `,
        options: [
          { allowLiteralStrings: true, reportUnresolvedCommands: true },
        ],
      },
      {
        name: 'a fully literal node -e script is not reported',
        code: `
          import { spawn } from 'child_process';
          spawn('node', ['-e', 'console.log(1)']);
        `,
        options: UNRESOLVED,
      },
      {
        name: 'a fully literal sh -c script with shell: false is not reported',
        code: `
          import { spawn } from 'child_process';
          spawn('sh', ['-c', 'ls'], { shell: false });
        `,
        options: UNRESOLVED,
      },
      {
        name: 'a fully literal sh -c script with options but no shell key is not reported',
        code: `
          import { spawn } from 'child_process';
          spawn('sh', ['-c', 'ls'], { cwd: '/tmp' });
        `,
        options: UNRESOLVED,
      },
      {
        name: 'a fully literal execFile is not reported even with shell: true',
        code: `
          import { execFile } from 'child_process';
          execFile('git', ['status'], { shell: true });
        `,
        options: UNRESOLVED,
      },
      {
        name: 'a fully literal execFileSync is not reported even with shell: true',
        code: `
          import { execFileSync } from 'child_process';
          execFileSync('git', ['status'], { shell: true });
        `,
        options: UNRESOLVED,
      },
      {
        name: 'allowLiteralSpawn keeps a fully literal spawn with shell: true quiet',
        code: `
          import { spawn } from 'child_process';
          spawn('ls', ['-la'], { shell: true });
        `,
        options: [{ allowLiteralSpawn: true, reportUnresolvedCommands: true }],
      },
    ],
    invalid: [
      // --- per-binary eval flags (EVAL_INVOCATIONS) -------------------------
      {
        name: 'python -c with request data is command injection',
        code: `
          import { execFile } from 'child_process';
          export function run(req) { execFile('python', ['-c', req.body.code]); }
        `,
        errors: [{ messageId: 'childProcessCommandInjection' }],
      },
      {
        name: 'python2 -c with request data is command injection',
        code: `
          import { execFile } from 'child_process';
          export function run(req) { execFile('python2', ['-c', req.body.code]); }
        `,
        errors: [{ messageId: 'childProcessCommandInjection' }],
      },
      {
        name: 'nodejs -e with request data is command injection',
        code: `
          import { execFile } from 'child_process';
          export function run(req) { execFile('nodejs', ['-e', req.body.code]); }
        `,
        errors: [{ messageId: 'childProcessCommandInjection' }],
      },
      {
        name: 'bun -e with request data is command injection',
        code: `
          import { execFile } from 'child_process';
          export function run(req) { execFile('bun', ['-e', req.body.code]); }
        `,
        errors: [{ messageId: 'childProcessCommandInjection' }],
      },
      {
        name: 'ruby -e with request data is command injection',
        code: `
          import { execFile } from 'child_process';
          export function run(req) { execFile('ruby', ['-e', req.body.code]); }
        `,
        errors: [{ messageId: 'childProcessCommandInjection' }],
      },
      {
        name: 'osascript -e with request data is command injection',
        code: `
          import { execFile } from 'child_process';
          export function run(req) { execFile('osascript', ['-e', req.body.code]); }
        `,
        errors: [{ messageId: 'childProcessCommandInjection' }],
      },
      {
        name: 'an absolute path to python3 is still python for its -c flag',
        code: `
          import { execFile } from 'child_process';
          export function run(req) { execFile('/usr/bin/python3', ['-c', req.body.code]); }
        `,
        errors: [{ messageId: 'childProcessCommandInjection' }],
      },
      {
        name: 'an absolute path to bash is still a shell',
        code: `
          import { spawn } from 'child_process';
          export function run(req) { spawn('/bin/bash', ['-c', req.body.script]); }
        `,
        errors: [{ messageId: 'childProcessCommandInjection' }],
      },

      // --- shell option ------------------------------------------------------
      {
        name: 'a spread options object does not hide a request value at an option position',
        code: `
          import { spawn } from 'child_process';
          export function log(req, opts) { spawn('git', ['log', req.query.ref], { ...opts }); }
        `,
        errors: [{ messageId: 'argumentInjection' }],
      },
      {
        // Rule fix (FN): `{ 'shell': true }` is the same object as `{ shell: true }`,
        // but the shell lookup required an Identifier key, so a quoted key was
        // read as "no shell" and the `--` then cleared the call.
        name: "a quoted 'shell' key still turns the shell on",
        code: `
          import { spawn } from 'child_process';
          export function list(req) { spawn('ls', ['--', req.query.dir], { 'shell': true }); }
        `,
        errors: [{ messageId: 'childProcessCommandInjection' }],
      },
      {
        // Rule fix (FN): same as above, written as a computed string key.
        name: "a computed ['shell'] key still turns the shell on",
        code: `
          import { spawn } from 'child_process';
          export function list(req) { spawn('ls', ['--', req.query.dir], { ['shell']: true }); }
        `,
        errors: [{ messageId: 'childProcessCommandInjection' }],
      },

      // --- argument-injection prefix analysis --------------------------------
      {
        name: 'a template that starts with the request value can start with a dash',
        code: `
          import { spawn } from 'child_process';
          export function log(req) { spawn('git', ['log', \`\${req.query.ref}\`]); }
        `,
        errors: [{ messageId: 'argumentInjection' }],
      },
      {
        name: "an empty-string coercion ('' + value) can still start with a dash",
        code: `
          import { spawn } from 'child_process';
          export function log(req) { spawn('git', ['log', '' + req.query.ref]); }
        `,
        errors: [{ messageId: 'argumentInjection' }],
      },
      {
        name: 'a request value with a literal suffix can still start with a dash',
        code: `
          import { spawn } from 'child_process';
          export function log(req) { spawn('git', ['log', req.query.ref + '.txt']); }
        `,
        errors: [{ messageId: 'argumentInjection' }],
      },

      // --- untrusted program -------------------------------------------------
      {
        name: 'a request field used as the program is an untrusted program',
        code: `
          import { spawn } from 'child_process';
          export function run(req) { spawn(req.query.cmd, []); }
        `,
        errors: [{ messageId: 'untrustedProgram' }],
      },
      {
        name: 'a request field used as the program with no argv is an untrusted program',
        code: `
          import { spawn } from 'child_process';
          export function run(req) { spawn(req.query.cmd); }
        `,
        errors: [{ messageId: 'untrustedProgram' }],
      },
      {
        name: 'spawn destructured beside exec keeps its own method',
        code: `
          const { exec, spawn } = require('child_process');
          export function run(req) { spawn(req.query.cmd, []); }
        `,
        errors: [{ messageId: 'untrustedProgram' }],
      },

      // --- guards that are not allowlists -----------------------------------
      {
        name: 'an includes() guard on a different variable does not clear the argv',
        code: `
          import { execFile } from 'child_process';
          const FORMATS = ['png', 'jpg'];
          export function convert(req) {
            const fmt = req.query.fmt;
            const other = req.query.other;
            if (FORMATS.includes(other)) {
              execFile('convert', ['in.png', fmt]);
            }
          }
        `,
        errors: [{ messageId: 'argumentInjection' }],
      },
      {
        name: 'an includes() guard on a request field does not clear an enclosed argv',
        code: `
          import { execFile } from 'child_process';
          const FORMATS = ['png', 'jpg'];
          export function convert(req) {
            const fmt = req.query.fmt;
            if (FORMATS.includes(req.query.fmt)) {
              execFile('convert', ['in.png', fmt]);
            }
          }
        `,
        errors: [{ messageId: 'argumentInjection' }],
      },
      {
        name: 'an allowlisted name does not clear a different value interpolated into the program',
        code: `
          import { spawn } from 'child_process';
          const TOOLS = ['convert', 'ffmpeg'];
          export function run(req) {
            const name = req.query.tool;
            const other = req.query.other;
            if (TOOLS.includes(name)) {
              spawn(\`/opt/\${other}\`, []);
            }
          }
        `,
        errors: [{ messageId: 'untrustedProgram' }],
      },
      {
        name: 'an existsSync() check is not an allowlist',
        code: `
          import { execFile } from 'child_process';
          import fs from 'fs';
          export function run(req) {
            const bin = req.query.bin;
            if (fs.existsSync(bin)) {
              execFile(bin, []);
            }
          }
        `,
        errors: [{ messageId: 'untrustedProgram' }],
      },
      {
        name: 'a negated existsSync() guard clause is not an allowlist',
        code: `
          import { execFile } from 'child_process';
          import fs from 'fs';
          export function run(req) {
            const bin = req.query.bin;
            if (!fs.existsSync(bin)) throw new Error('missing');
            execFile(bin, []);
          }
        `,
        errors: [{ messageId: 'untrustedProgram' }],
      },
      {
        name: 'an enclosing type check is not an allowlist',
        code: `
          import { execFile } from 'child_process';
          export function run(req) {
            const bin = req.query.bin;
            if (isNonEmptyString(bin)) {
              execFile(bin, []);
            }
          }
        `,
        errors: [{ messageId: 'untrustedProgram' }],
      },
      {
        name: 'a negated type-check guard clause is not an allowlist',
        code: `
          import { execFile } from 'child_process';
          export function run(req) {
            const bin = req.query.bin;
            if (!isNonEmptyString(bin)) return;
            execFile(bin, []);
          }
        `,
        errors: [{ messageId: 'untrustedProgram' }],
      },
      {
        name: 'an emptiness guard is not an allowlist',
        code: `
          import { execFile } from 'child_process';
          export function run(req) {
            const bin = req.query.bin;
            if (!bin) return;
            execFile(bin, []);
          }
        `,
        errors: [{ messageId: 'untrustedProgram' }],
      },
      {
        name: 'an allowlist check that only logs does not stop the call',
        code: `
          import { spawn } from 'child_process';
          const TOOLS = ['convert', 'ffmpeg'];
          export function run(req) {
            const tool = req.query.tool;
            if (!TOOLS.includes(tool)) console.warn('unknown tool');
            spawn(tool, []);
          }
        `,
        errors: [{ messageId: 'untrustedProgram' }],
      },
      {
        name: 'an allowlist check with an empty block does not stop the call',
        code: `
          import { spawn } from 'child_process';
          const TOOLS = ['convert', 'ffmpeg'];
          export function run(req) {
            const tool = req.query.tool;
            if (!TOOLS.includes(tool)) {}
            spawn(tool, []);
          }
        `,
        errors: [{ messageId: 'untrustedProgram' }],
      },
      {
        name: 'a guard clause on one argv value does not clear a different one',
        code: `
          import { spawn } from 'child_process';
          const BRANCHES = ['main', 'develop'];
          export function push(req) {
            const branch = req.query.branch;
            const remote = req.query.remote;
            if (!BRANCHES.includes(branch)) throw new Error('bad branch');
            spawn('git', ['push', remote]);
          }
        `,
        errors: [{ messageId: 'argumentInjection' }],
      },
    ],
  });

  // Rule fix (FN): the destructured-require member lookup demanded an
  // Identifier key, so the quoted and computed spellings bound the local name
  // to nothing and the call was never recognised as exec.
  ruleTester.run('destructured require keys', detectChildProcess, {
    valid: [],
    invalid: [
      {
        // Rule fix (FN): `const { 'exec': run }` binds exec exactly as `{ exec: run }`.
        name: "a quoted 'exec' key in a destructured require still binds exec",
        code: `
          const { 'exec': run } = require('child_process');
          export function handle(req) { run(req.query.cmd); }
        `,
        errors: [{ messageId: 'childProcessCommandInjection' }],
      },
      {
        // Rule fix (FN): the bundler spelling `{ ['exec']: run }` binds exec too.
        name: "a computed ['exec'] key in a destructured require still binds exec",
        code: `
          const { ['exec']: run } = require('child_process');
          export function handle(req) { run(req.query.cmd); }
        `,
        errors: [{ messageId: 'childProcessCommandInjection' }],
      },
    ],
  });
});
