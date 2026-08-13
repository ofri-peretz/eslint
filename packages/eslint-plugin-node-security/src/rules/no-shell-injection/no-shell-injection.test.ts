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
        "const dir = '/srv'; execSync(`ls ${dir}`);",
        "const dir = cond ? '/a' : '/b'; execSync(`ls ${dir}`);",
        "const dir = '/a' + '/b'; execSync(`ls ${dir}`);",
        "const dir = `/a`; execSync(`ls ${dir}`);",
        "const n = 3; execSync(`head -n ${n} f`);",
        "const cfg = {dir: '/srv'}; execSync(`ls ${cfg.dir}`);",
        "const cfg = {dir: '/srv'}; const c = cfg; execSync(`ls ${c.dir}`);",
        "const rows = [{d: '/a'}, {d: '/b'}]; for (const row of rows) { execSync(`ls ${row.d}`); }",
        "const rows = [{d: '/a'}]; const alias = rows; for (const row of alias) { execSync(`ls ${row.d}`); }",
        "for (const row of [{d: '/a'}]) { execSync(`ls ${row.d}`); }",
      ],
      invalid: [
        // A `let` can be reassigned between the declaration and the use, so its
        // initializer proves nothing.
        {
          code: "let dir = '/srv'; execSync(`ls ${dir}`);",
          errors: [{ messageId: 'shellInjection' }],
        },
        // One unresolved arm poisons the ternary.
        {
          code: "const dir = cond ? '/a' : userDir; execSync(`ls ${dir}`);",
          errors: [{ messageId: 'shellInjection' }],
        },
        // Corpus: Shopify/cli `packages/plugin-cloudflare/src/install-cloudflared.ts:135`
        // — `filename` comes off a parameter through `basename()`. Unresolved
        // is not safe, and this one must keep reporting.
        {
          code: 'function installMacos(binTarget) { const filename = basename(`${binTarget}.tgz`); execSync(`tar -xzf ${filename}`); }',
          errors: [{ messageId: 'shellInjection' }],
        },
        // A non-`+` binary operator is not string assembly.
        {
          code: "const n = 1 - 0; execSync(`head -n ${n} f`);",
          errors: [{ messageId: 'shellInjection' }],
        },
        // Property shapes the fold refuses: a spread, a computed key, and a
        // missing key all mean this object does not decide the value.
        {
          code: "const cfg = {...base, dir: '/srv'}; execSync(`ls ${cfg.dir}`);",
          errors: [{ messageId: 'shellInjection' }],
        },
        {
          code: "const cfg = {[k]: '/srv', dir: '/srv'}; execSync(`ls ${cfg.other}`);",
          errors: [{ messageId: 'shellInjection' }],
        },
        {
          code: "const cfg = {dir: '/srv'}; execSync(`ls ${cfg.missing}`);",
          errors: [{ messageId: 'shellInjection' }],
        },
        {
          code: "const cfg = {dir: '/srv'}; execSync(`ls ${cfg[k]}`);",
          errors: [{ messageId: 'shellInjection' }],
        },
        {
          code: "const cfg = {dir: '/srv'}; execSync(`ls ${cfg.#p}`);",
          errors: [{ messageId: 'shellInjection' }],
        },
        // Loop shapes the fold refuses.
        {
          code: 'for (const row of rows) { execSync(`ls ${row.d}`); }',
          errors: [{ messageId: 'shellInjection' }],
        },
        {
          code: "const rows = [{d: '/a'}, other]; for (const row of rows) { execSync(`ls ${row.d}`); }",
          errors: [{ messageId: 'shellInjection' }],
        },
        {
          code: "const rows = ['/a', , '/b']; for (const row of rows) { execSync(`ls ${row.d}`); }",
          errors: [{ messageId: 'shellInjection' }],
        },
        {
          code: "let rows = [{d: '/a'}]; for (const row of rows) { execSync(`ls ${row.d}`); }",
          errors: [{ messageId: 'shellInjection' }],
        },
        {
          code: "const rows = notAnArray; for (const row of rows) { execSync(`ls ${row.d}`); }",
          errors: [{ messageId: 'shellInjection' }],
        },
        {
          code: 'for (const row in rows) { execSync(`ls ${row.d}`); }',
          errors: [{ messageId: 'shellInjection' }],
        },
        // A `let` loop binding can be reassigned inside the body.
        {
          code: "const rows = [{d: '/a'}]; for (let row of rows) { execSync(`ls ${row.d}`); }",
          errors: [{ messageId: 'shellInjection' }],
        },
        // The iterable is neither an array literal nor a name bound to one.
        {
          code: 'for (const row of getRows()) { execSync(`ls ${row.d}`); }',
          errors: [{ messageId: 'shellInjection' }],
        },
        // A destructured binding has no plain identifier to follow.
        {
          code: "const {dir} = cfg; execSync(`ls ${dir}`);",
          errors: [{ messageId: 'shellInjection' }],
        },
        // A parameter is decided by the caller.
        {
          code: 'function run(dir) { execSync(`ls ${dir}`); }',
          errors: [{ messageId: 'shellInjection' }],
        },
        // An unresolvable name.
        {
          code: 'execSync(`ls ${nowhere}`);',
          errors: [{ messageId: 'shellInjection' }],
        },
        // Mutually-recursive `const`s terminate at the depth limit rather than
        // blowing the stack — once through the value fold, once through the
        // object resolver, once through the array resolver.
        {
          code: 'const chain = a; const a = chain; execSync(`ls ${chain}`);',
          errors: [{ messageId: 'shellInjection' }],
        },
        {
          code: 'const chain = a; const a = chain; execSync(`ls ${chain.d}`);',
          errors: [{ messageId: 'shellInjection' }],
        },
        {
          code: 'const chain = a; const a = chain; for (const row of chain) { execSync(`ls ${row.d}`); }',
          errors: [{ messageId: 'shellInjection' }],
        },
        // A RegExp literal is not a constant string.
        {
          code: 'const r = /x/; execSync(`ls ${r}`);',
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
