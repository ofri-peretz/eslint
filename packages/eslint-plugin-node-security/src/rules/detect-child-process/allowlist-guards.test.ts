/**
 * detect-child-process — what an allowlist guard does and does not clear.
 *
 * Owner decisions of 2026-10-18 (benchmarks/audits/2026-10-18-fp-fn-quint-stryker.md,
 * "detect-child-process guards are loose"):
 *
 *   - a guard clears only the argument it validates, never the whole call;
 *   - `includes()` / `has()` count only on a constant allowlist — an array or
 *     Set literal, or a `const` bound to one;
 *   - the enclosing-`if` form and the early-exit form agree;
 *   - `cp[m](…)` with `const m = 'exec'` is the same sink as `cp.exec(…)`;
 *   - `reportUnresolvedCommands` does not report a fully literal `exec`.
 *
 * Every invalid case here was silent on the rule before these decisions, and
 * every valid case under "the two guard forms agree" was reported.
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

describe('a guard clears only the argument it validates', () => {
  ruleTester.run('per-argument validation', detectChildProcess, {
    valid: [
      {
        name: 'every tainted argv element validated: the call is cleared',
        code: `
          import { execFile } from 'child_process';
          const BRANCHES = ['main', 'dev'];
          const REMOTES = new Set(['origin']);
          export function push(req) {
            const branch = req.body.branch;
            const remote = req.body.remote;
            if (!BRANCHES.includes(branch)) return;
            if (!REMOTES.has(remote)) return;
            execFile('git', ['push', remote, branch]);
          }
        `,
      },
      {
        name: 'one conjunction validating both arguments clears both',
        code: `
          import { execFile } from 'child_process';
          const BRANCHES = ['main', 'dev'];
          const REMOTES = ['origin'];
          export function push(req) {
            const branch = req.body.branch;
            const remote = req.body.remote;
            if (BRANCHES.includes(branch) && REMOTES.includes(remote)) {
              execFile('git', ['push', remote, branch]);
            }
          }
        `,
      },
      {
        name: 'a validated argv element is set aside when the command is merely unresolved',
        code: `
          import { spawn } from 'child_process';
          const BRANCHES = ['main', 'dev'];
          export function push(req, git) {
            const branch = req.body.branch;
            if (!BRANCHES.includes(branch)) return;
            spawn(git, ['push', branch], { shell: true });
          }
        `,
      },
    ],
    invalid: [
      {
        name: 'a shell spawn with one validated and one unvalidated argv element',
        code: `
          import { spawn } from 'child_process';
          const BRANCHES = ['main', 'dev'];
          export function push(req) {
            const branch = req.body.branch;
            if (!BRANCHES.includes(branch)) return;
            spawn('git', ['push', req.body.remote, branch], { shell: true });
          }
        `,
        errors: [{ messageId: 'childProcessCommandInjection' }],
      },
      {
        name: 'includes(branch) does not clear an unvalidated remote',
        code: `
          import { execFile } from 'child_process';
          const BRANCHES = ['main', 'dev'];
          export function push(req) {
            const branch = req.body.branch;
            const remote = req.body.remote;
            if (!BRANCHES.includes(branch)) return;
            execFile('git', ['push', remote, branch]);
          }
        `,
        errors: [{ messageId: 'argumentInjection' }],
      },
      {
        name: 'a validated argument does not clear an unvalidated program',
        code: `
          import { spawn } from 'child_process';
          const FORMATS = ['png', 'jpg'];
          export function convert(req) {
            const fmt = req.query.fmt;
            if (FORMATS.includes(fmt)) {
              spawn(req.query.tool, [fmt]);
            }
          }
        `,
        errors: [{ messageId: 'untrustedProgram' }],
      },
      {
        name: 'with reportUnresolvedCommands, the unvalidated half still reports',
        code: `
          import { execFile } from 'child_process';
          const BRANCHES = ['main', 'dev'];
          export function push(branch, remote) {
            if (!BRANCHES.includes(branch)) return;
            execFile('git', ['push', remote, branch], { shell: true });
          }
        `,
        options: UNRESOLVED,
        errors: [{ messageId: 'childProcessCommandInjection' }],
      },
    ],
  });
});

describe('includes()/has() count only on a constant allowlist', () => {
  ruleTester.run('constant receiver', detectChildProcess, {
    valid: [
      {
        name: 'an inline array literal is an allowlist',
        code: `
          import { spawn } from 'child_process';
          export function run(req) {
            const tool = req.query.tool;
            if (!['convert', 'ffmpeg'].includes(tool)) return;
            spawn(tool, []);
          }
        `,
      },
      {
        name: 'a const-bound Set literal is an allowlist',
        code: `
          import { spawn } from 'child_process';
          const TOOLS = new Set(['convert', 'ffmpeg']);
          export function run(req) {
            const tool = req.query.tool;
            if (!TOOLS.has(tool)) throw new Error('unknown tool');
            spawn(tool, []);
          }
        `,
      },
    ],
    invalid: [
      {
        name: 'a list the request supplied is not an allowlist',
        code: `
          import { spawn } from 'child_process';
          export function run(req) {
            const allowed = req.body.allowed;
            const tool = req.query.tool;
            if (!allowed.includes(tool)) return;
            spawn(tool, []);
          }
        `,
        errors: [{ messageId: 'untrustedProgram' }],
      },
      {
        name: 'a string literal receiver is a substring test, not an allowlist',
        code: `
          import { spawn } from 'child_process';
          export function run(req) {
            const tool = req.query.tool;
            if (!'convert ffmpeg'.includes(tool)) return;
            spawn(tool, []);
          }
        `,
        errors: [{ messageId: 'untrustedProgram' }],
      },
      {
        name: 'a let-bound array can be reassigned, so it is not an allowlist',
        code: `
          import { spawn } from 'child_process';
          let TOOLS = ['convert'];
          export function run(req) {
            const tool = req.query.tool;
            if (!TOOLS.includes(tool)) return;
            spawn(tool, []);
          }
        `,
        errors: [{ messageId: 'untrustedProgram' }],
      },
      {
        name: 'a guard with no argument validates nothing',
        code: `
          import { spawn } from 'child_process';
          const TOOLS = ['convert'];
          export function run(req) {
            if (!TOOLS.includes()) return;
            spawn(req.query.tool, []);
          }
        `,
        errors: [{ messageId: 'untrustedProgram' }],
      },
    ],
  });
});

describe('the enclosing-if form and the early-exit form agree', () => {
  ruleTester.run('guard forms', detectChildProcess, {
    valid: [
      {
        name: 'an early-exit guard in an outer block covers a call in a nested block',
        code: `
          import { spawn } from 'child_process';
          const TOOLS = ['convert', 'ffmpeg'];
          export function run(req, verbose) {
            const tool = req.query.tool;
            if (!TOOLS.includes(tool)) return;
            if (verbose) {
              spawn(tool, ['-v']);
            }
          }
        `,
      },
      {
        name: 'the else branch of a negated check is the validated branch',
        code: `
          import { spawn } from 'child_process';
          const TOOLS = ['convert', 'ffmpeg'];
          export function run(req) {
            const tool = req.query.tool;
            if (!TOOLS.includes(tool)) {
              throw new Error('unknown tool');
            } else {
              spawn(tool, []);
            }
          }
        `,
      },
      {
        name: 'a positive check whose else exits validates what follows',
        code: `
          import { spawn } from 'child_process';
          const TOOLS = ['convert', 'ffmpeg'];
          export function run(req) {
            const tool = req.query.tool;
            if (TOOLS.includes(tool)) {
              console.log('ok');
            } else {
              return;
            }
            spawn(tool, []);
          }
        `,
      },
      {
        name: 'a loop guard that continues validates the rest of the body',
        code: `
          import { spawn } from 'child_process';
          const TOOLS = ['convert', 'ffmpeg'];
          export function runAll(req) {
            for (const tool of req.body.tools) {
              if (!TOOLS.includes(tool)) continue;
              spawn(tool, []);
            }
          }
        `,
      },
    ],
    invalid: [
      {
        name: 'the else branch of a positive check is NOT validated',
        code: `
          import { spawn } from 'child_process';
          const TOOLS = ['convert', 'ffmpeg'];
          export function run(req) {
            const tool = req.query.tool;
            if (TOOLS.includes(tool)) {
              console.log('known');
            } else {
              spawn(tool, []);
            }
          }
        `,
        errors: [{ messageId: 'untrustedProgram' }],
      },
      {
        name: 'the then branch of a negated check is NOT validated',
        code: `
          import { spawn } from 'child_process';
          const TOOLS = ['convert', 'ffmpeg'];
          export function run(req) {
            const tool = req.query.tool;
            if (!TOOLS.includes(tool)) {
              spawn(tool, []);
            }
          }
        `,
        errors: [{ messageId: 'untrustedProgram' }],
      },
      {
        name: 'a positive check that falls through validates nothing after it',
        code: `
          import { spawn } from 'child_process';
          const TOOLS = ['convert', 'ffmpeg'];
          export function run(req) {
            const tool = req.query.tool;
            if (TOOLS.includes(tool)) {
              console.log('known tool');
            }
            spawn(tool, []);
          }
        `,
        errors: [{ messageId: 'untrustedProgram' }],
      },
      {
        name: 'a guard AFTER the call does not validate it',
        code: `
          import { spawn } from 'child_process';
          const TOOLS = ['convert', 'ffmpeg'];
          export function run(req) {
            const tool = req.query.tool;
            spawn(tool, []);
            if (!TOOLS.includes(tool)) return;
          }
        `,
        errors: [{ messageId: 'untrustedProgram' }],
      },
    ],
  });
});

describe('a computed method named by a const string', () => {
  ruleTester.run('cp[m]', detectChildProcess, {
    valid: [
      {
        name: 'a const naming a harmless member is not a sink',
        code: `
          const cp = require('child_process');
          const m = 'toString';
          export function f(req) { return cp[m](req.query.x); }
        `,
      },
    ],
    invalid: [
      {
        name: "cp[m](req.query.x) with const m = 'exec' is cp.exec(req.query.x)",
        code: `
          const cp = require('child_process');
          const m = 'exec';
          export function f(req) { return cp[m](req.query.x); }
        `,
        errors: [{ messageId: 'childProcessCommandInjection' }],
      },
      {
        name: 'a template-literal const names the method too',
        code: `
          import * as cp from 'node:child_process';
          const method = \`execSync\`;
          export function f(req) { return cp[method](req.query.x); }
        `,
        errors: [{ messageId: 'childProcessCommandInjection' }],
      },
    ],
  });
});

describe('reportUnresolvedCommands and a fully literal exec', () => {
  ruleTester.run('literal exec', detectChildProcess, {
    valid: [
      {
        name: "execSync('npm ci', { stdio }) is a fixed command",
        code: `
          import { execSync } from 'child_process';
          export function install(stdio) { execSync('npm ci', { stdio }); }
        `,
        options: UNRESOLVED,
      },
      {
        name: "exec('ls', callback) is a fixed command",
        code: `
          import { exec } from 'child_process';
          export function list(done) { exec('ls -la', done); }
        `,
        options: UNRESOLVED,
      },
    ],
    invalid: [
      {
        name: 'a non-literal command is still reported under the option',
        code: `
          import { execSync } from 'child_process';
          export function run(cmd, stdio) { execSync(cmd, { stdio }); }
        `,
        options: UNRESOLVED,
        errors: [{ messageId: 'childProcessCommandInjection' }],
      },
    ],
  });
});

describe('guard and resolution edges', () => {
  ruleTester.run('edges', detectChildProcess, {
    valid: [
      {
        name: 'a validated argv element ahead of an unresolved one is skipped, not reported',
        code: `
          import { execFile } from 'child_process';
          const BRANCHES = ['main', 'dev'];
          export function push(req, extra) {
            const branch = req.body.branch;
            if (!BRANCHES.includes(branch)) return;
            execFile('git', [branch, extra]);
          }
        `,
      },
      {
        name: 'a disjunction of negated checks that exits validates both values',
        code: `
          import { execFile } from 'child_process';
          const BRANCHES = ['main', 'dev'];
          const REMOTES = ['origin'];
          export function push(req) {
            const branch = req.body.branch;
            const remote = req.body.remote;
            if (!BRANCHES.includes(branch) || !REMOTES.includes(remote)) return;
            execFile('git', ['push', remote, branch]);
          }
        `,
      },
      {
        name: 'a guard clause inside a switch case validates the rest of the case',
        code: `
          import { spawn } from 'child_process';
          const TOOLS = ['convert', 'ffmpeg'];
          export function run(req, mode) {
            const tool = req.query.tool;
            switch (mode) {
              case 'run':
                if (!TOOLS.includes(tool)) return;
                spawn(tool, []);
                break;
            }
          }
        `,
      },
      {
        name: 'a computed method named by a parameter names nothing',
        code: `
          const cp = require('child_process');
          export function f(req, m) { return cp[m](req.query.x); }
        `,
      },
      {
        name: 'a private method called exec is not child_process',
        code: `
          export class Runner {
            #exec(cmd) { return cmd; }
            run(req) { return this.#exec(req.query.x); }
          }
        `,
      },
    ],
    invalid: [
      {
        name: 'a disjunction of positive checks proves neither value',
        code: `
          import { spawn } from 'child_process';
          const TOOLS = ['convert'];
          const LEGACY = ['ffmpeg'];
          export function run(req) {
            const tool = req.query.tool;
            const other = req.query.other;
            if (TOOLS.includes(tool) || LEGACY.includes(other)) {
              spawn(tool, []);
            }
          }
        `,
        errors: [{ messageId: 'untrustedProgram' }],
      },
      {
        name: 'a call inside the if test is not covered by its own branches',
        code: `
          import { spawnSync } from 'child_process';
          const TOOLS = ['convert'];
          export function run(req) {
            if (spawnSync(req.query.tool, []).status !== 0) {
              if (!TOOLS.includes(req.query.tool)) return;
            }
          }
        `,
        errors: [{ messageId: 'untrustedProgram' }],
      },
      {
        name: 'an unvalidated spread after a validated command is still an option source',
        code: `
          import { spawn } from 'child_process';
          const TOOLS = ['convert', 'ffmpeg'];
          export function run(req) {
            const tool = req.query.tool;
            if (!TOOLS.includes(tool)) return;
            spawn(tool, [...req.body.args]);
          }
        `,
        errors: [{ messageId: 'argumentInjection' }],
      },
    ],
  });
});

// Boundaries pinned by mutation testing (Stryker, 2026-10-18): each case is an
// input on which a surviving mutant of the guard logic and the rule disagreed.
describe('guard-logic edges found by mutation testing', () => {
  ruleTester.run('mutation edges', detectChildProcess, {
    valid: [
      {
        name: 'a hole in a constant list is still a constant list',
        code: `
          import { spawn } from 'child_process';
          export function run(req) {
            const tool = req.query.tool;
            if (!['convert', , 'ffmpeg'].includes(tool)) return;
            spawn(tool, []);
          }
        `,
      },
      {
        name: 'a guard clause at module top level covers the call after it',
        code: `
          import { spawn } from 'child_process';
          const TOOLS = ['convert'];
          const tool = req.query.tool;
          if (!TOOLS.includes(tool)) throw new Error('unknown tool');
          spawn(tool, []);
        `,
      },
      {
        name: 'reportUnresolvedCommands: a fully validated shell spawn is cleared',
        code: `
          import { spawn } from 'child_process';
          const TOOLS = ['convert'];
          const MODES = ['fast'];
          export function run(tool, mode) {
            if (!TOOLS.includes(tool) || !MODES.includes(mode)) return;
            spawn(tool, ['--mode', mode, , ], { shell: true });
          }
        `,
        options: UNRESOLVED,
      },
      {
        name: 'reportUnresolvedCommands: a validated command with an options object',
        code: `
          import { execFile } from 'child_process';
          const TOOLS = ['convert'];
          export function run(tool) {
            if (!TOOLS.includes(tool)) return;
            execFile(tool, { shell: true });
          }
        `,
        options: UNRESOLVED,
      },
      {
        name: 'reportUnresolvedCommands: a shell binary with no argv after a guard',
        code: `
          import { spawn } from 'child_process';
          const TOOLS = ['convert'];
          export function run(tool) {
            if (!TOOLS.includes(tool)) return;
            spawn('sh');
          }
        `,
        options: UNRESOLVED,
      },
      {
        name: 'a spawn with no arguments after a guard',
        code: `
          import { spawn } from 'child_process';
          const TOOLS = ['convert'];
          export function run(tool) {
            if (!TOOLS.includes(tool)) return;
            spawn();
          }
        `,
      },
      {
        name: 'allowLiteralStrings keeps even an argument-less exec() quiet',
        code: `const cp = require('child_process'); cp.exec();`,
        options: [
          { allowLiteralStrings: true, reportUnresolvedCommands: true },
        ],
      },
    ],
    invalid: [
      {
        name: 'a constant list with a request value in it is not an allowlist',
        code: `
          import { spawn } from 'child_process';
          export function run(req) {
            const tool = req.query.tool;
            if (!['convert', req.query.extra].includes(tool)) return;
            spawn(tool, []);
          }
        `,
        errors: [{ messageId: 'untrustedProgram' }],
      },
      {
        name: 'a list spread from the request is not an allowlist',
        code: `
          import { spawn } from 'child_process';
          export function run(req) {
            const tool = req.query.tool;
            if (![...req.body.list].includes(tool)) return;
            spawn(tool, []);
          }
        `,
        errors: [{ messageId: 'untrustedProgram' }],
      },
      {
        name: 'a constructed collection that is not a Set is not an allowlist',
        code: `
          import { spawn } from 'child_process';
          const TOOLS = new Registry(['convert']);
          export function run(req) {
            const tool = req.query.tool;
            if (!TOOLS.has(tool)) return;
            spawn(tool, []);
          }
        `,
        errors: [{ messageId: 'untrustedProgram' }],
      },
      {
        name: 'void is not a negation: its else branch is not validated',
        code: `
          import { spawn } from 'child_process';
          const TOOLS = ['convert'];
          export function run(req) {
            const tool = req.query.tool;
            if (void TOOLS.includes(tool)) {
              console.log('?');
            } else {
              spawn(tool, []);
            }
          }
        `,
        errors: [{ messageId: 'untrustedProgram' }],
      },
      {
        name: 'a conjunction of negated checks that exits proves neither value',
        code: `
          import { spawn } from 'child_process';
          const TOOLS = ['convert'];
          export function run(req) {
            const a = req.query.a;
            const b = req.query.b;
            if (!TOOLS.includes(a) && !TOOLS.includes(b)) return;
            spawn(a, []);
          }
        `,
        errors: [{ messageId: 'untrustedProgram' }],
      },
      {
        name: 'a validated name beside an unvalidated value in one template',
        code: `
          import { spawn } from 'child_process';
          const TOOLS = ['convert'];
          export function run(req) {
            const name = req.query.tool;
            if (!TOOLS.includes(name)) return;
            spawn(\`/opt/\${name}/\${req.query.v}\`, []);
          }
        `,
        errors: [{ messageId: 'untrustedProgram' }],
      },
      {
        name: 'reportUnresolvedCommands: one unvalidated argv element still reports',
        code: `
          import { spawn } from 'child_process';
          const TOOLS = ['convert'];
          export function run(tool, extra) {
            if (!TOOLS.includes(tool)) return;
            spawn(tool, ['-v', extra], { shell: true });
          }
        `,
        options: UNRESOLVED,
        errors: [{ messageId: 'childProcessCommandInjection' }],
      },
      {
        name: 'reportUnresolvedCommands: an argv list that is not an array literal',
        code: `
          import { spawn } from 'child_process';
          const TOOLS = ['convert'];
          export function run(tool, args) {
            if (!TOOLS.includes(tool)) return;
            spawn(tool, args, { shell: true });
          }
        `,
        options: UNRESOLVED,
        errors: [{ messageId: 'childProcessCommandInjection' }],
      },
      {
        name: 'allowLiteralStrings covers exec only, not an argument-less execSync',
        code: `const cp = require('child_process'); cp.execSync();`,
        options: [
          { allowLiteralStrings: true, reportUnresolvedCommands: true },
        ],
        errors: [{ messageId: 'childProcessCommandInjection' }],
      },
    ],
  });
});
