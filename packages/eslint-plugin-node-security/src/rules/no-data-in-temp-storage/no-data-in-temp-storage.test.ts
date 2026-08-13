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

    // ── FP lock: `/temp` is not a substring test ──────────────────────────
    //
    // Corpus: Shopify/cli
    // `packages/app/src/cli/utilities/developer-platform-client/app-management-client.ts:155`
    //   const TEMPLATE_JSON_URL = 'https://cdn.shopify.com/static/cli/extensions/templates.json'
    //
    // Reported at HIGH as sensitive data in temp storage. `templates.json`
    // contains the characters `/temp`, and DEFAULT_TEMP_PATHS was matched with
    // `String.includes` against every string literal bound to a name, with no
    // write sink required. Both halves of that were wrong and both are fixed:
    // the match is now segment-anchored AND the name has to be written through.
    //
    // Each of these reports on the old predicate.
    { code: "const TEMPLATE_JSON_URL = 'https://cdn.shopify.com/static/cli/extensions/templates.json'" },
    { code: "const dir = '/templates/partials'" },
    { code: "const label = 'attempted'" },
    { code: "const tpl = 'temporary-holder'" },
    // Segment-anchored and genuinely a temp path — but nothing writes it, so
    // there is no data at rest to disclose.
    { code: "const p = '/tmp/sensitive.txt'" },
    { code: "let file = '/var/tmp/data.json'" },
    { code: "const p = '/tmp/x'; fs.readFileSync(p);" },
    // Written, but as the CONTENT rather than the path.
    { code: "const p = '/tmp/x'; fs.writeFileSync(target, p);" },
    // A temp path that is never bound to a name at all.
    { code: "log('/tmp/x')" },
    // Destructuring and member assignment produce no plain binding to follow.
    { code: "const { a = '/tmp/x' } = opts;" },
    { code: "obj.p = '/tmp/x'; fs.writeFileSync(obj.p, data);" },
    // A non-string literal reaching the same visitor.
    { code: 'const n = 42;' },
  ],

  invalid: [
    // Temp path writes
    { code: "fs.writeFileSync('/tmp/secrets.json', data)", errors: [{ messageId: 'violationDetected' }] },
    { code: "fs.writeFile('/var/tmp/auth.txt', data, cb)", errors: [{ messageId: 'violationDetected' }] },
    // Temp path bound to a name and then written through — this is
    // corpus/CWE-377/vulnerable/static-tmp-write.js, and it is what the write
    // sink above must not cost us.
    {
      code: "const file = '/tmp/sensitive.txt';\nfs.writeFileSync(file, JSON.stringify(records));",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "let file = '/var/tmp/data.json';\nfs.writeFile(file, data, cb);",
      errors: [{ messageId: 'violationDetected' }],
    },
    // Reassignment reaches the same sink through the other binding shape.
    {
      code: "let file; file = '/tmp/data';\nfs.writeFileSync(file, data);",
      errors: [{ messageId: 'violationDetected' }],
    },

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
