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

/**
 * FIXTURE REALISM — every shell call below now imports child_process.
 *
 * They did not. The rule matched on the callee's NAME, so a bare `exec(...)`
 * with no import qualified, and the fixtures encoded that: 12 invalid cases
 * asserted a CWE-78 CVSS 9.8 report on code that imports nothing at all.
 *
 * That is the shape the rule now refuses, because it is also `db.exec(sql)`
 * from better-sqlite3 and every local helper called `exec` — probed on the
 * shipped rule, a SQLite DDL statement was reported as command injection.
 *
 * A fixture written to reach a branch certifies that branch's behaviour as
 * intended. These now certify the behaviour a user actually wants.
 */
describe('no-shell-injection', () => {
  describe('Valid - Safe Patterns', () => {
    ruleTester.run('valid - literal strings are safe', noShellInjection, {
      valid: [
        // Literal string — no injection surface
        { code: "import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from 'node:child_process';\nexec('ls -la /tmp');" },
        // execSync with literal — safe
        { code: "import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from 'node:child_process';\nexecSync('git status');" },
        // spawn with args array — structurally safe parameterization form
        { code: "import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from 'node:child_process';\nspawn('git', ['clone', userRepo]);" },
        // execFile routes via PATH-safe mechanism
        { code: "import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from 'node:child_process';\nexecFile('/usr/bin/git', ['clone', userRepo]);" },
        // exec with plain identifier — indirect; data-flow out of scope
        { code: "import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from 'node:child_process';\nexec(command);" },
        // Template literal with no expressions — just a tagged string
        { code: "import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from 'node:child_process';\nexec(`git status`);" },
        // member form with literal
        { code: "import * as child_process from 'node:child_process';\nchild_process.exec('ls -la');" },
        // execFileSync — safe parameterized form
        { code: "import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from 'node:child_process';\nexecFileSync('npm', ['install']);" },
        // spawnSync — safe parameterized form
        { code: "import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from 'node:child_process';\nspawnSync('git', ['pull', '--rebase']);" },
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
          code: 'import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from "node:child_process";\nexec(`git clone ${userRepo}`);',
          errors: [{ messageId: 'shellInjection' }],
        },
        // execSync with concatenation
        {
          code: "import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from 'node:child_process';\nexecSync('rm -rf ' + path);",
          errors: [{ messageId: 'shellInjection' }],
        },
        // Multiple expressions in template
        {
          code: 'import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from "node:child_process";\nexec(`ls ${dir} | grep ${pattern}`);',
          errors: [{ messageId: 'shellInjection' }],
        },
        // Concat chain
        {
          code: "import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from 'node:child_process';\nconst cmd = 'git'; exec(cmd + ' ' + userInput);",
          errors: [{ messageId: 'shellInjection' }],
        },
        // member form with template literal
        {
          code: 'import * as child_process from "node:child_process";\nchild_process.exec(`rm -rf ${dir}`);',
          errors: [{ messageId: 'shellInjection' }],
        },
        // execSync with template literal
        {
          code: 'import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from "node:child_process";\nexecSync(`npm install ${packageName}`);',
          errors: [{ messageId: 'shellInjection' }],
        },
      ],
    });
  });

  // ── FP lock: an interpolation that can only ever be one literal ─────────
  //
  // Corpus: Shopify/cli `bin/get-graphql-schemas.js:207`
  //   const localDir = schema.repo === 'world' ? '//' : schema.repo
  //   const localRepoDirectory = execSync(`/opt/dev/bin/dev cd --no-chdir ${localDir}`)
  //
  // Reported at CRITICAL (CVSS 9.8). `schema` walks a module-level table whose
  // seven rows all hardcode `repo: 'world'`, so both arms of the ternary are
  // the literal `'//'` and the command has exactly one spelling. The rule did
  // no constant folding at all — the shape of the argument was the whole test —
  // so every case below reported on the old predicate.
  describe('Constant Folding', () => {
    ruleTester.run('folded interpolations are not injection', noShellInjection, {
      valid: [
        // The corpus shape, reduced to the parts that matter.
        `const schemas = [
           {owner: 'shop', repo: 'world', pathToFile: 'a.graphql'},
           {owner: 'shop', repo: 'world', pathToFile: 'b.graphql'},
         ];
         function fetchFilesFromLocal() {
           for (const schema of schemas) {
             const localDir = schema.repo === 'world' ? '//' : schema.repo
             execSync(\`/opt/dev/bin/dev cd --no-chdir \${localDir}\`)
           }
         }`,
        // The individual folds, each on its own.
        "import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from \"node:child_process\";\nconst dir = '/srv'; execSync(`ls ${dir}`);",
        "import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from \"node:child_process\";\nconst dir = cond ? '/a' : '/b'; execSync(`ls ${dir}`);",
        "import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from \"node:child_process\";\nconst dir = '/a' + '/b'; execSync(`ls ${dir}`);",
        "import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from \"node:child_process\";\nconst dir = `/a`; execSync(`ls ${dir}`);",
        "import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from \"node:child_process\";\nconst n = 3; execSync(`head -n ${n} f`);",
        "import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from \"node:child_process\";\nconst cfg = {dir: '/srv'}; execSync(`ls ${cfg.dir}`);",
        "import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from \"node:child_process\";\nconst cfg = {dir: '/srv'}; const c = cfg; execSync(`ls ${c.dir}`);",
        "import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from \"node:child_process\";\nconst rows = [{d: '/a'}, {d: '/b'}]; for (const row of rows) { execSync(`ls ${row.d}`); }",
        "import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from \"node:child_process\";\nconst rows = [{d: '/a'}]; const alias = rows; for (const row of alias) { execSync(`ls ${row.d}`); }",
        "import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from \"node:child_process\";\nfor (const row of [{d: '/a'}]) { execSync(`ls ${row.d}`); }",
      ],
      invalid: [
        // A `let` can be reassigned between the declaration and the use, so its
        // initializer proves nothing.
        {
          code: "import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from 'node:child_process';\nlet dir = '/srv'; execSync(`ls ${dir}`);",
          errors: [{ messageId: 'shellInjection' }],
        },
        // One unresolved arm poisons the ternary.
        {
          code: "import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from 'node:child_process';\nconst dir = cond ? '/a' : userDir; execSync(`ls ${dir}`);",
          errors: [{ messageId: 'shellInjection' }],
        },
        // Corpus: Shopify/cli `packages/plugin-cloudflare/src/install-cloudflared.ts:135`
        // — `filename` comes off a parameter through `basename()`. Unresolved
        // is not safe, and this one must keep reporting.
        {
          code: 'import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from "node:child_process";\nfunction installMacos(binTarget) { const filename = basename(`${binTarget}.tgz`); execSync(`tar -xzf ${filename}`); }',
          errors: [{ messageId: 'shellInjection' }],
        },
        // A non-`+` binary operator is not string assembly.
        {
          code: "import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from 'node:child_process';\nconst n = 1 - 0; execSync(`head -n ${n} f`);",
          errors: [{ messageId: 'shellInjection' }],
        },
        // Property shapes the fold refuses: a spread, a computed key, and a
        // missing key all mean this object does not decide the value.
        {
          code: "import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from 'node:child_process';\nconst cfg = {...base, dir: '/srv'}; execSync(`ls ${cfg.dir}`);",
          errors: [{ messageId: 'shellInjection' }],
        },
        {
          code: "import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from 'node:child_process';\nconst cfg = {[k]: '/srv', dir: '/srv'}; execSync(`ls ${cfg.other}`);",
          errors: [{ messageId: 'shellInjection' }],
        },
        {
          code: "import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from 'node:child_process';\nconst cfg = {dir: '/srv'}; execSync(`ls ${cfg.missing}`);",
          errors: [{ messageId: 'shellInjection' }],
        },
        {
          code: "import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from 'node:child_process';\nconst cfg = {dir: '/srv'}; execSync(`ls ${cfg[k]}`);",
          errors: [{ messageId: 'shellInjection' }],
        },
        {
          code: "import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from 'node:child_process';\nconst cfg = {dir: '/srv'}; execSync(`ls ${cfg.#p}`);",
          errors: [{ messageId: 'shellInjection' }],
        },
        // Loop shapes the fold refuses.
        {
          code: 'import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from "node:child_process";\nfor (const row of rows) { execSync(`ls ${row.d}`); }',
          errors: [{ messageId: 'shellInjection' }],
        },
        {
          code: "import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from 'node:child_process';\nconst rows = [{d: '/a'}, other]; for (const row of rows) { execSync(`ls ${row.d}`); }",
          errors: [{ messageId: 'shellInjection' }],
        },
        {
          code: "import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from 'node:child_process';\nconst rows = ['/a', , '/b']; for (const row of rows) { execSync(`ls ${row.d}`); }",
          errors: [{ messageId: 'shellInjection' }],
        },
        {
          code: "import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from 'node:child_process';\nlet rows = [{d: '/a'}]; for (const row of rows) { execSync(`ls ${row.d}`); }",
          errors: [{ messageId: 'shellInjection' }],
        },
        {
          code: "import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from 'node:child_process';\nconst rows = notAnArray; for (const row of rows) { execSync(`ls ${row.d}`); }",
          errors: [{ messageId: 'shellInjection' }],
        },
        {
          code: 'import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from "node:child_process";\nfor (const row in rows) { execSync(`ls ${row.d}`); }',
          errors: [{ messageId: 'shellInjection' }],
        },
        // A `let` loop binding can be reassigned inside the body.
        {
          code: "import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from 'node:child_process';\nconst rows = [{d: '/a'}]; for (let row of rows) { execSync(`ls ${row.d}`); }",
          errors: [{ messageId: 'shellInjection' }],
        },
        // The iterable is neither an array literal nor a name bound to one.
        {
          code: 'import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from "node:child_process";\nfor (const row of getRows()) { execSync(`ls ${row.d}`); }',
          errors: [{ messageId: 'shellInjection' }],
        },
        // A destructured binding has no plain identifier to follow.
        {
          code: "import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from 'node:child_process';\nconst {dir} = cfg; execSync(`ls ${dir}`);",
          errors: [{ messageId: 'shellInjection' }],
        },
        // A parameter is decided by the caller.
        {
          code: 'import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from "node:child_process";\nfunction run(dir) { execSync(`ls ${dir}`); }',
          errors: [{ messageId: 'shellInjection' }],
        },
        // An unresolvable name.
        {
          code: 'import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from "node:child_process";\nexecSync(`ls ${nowhere}`);',
          errors: [{ messageId: 'shellInjection' }],
        },
        // Mutually-recursive `const`s terminate at the depth limit rather than
        // blowing the stack — once through the value fold, once through the
        // object resolver, once through the array resolver.
        {
          code: 'import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from "node:child_process";\nconst chain = a; const a = chain; execSync(`ls ${chain}`);',
          errors: [{ messageId: 'shellInjection' }],
        },
        {
          code: 'import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from "node:child_process";\nconst chain = a; const a = chain; execSync(`ls ${chain.d}`);',
          errors: [{ messageId: 'shellInjection' }],
        },
        {
          code: 'import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from "node:child_process";\nconst chain = a; const a = chain; for (const row of chain) { execSync(`ls ${row.d}`); }',
          errors: [{ messageId: 'shellInjection' }],
        },
        // A RegExp literal is not a constant string.
        {
          code: 'import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from "node:child_process";\nconst r = /x/; execSync(`ls ${r}`);',
          errors: [{ messageId: 'shellInjection' }],
        },
      ],
    });
  });

  describe('Benchmark FP/FN Regression', () => {
    ruleTester.run('benchmark regression - no FPs on safe patterns', noShellInjection, {
      valid: [
        // spawn with user-controlled args — safe because args[] is the parameterized form
        { code: "import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from 'node:child_process';\nspawn('git', ['clone', userInput], { shell: false });" },
        // execFile — PATH-safe; first arg is binary path, second is args array
        { code: "import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from 'node:child_process';\nexecFile('/bin/ls', [userDir]);" },
        // Indirect variable reference — too indirect for structural detection
        { code: "import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from 'node:child_process';\nconst cmd = buildSafeCommand(input); exec(cmd);" },
        // Literal-only exec even with trailing callback
        { code: "import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from 'node:child_process';\nexec('ls -la', (err, stdout) => console.log(stdout));" },
      ],
      invalid: [
        // TP: classic exec injection
        {
          code: "import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from 'node:child_process';\nexec('find ' + userPath + ' -name \"*.js\"');",
          errors: [{ messageId: 'shellInjection' }],
        },
        // TP: template literal in execSync
        {
          code: 'import { exec, execSync, spawn, spawnSync, execFile, execFileSync } from "node:child_process";\nexecSync(`ping -c 1 ${host}`);',
          errors: [{ messageId: 'shellInjection' }],
        },
      ],
    });
  });
});

