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
    {
      name: "a path inside the application's own data directory",
      code: "fs.writeFileSync('/app/data/file.txt', data)",
    },
    {
      name: 'a write to a secure non-temp path is allowed',
      code: "fs.writeFile('/secure/path/file.json', data, callback)",
    },
    // Non-path literals
    { code: "console.log('temp data')" },
    { code: 'const x = 1' },

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
    { code: 'const file = path.join(os.tmpdir());' },
    { code: "const file = other.join(os.tmpdir(), 'report-cache.tmp');" },
    { code: "const file = path[method](os.tmpdir(), 'report-cache.tmp');" },
    // A private method — a non-computed member whose property is not an
    // Identifier.
    {
      code: "class C { #join(a, b) { return a + b; } m() { const f = this.#join(os.tmpdir(), 'report-cache.tmp'); return f; } }",
    },
    { code: "const file = path.join(fs.tmpdir(), 'report-cache.tmp');" },
    { code: "const file = path.join(os[fn](), 'report-cache.tmp');" },
    { code: 'const file = path.join(os.tmpdir(), 42);' },
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
    {
      code: "const TEMPLATE_JSON_URL = 'https://cdn.shopify.com/static/cli/extensions/templates.json'",
    },
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

    // ── FP locks from benchmarks/rule-corpus/node-security__no-data-in-temp-storage ──
    //
    // safe/07-mkdtemp-prefix-const.js. mkdtemp takes a PREFIX: Node appends six
    // random characters and creates the directory 0700, so the resolved path is
    // not predictable. Hoisting the prefix to a `const` is ordinary style and
    // the rule reported it as a predictable temp path — i.e. it reported its own
    // prescribed remediation. Reports on the unfixed rule.
    {
      code: "const fsp = require('node:fs/promises');\nconst PREFIX = path.join(os.tmpdir(), 'ingest-');\nconst dir = await fsp.mkdtemp(PREFIX);",
    },
    {
      code: "const fs = require('fs');\nconst PREFIX = path.join(os.tmpdir(), 'ingest-');\nconst dir = fs.mkdtempSync(PREFIX);",
    },
    // safe/09-let-reassigned-to-project-path.js. The temp literal never reaches
    // disk: every write to the binding before the sink replaces it. Reading the
    // declarator instead of the last write reported a fix that was already
    // applied. Reports on the unfixed rule.
    {
      code: "let dest = '/tmp/placeholder.json';\ndest = path.join(root, 'dist', 'manifest.json');\nfs.writeFileSync(dest, body);",
    },
    // safe/13-project-temp-not-shared.js — path.join literal segments are
    // matched by segment, so `templates` is not `temp`.
    {
      code: "fs.writeFileSync(path.join(outDir, 'templates', 'build.log'), lines);",
    },
    // safe/10-temperature-path.js
    { code: "fs.writeFileSync('./data/temperature-log.json', json);" },
    // The receiver resolves to a module that is not fs.
    {
      code: "const zip = require('archiver');\nzip.writeFile('/tmp/x.zip', buf);",
    },
    // fs, but a path deeper than fs.promises — some other API that happens to
    // share a method name.
    {
      code: "const fs = require('fs');\nfs.constants.writeFile('/tmp/x', d);",
    },
    // A computed member whose key is not a string literal is not knowable.
    {
      code: "const fs = require('fs');\nfs[method]('/tmp/x', d);",
    },
    // A randomised segment inside the template is the mitigation, exactly as it
    // is inside path.join — the resolved path differs on every run.
    { code: 'const p = `${os.tmpdir()}/${randomUUID()}.bin`;' },
    { code: 'const p = `${os.tmpdir()}/${42}.bin`;' },
    { code: 'const p = `/no/tmpdir/${here}`;' },
    // A non-string path argument contributes no static run.
    { code: 'fs.writeFileSync(42, data);' },
    // A call in the path position that is not path.join/path.resolve, and the
    // computed spelling of one — neither yields knowable segments.
    { code: 'fs.writeFileSync(makePath(), data);' },
    { code: "fs.writeFileSync(path[joiner]('/tmp', 'x'), data);" },
    { code: "fs.writeFileSync(path.basename('/tmp', 'x'), data);" },
    // A binding with no write before the use — a parameter decides its value at
    // the call site, which is unresolved, not safe.
    { code: 'function save(target, data) { fs.writeFileSync(target, data); }' },
    // The module itself called as a function: a resolved binding whose export
    // path is empty names no entry point.
    { code: "const fs = require('fs');\nfs('/tmp/x', data);" },
    // The doc's second condition: a constant temp path bound to a name that
    // nothing writes through stores nothing.
    {
      name: 'a constant temp path that nothing writes through is not a finding',
      code: "const file = path.join(os.tmpdir(), 'report-cache.tmp');\nconsole.log(file);",
    },
    // An undeclared assignment target cannot be followed to a write.
    {
      name: 'an undeclared assignment target cannot be followed to a write',
      code: "tmpPrefix = path.join(os.tmpdir(), 'ingest-');",
    },
    // Concatenation with a non-constant operand is not a constant path.
    { code: 'const p = os.tmpdir() + suffix;' },
    { code: "const p = base + '/state.json';" },

    // ── Each shape below is WRITTEN through, so the write condition cannot be
    // what keeps it quiet: the predictable-path test itself has to reject it.
    {
      name: 'a project path whose only shared segment with /var/tmp is /var is not a temp path',
      code: "fs.writeFileSync('/var/log/app/audit.log', line);",
    },
    {
      name: 'a written path built from a receiver other than os is not the shared temp directory',
      code: "fs.writeFileSync(path.join(sandbox.tmpdir(), 'report.tmp'), data);",
    },
    {
      name: 'a written path under os.homedir() is not the shared temp directory',
      code: "fs.writeFileSync(path.join(os.homedir(), '.app-cache'), data);",
    },
    {
      name: 'path.relative from tmpdir names a path relative to it, not a file inside it',
      code: "fs.writeFileSync(path.relative(os.tmpdir(), 'report.tmp'), data);",
    },
    {
      name: 'url.resolve against tmpdir replaces its last segment rather than joining under it',
      code: "fs.writeFileSync(url.resolve(os.tmpdir(), 'report.tmp'), data);",
    },
    {
      name: 'a single-argument path.resolve of a project file is not a tmpdir join',
      code: 'fs.writeFileSync(path.resolve(outFile), data);',
    },
    {
      name: 'a tmpdir join with one non-literal segment is unpredictable even beside a literal one',
      code: "fs.writeFileSync(path.join(os.tmpdir(), 'cache', jobId), data);",
    },
    {
      name: 'a written template with no interpolation and no tmpdir is not a predictable temp path',
      code: 'fs.writeFileSync(`./out/state.json`, data);',
    },
    {
      name: 'a written template interpolating a project directory is not a predictable temp path',
      code: 'fs.writeFileSync(`${outDir}/state.json`, data);',
    },
    {
      name: 'a written tmpdir template with a random segment is unpredictable',
      code: 'fs.writeFileSync(`${os.tmpdir()}/${randomUUID()}.bin`, data);',
    },
    {
      name: 'a written concatenation onto a project directory is not a predictable temp path',
      code: "fs.writeFileSync(outDir + '/state.json', data);",
    },
    {
      name: 'a written tmpdir concatenation with a non-constant suffix is unpredictable',
      code: 'fs.writeFileSync(os.tmpdir() + suffix, data);',
    },
    {
      name: 'a written concatenation of constants with no tmpdir is not a predictable temp path',
      code: "fs.writeFileSync('./out' + '/state.json', data);",
    },
    {
      name: 'a unary plus is not a concatenation',
      code: 'const port = +process.env.PORT;',
    },
    {
      name: 'a tmpdir join handed to a write as its CONTENT is not the path written to',
      code: "const p = path.join(os.tmpdir(), 'report.tmp');\nfs.writeFileSync(target, p);",
    },
    {
      name: 'a tmpdir prefix randomised by mkdtemp before the binding is reused for the write is the mitigation',
      code: "const fs = require('fs');\nlet target = path.join(os.tmpdir(), 'export-');\ntarget = fs.mkdtempSync(target);\ntarget = path.join(target, 'out.json');\nfs.writeFileSync(target, data);",
    },
    {
      name: 'a temp path assigned only after the write is not what was written',
      code: "let out = './out/state.json';\nfs.writeFileSync(out, data);\nout = '/tmp/state.json';",
    },
    {
      name: 'a tmpdir join bound to a member is not followed to its write (documented false negative)',
      code: "job.out = path.join(os.tmpdir(), 'report.tmp');\nfs.writeFileSync(job.out, data);",
    },
    {
      name: 'a file matched by ignoreFiles is not checked even where it writes to /tmp',
      code: "fs.writeFileSync('/tmp/seed.json', data);",
      options: [{ ignoreFiles: ['scripts/'] }],
      filename: '/proj/scripts/seed.ts',
    },
  ],

  invalid: [
    // Temp path writes
    {
      name: 'secrets written under /tmp, which is world-readable on most hosts',
      code: "fs.writeFileSync('/tmp/secrets.json', data)",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "fs.writeFile('/var/tmp/auth.txt', data, cb)",
      errors: [{ messageId: 'violationDetected' }],
    },
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
      name: 'a constant tmpdir join written through its const reports',
      code: "const file = path.join(os.tmpdir(), 'report-cache.tmp');\nfs.writeFileSync(file, data);",
      errors: [{ messageId: 'predictableTempPath' }],
    },
    // Handed straight to the write, without a binding.
    {
      code: "fs.writeFileSync(path.join(os.tmpdir(), 'report-cache.tmp'), buffer);",
      errors: [{ messageId: 'predictableTempPath' }],
    },
    // Reassignment, and the multi-segment / path.resolve spellings.
    {
      name: 'a reassigned tmpdir join written through reports',
      code: "let file; file = path.join(os.tmpdir(), 'cache', 'report.tmp');\nfs.writeFileSync(file, data);",
      errors: [{ messageId: 'predictableTempPath' }],
    },
    {
      name: 'a constant tmpdir resolve written through reports',
      code: "const file = path.resolve(os.tmpdir(), 'report-cache.tmp');\nfs.writeFileSync(file, data);",
      errors: [{ messageId: 'predictableTempPath' }],
    },

    // ── FN locks from benchmarks/rule-corpus/node-security__no-data-in-temp-storage ──
    //
    // The sink used to be `callee.object.name === 'fs'` with the method list
    // `['writeFileSync', 'writeFile']`. Every case below writes to the same
    // world-readable directory and every one of them was silent. Each is quiet
    // on the unfixed rule.
    //
    // vulnerable/02 — destructured CJS import.
    {
      code: "const { writeFileSync } = require('node:fs');\nwriteFileSync('/tmp/oauth-refresh.json', body);",
      errors: [{ messageId: 'violationDetected' }],
    },
    // vulnerable/07 — aliased named import.
    {
      code: "import { writeFileSync as write } from 'node:fs';\nwrite('/tmp/customer-export.json', body);",
      errors: [{ messageId: 'violationDetected' }],
    },
    // vulnerable/03 — fs/promises, and a template whose static run is the path.
    {
      code: "import { writeFile } from 'node:fs/promises';\nawait writeFile(`/var/tmp/upload-${field}.part`, buf);",
      errors: [{ messageId: 'violationDetected' }],
    },
    // vulnerable/05 — the fs.promises namespace.
    {
      code: "import fs from 'node:fs';\nawait fs.promises.writeFile('/tmp/api-token-cache.json', body);",
      errors: [{ messageId: 'violationDetected' }],
    },
    // vulnerable/04 — append is the same data at rest as a write.
    {
      code: "import * as fs from 'node:fs';\nfs.appendFileSync('/tmp/auth-audit.log', line);",
      errors: [{ messageId: 'violationDetected' }],
    },
    // vulnerable/08 — so is a stream.
    {
      code: "const fs = require('node:fs');\nconst out = fs.createWriteStream('/tmp/tenant-backup.zip');",
      errors: [{ messageId: 'violationDetected' }],
    },
    // vulnerable/15 — fs-extra is a drop-in fs, and outputFile is its write.
    {
      code: "const fse = require('fs-extra');\nfse.outputFileSync('/tmp/tenant-export.json', body);",
      errors: [{ messageId: 'violationDetected' }],
    },
    // vulnerable/11 — a computed member with a string-literal key names the
    // export as precisely as dot notation.
    {
      code: "const fs = require('node:fs');\nfs['writeFileSync']('/tmp/diagnostics.json', body);",
      errors: [{ messageId: 'violationDetected' }],
    },
    // vulnerable/12 — the write function hoisted into a const; the receiver
    // never appears at the call site.
    {
      code: "const fs = require('fs');\nconst write = fs.writeFileSync;\nwrite('/tmp/license-key.txt', license);",
      errors: [{ messageId: 'violationDetected' }],
    },
    // vulnerable/13 — path.join with a literal temp root.
    {
      code: "const fs = require('node:fs');\nfs.writeFileSync(path.join('/tmp', 'saml-assertion.xml'), body);",
      errors: [{ messageId: 'violationDetected' }],
    },
    // vulnerable/06 — os.tmpdir() interpolated is the portable spelling of a
    // hard-coded /tmp path, and just as constant.
    {
      code: 'fs.writeFileSync(`${os.tmpdir()}/billing-report.csv`, csv);',
      errors: [{ messageId: 'predictableTempPath' }],
    },
    {
      name: 'a tmpdir template written through reports',
      code: 'const p = `${os.tmpdir()}/state.json`;\nfs.writeFileSync(p, data);',
      errors: [{ messageId: 'predictableTempPath' }],
    },
    {
      name: 'a tmpdir template of constants written through reports',
      code: 'const p = `${os.tmpdir()}/${"cache"}/state.json`;\nfs.writeFileSync(p, data);',
      errors: [{ messageId: 'predictableTempPath' }],
    },
    // vulnerable/14 — and so is concatenation.
    {
      name: 'a tmpdir concatenation written through reports',
      code: "const p = os.tmpdir() + '/agent-state.json';\nfs.writeFileSync(p, data);",
      errors: [{ messageId: 'predictableTempPath' }],
    },
    {
      name: 'a nested tmpdir concatenation written through reports',
      code: "const p = '/prefix' + (os.tmpdir() + '/agent-state.json');\nfs.writeFileSync(p, data);",
      errors: [{ messageId: 'predictableTempPath' }],
    },
    // The mkdtemp exemption needs the prefix in the first argument: a constant
    // temp path passed as mkdtemp's SECOND argument is an encoding option, not
    // the prefix it randomises, so a later write through it still reports.
    {
      name: "mkdtemp's second argument is not a randomised prefix",
      code: "const fs = require('fs');\nconst P = path.join(os.tmpdir(), 'ingest-');\nfs.mkdtempSync(base, P);\nfs.writeFileSync(P, data);",
      errors: [{ messageId: 'predictableTempPath' }],
    },
    {
      // @found mutation testing
      name: 'FN: a tmpdir template interpolating a numeric literal is as constant as a string one',
      code: 'fs.writeFileSync(`${os.tmpdir()}/worker-${8080}.lock`, pid);',
      errors: [{ messageId: 'predictableTempPath' }],
    },
    {
      name: 'a path.resolve with a literal /tmp segment written to reports',
      code: "fs.writeFileSync(path.resolve('/tmp', 'session.json'), token);",
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
