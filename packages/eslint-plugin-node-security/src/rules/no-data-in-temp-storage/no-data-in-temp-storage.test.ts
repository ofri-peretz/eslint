/**
 * @fileoverview Tests for no-data-in-temp-storage
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noDataInTempStorage } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-data-in-temp-storage', noDataInTempStorage, {
  valid: [
    // Secure storage locations
    { code: "fs.writeFileSync('/app/data/file.txt', data)" },
    { code: "fs.writeFile('/secure/path/file.json', data, callback)" },
    // Non-path literals
    { code: "console.log('temp data')" },
    { code: "const x = 1" },

    // ── CWE-377 predictable temp path — the accepted safe shapes ──
    // corpus/CWE-377/safe/mkdtemp-write.js: mkdtempSync gets a fresh 0700
    // directory with a random suffix, so the join it wraps is not a name
    // anything is written to.
    {
      code: "const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-export-'));",
    },
    // A randomised segment is the mitigation — the path is no longer guessable.
    {
      code: "const file = path.join(os.tmpdir(), crypto.randomUUID() + '.tmp');",
    },
    { code: 'const file = path.join(os.tmpdir(), `run-${Date.now()}.tmp`);' },
    // Not the shared temp directory at all.
    { code: "const file = path.join(baseDir, 'report-cache.tmp');" },
    // Not path.join / not os.tmpdir().
    { code: "const file = path.basename(os.tmpdir(), 'x');" },
    { code: "const file = path.join(os.homedir(), 'report-cache.tmp');" },
    { code: "const file = path.join(os.tmpdir());" },
    { code: "const file = other.join(os.tmpdir(), 'report-cache.tmp');" },
    { code: "const file = path[method](os.tmpdir(), 'report-cache.tmp');" },
    // A private method — a non-computed member whose property is not an
    // Identifier.
    {
      code: "class C { #join(a, b) { return a + b; } m() { const f = this.#join(os.tmpdir(), 'report-cache.tmp'); return f; } }",
    },
    { code: "const file = path.join(fs.tmpdir(), 'report-cache.tmp');" },
    { code: "const file = path.join(os[fn](), 'report-cache.tmp');" },
    { code: "const file = path.join(os.tmpdir(), 42);" },
    { code: "const file = join(os.tmpdir(), 'report-cache.tmp');" },
    // Built but never bound to a name and never written through — no site.
    { code: "log(path.join(os.tmpdir(), 'report-cache.tmp'));" },
    // Returned rather than bound or written: the parent is not a call at all.
    {
      code: "function f() { return path.join(os.tmpdir(), 'report-cache.tmp'); }",
    },
    // fs write, but the join is not the path argument.
    {
      code: "fs.writeFileSync(target, path.join(os.tmpdir(), 'report-cache.tmp'));",
    },
    // A non-fs receiver with the same method name.
    {
      code: "cache.writeFileSync(path.join(os.tmpdir(), 'report-cache.tmp'), buf);",
    },
    // fs, but not a write entry point.
    {
      code: "fs.readFileSync(path.join(os.tmpdir(), 'report-cache.tmp'));",
    },
  ],

  invalid: [
    // Temp path writes
    { code: "fs.writeFileSync('/tmp/secrets.json', data)", errors: [{ messageId: 'violationDetected' }] },
    { code: "fs.writeFile('/var/tmp/auth.txt', data, cb)", errors: [{ messageId: 'violationDetected' }] },
    // Temp path variables
    { code: "const path = '/tmp/sensitive.txt'", errors: [{ messageId: 'violationDetected' }] },
    { code: "let file = '/var/tmp/data.json'", errors: [{ messageId: 'violationDetected' }] },

    // ── CWE-377 predictable temp path ──
    // Pins corpus/CWE-377/vulnerable/tmpdir-static-name.js, which reported
    // nothing while its '/tmp/app-export.json' sibling
    // (corpus/CWE-377/vulnerable/static-tmp-write.js) reported: the literal
    // scan never sees the os.tmpdir() spelling.
    {
      code: "const file = path.join(os.tmpdir(), 'report-cache.tmp');",
      errors: [{ messageId: 'predictableTempPath' }],
    },
    // Handed straight to the write, without a binding.
    {
      code: "fs.writeFileSync(path.join(os.tmpdir(), 'report-cache.tmp'), buffer);",
      errors: [{ messageId: 'predictableTempPath' }],
    },
    // Reassignment, and the multi-segment / path.resolve spellings.
    {
      code: "let file; file = path.join(os.tmpdir(), 'cache', 'report.tmp');",
      errors: [{ messageId: 'predictableTempPath' }],
    },
    {
      code: "const file = path.resolve(os.tmpdir(), 'report-cache.tmp');",
      errors: [{ messageId: 'predictableTempPath' }],
    },
  ],
});