/**
 * REGRESSION LOCK — the callee must resolve to child_process.
 *
 * `fnName = callee.property.name` matched EVERY `.exec()` in the ecosystem.
 * Probed on the shipped rule, better-sqlite3's `db.exec(sql)` was reported as
 * CWE-78 "Shell command injection" at CVSS 9.8, while detect-child-process —
 * which does resolve the binding — stayed correctly quiet on the same file.
 *
 * This rule is `error` in `recommended` and had `schema: []`, so a consumer
 * using better-sqlite3, knex, or any local helper named `exec` got a CRITICAL
 * false positive with no way to configure it away.
 *
 * The valid cases here FAIL on the pre-fix rule.
 */
ruleTester.run('no-shell-injection-requires-module-evidence', noShellInjection, {
  valid: [
    'const db = require("better-sqlite3")("app.db"); db.exec(`CREATE TABLE ${tenant}_events (id INT)`);',
    'import { exec } from "./lib/logger-shell"; exec(`audit: user ${userId}`);',
  ],
  invalid: [
    {
      code: 'db.exec(`CREATE TABLE ${tenant}_events (id INT)`);',
      options: [{ requireModuleEvidence: false }],
      errors: [{ messageId: 'shellInjection' }],
    },
    {
      code: 'const cp = require("child_process"); cp.exec("git clone " + req.query.url);',
      errors: [{ messageId: 'shellInjection' }],
    },
    {
      code: 'const { exec } = require("child_process"); exec("git clone " + req.query.url);',
      errors: [{ messageId: 'shellInjection' }],
    },
    {
      code: 'import { exec } from "node:child_process"; exec(`git clone ${req.query.url}`);',
      errors: [{ messageId: 'shellInjection' }],
    },
  ],
});
