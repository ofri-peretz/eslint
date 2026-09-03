/**
 * @fileoverview Tests for no-arbitrary-file-access
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noArbitraryFileAccess } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-arbitrary-file-access', noArbitraryFileAccess, {
  valid: [
    // --- Unattributable paths belong to detect-non-literal-fs-filename ------
    // This rule's message is "File path from user input — path traversal
    // vulnerability". On a bare global with no visible binding there is no
    // user input to point at, so the message was simply untrue — and it
    // duplicated detect-non-literal-fs-filename on 25 corpus sites, telling
    // the reader twice about one line at two different severities.
    //
    // Nothing goes undetected: the generic rule still reports every one of
    // these at `warn`. The two rules partition instead of overlapping.
    'fs.readFileSync(filePath)',
    'fs.readFile(userFile, cb)',
    'fs.readdirSync(scanPath)',
    'fs.writeFileSync(destPath, content)',
    // A local bound to something visible that is NOT a request.
    {
      name: 'a local bound to something visible that is not a request',
      code: "const p = path.join(__dirname, 'data'); fs.readFileSync(p);",
    },
    {
      name: 'a local bound to an unresolvable call is not attributed',
      code: 'const p = getPath(); fs.readFileSync(p);',
    },
    // Mutually-recursive bindings terminate instead of blowing the stack.
    {
      name: 'mutually-recursive bindings terminate instead of blowing the stack',
      code: 'const a = b; const b = a; fs.readFileSync(a);',
    },
    // A destructured binding names no Identifier we can follow.
    {
      name: 'a destructured binding names no identifier we can follow',
      code: 'const { p } = opts; fs.readFileSync(p);',
    },
    // A declaration with no initializer resolves to nothing.
    {
      name: 'a declaration with no initialiser resolves to nothing',
      code: 'let p; fs.readFileSync(p);',
    },
    // An arrow whose params do not include the path still resolves upward.
    {
      name: 'an arrow whose params exclude the path still resolves upward',
      code: 'const run = (other) => { fs.readFileSync(missing); };',
    },

    // --- A parameter nobody in this file steers -----------------------------
    // Corpus: okta/okta-auth-js scripts/buildtools/maintain-banners.js:16,19.
    // An inline callback over a `globby.sync` enumeration of the repo's own
    // files. There is no callable name and no caller, so nothing can be shown
    // to steer `file` — yet both lines were reported as "file path from user
    // input" in a build script that never sees a request.
    `
      const files = globby.sync(path.join(__dirname, '../../lib/**/*.js'));
      files.forEach(file => {
        const contents = fs.readFileSync(file).toString();
        if (!contents.match(copyrightRegex)) {
          return fs.writeFileSync(file, bannerSource + '\\n\\n' + contents);
        }
      });
    `,
    // Corpus: Shopify/cli packages/eslint-plugin-cli/rules/no-inline-graphql.js:43.
    // A named helper IS resolvable — and its only caller passes the lint
    // context's own filename, which is not a request. Evidence of the caller,
    // and the evidence says safe.
    `
      function hashFileSync(filePath, algorithm = 'sha256') {
        const fileBuffer = fs.readFileSync(filePath);
        return crypto.createHash(algorithm).update(fileBuffer).digest('hex');
      }
      function check(context) {
        const filePath = context.filename || context.getFilename();
        return hashFileSync(filePath);
      }
    `,
    // A named helper with no call site at all in this file: provenance
    // unresolved, so detect-non-literal-fs-filename owns it, not this rule.
    {
      name: 'a named helper with no call site leaves provenance unresolved',
      code: 'function read(filePath) { fs.readFileSync(filePath); }',
    },
    // A caller that passes something visible and non-request keeps it valid.
    {
      name: 'a caller passing something visible and non-request keeps it valid',
      code: "function read(p) { fs.readFileSync(p); } read(path.join(__dirname, 'x'));",
    },
    // A caller that passes nothing at that position proves nothing.
    {
      name: 'a caller that passes nothing at that position proves nothing',
      code: 'function read(p) { fs.readFileSync(p); } read();',
    },
    // Spread arguments hide the position, so no attribution is possible.
    {
      name: 'spread arguments hide the position, so no attribution is possible',
      code: 'function read(p) { fs.readFileSync(p); } read(...args);',
    },
    // A name that matches no function in the file is not a call site for it.
    {
      name: 'a name matching no function in the file is not a call site for it',
      code: 'function read(p) { fs.readFileSync(p); } other(req.query.f);',
    },
    // A DYNAMIC callee names no function statically, so it attributes nothing.
    {
      name: 'a DYNAMIC callee names no function statically, so it attributes nothing',
      code: 'function read(p) { fs.readFileSync(p); } registry[name](req.query.f);',
    },
    // Neither does a callee that is not a name at all.
    {
      name: 'a callee that is not a name at all attributes nothing',
      code: 'function read(p) { fs.readFileSync(p); } (function () { return req; })(req.query.f);',
    },
    // Static file paths
    {
      name: 'a literal relative path',
      code: "fs.readFileSync('./config.json')",
    },
    {
      name: 'a literal absolute path in a write',
      code: "fs.writeFile('/app/data/log.txt', data, cb)",
    },
    {
      name: 'a literal absolute path in a directory read',
      code: "fs.readdir('/safe/path')",
    },
    {
      name: 'a literal absolute path in a stat',
      code: "fs.stat('/known/file.txt')",
    },
    // Non-fs code
    { name: 'code with no filesystem call at all', code: 'const x = 1' },
    {
      name: "a readFile that is not the fs module's",
      code: 'other.readFile(path)',
    },

    // ============================================
    // FALSE POSITIVE PREVENTION TESTS
    // ============================================

    // FP-1: path.basename() sanitization
    {
      code: `
        const safeName = path.basename(userFilename);
        fs.readFileSync(safeName);
      `,
    },

    // FP-2: path.basename() + path.join() with safe base
    {
      code: `
        const safeName = path.basename(userFilename);
        const safePath = path.join(SAFE_DIR, safeName);
        fs.readFileSync(safePath);
      `,
    },

    // FP-3: startsWith() validation guard with throw
    {
      code: `
        function readFile(userPath) {
          const filePath = path.join('/uploads', userPath);
          if (!filePath.startsWith('/uploads')) {
            throw new Error('Invalid path');
          }
          return fs.readFileSync(filePath);
        }
      `,
    },

    // FP-4: startsWith() validation guard with return
    {
      code: `
        function readFile(userPath) {
          const filePath = path.join(baseDir, userPath);
          if (!filePath.startsWith(baseDir)) {
            return null;
          }
          return fs.readFileSync(filePath);
        }
      `,
    },

    // FP-5: Variables with safe naming conventions
    { code: 'fs.readFileSync(safePath)' },
    { code: 'fs.readFileSync(sanitizedPath)' },
    { code: 'fs.readFileSync(validatedFilename)' },
    { code: 'fs.readFileSync(cleanPath)' },

    /*
     * FP-8: the naming convention over a CALL. `sanitizePath` is unknown to
     * this rule, so the only evidence about `cleanPath` is its name — and a
     * call is where laundering legitimately happens. Suppressing here is the
     * behaviour that keeps the noise floor usable; tightening the name check
     * without this exception reported it, which is a false positive on the
     * single most common shape of a real sanitizer.
     */
    {
      name: 'a safe-sounding name over a call is still trusted',
      code: `
        const cleanPath = sanitizePath(req.query.file);
        fs.readFileSync(cleanPath);
      `,
    },

    /*
     * FP-9: a parameter named safely has no initialiser to contradict it. The
     * caller may well have sanitized; nothing here says otherwise, and
     * refusing to trust a bare parameter would fire on most helper functions
     * in a codebase that uses the convention at all.
     */
    {
      name: 'a safe-sounding parameter has no initialiser to contradict it',
      code: `
        function read(sanitizedPath) {
          return fs.readFileSync(sanitizedPath);
        }
      `,
    },

    // FP-6: Combined pattern (real-world safe pattern from safe-patterns.js)
    {
      code: `
        const SAFE_DIR = path.resolve(__dirname, 'uploads');
        function safeReadFile(userFilename) {
          const safeName = path.basename(userFilename);
          const safePath = path.join(SAFE_DIR, safeName);
          if (!safePath.startsWith(SAFE_DIR)) {
            throw new Error('Invalid path');
          }
          return fs.readFileSync(safePath);
        }
      `,
    },
  ],

  invalid: [
    /*
     * A NAME MAY NOT SILENCE A FINDING.
     *
     * All four of these are the same CWE-22 traversal — `req.query.f` reaching
     * `fs.readFileSync` with nothing between them. Only the spelling of the
     * binding differs, and for three of them that spelling used to turn the
     * report off:
     *
     *     userPath      -> reported
     *     cleanPath     -> SILENT
     *     safePath      -> SILENT
     *     validatedPath -> SILENT
     *
     * A name that causes a report is a false positive somebody complains
     * about. A name that causes silence is a false negative nobody ever sees,
     * on a rule that ships enabled by default. These four run together on
     * purpose: they are one behaviour, and separating them lets the next
     * refactor fix three and leave one.
     *
     * See docs/intents/a-name-must-not-silence-a-finding/.
     */
    ...['userPath', 'cleanPath', 'safePath', 'validatedPath'].map(
      (binding) => ({
        name: `renaming to \`${binding}\` does not turn the finding off`,
        code: `
        function read(req) {
          const ${binding} = req.query.f;
          return fs.readFileSync(${binding});
        }
      `,
        errors: [{ messageId: 'violationDetected' }],
      }),
    ),

    {
      // FN: was `valid` as "a computed callee names no function statically".
      // It names `read` perfectly well, and the DOTTED spelling of the very
      // same shape — `registry.read(req.query.f)` — already reports. The test
      // excluded one notation of a shape the rule attributes in the other,
      // which is an inconsistency rather than a policy.
      // @found computed-key blind-spot probe
      name: 'FN: a call site reached by a string subscript',
      code: "function read(p) { fs.readFileSync(p); } registry['read'](req.query.f);",
      errors: 1,
    },
    // --- Attributable to a request: this rule's actual subject --------------
    // A function parameter reports when a call site in this file is shown to
    // feed it from a request. That is the genuine attack shape the parameter
    // arm exists for, and it must survive the narrowing above.
    {
      name: 'a request value reaching readFileSync through a helper',
      code: 'function read(filePath) { fs.readFileSync(filePath); } read(req.query.f);',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'function read(userFile, cb) { fs.readFile(userFile, cb); } read(req.params.name, cb);',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'function read(userDir) { fs.readdir(userDir); } read(body.dir);',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'function read(scanPath) { fs.readdirSync(scanPath); } read(query.dir);',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'function read(targetPath) { fs.stat(targetPath); } read(request.path);',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'function read(checkPath) { fs.statSync(checkPath); } read(params.p);',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'function write(outputPath, data, cb) { fs.writeFile(outputPath, data, cb); } write(req.body.dest, data, cb);',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'function write(destPath, content) { fs.writeFileSync(destPath, content); } write(req.query.dest, content);',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'function write(logPath, text, cb) { fs.appendFile(logPath, text, cb); } write(req.query.log, text, cb);',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'function write(filePath, data) { fs.appendFileSync(filePath, data); } write(req.body.f, data);',
      errors: [{ messageId: 'violationDetected' }],
    },
    // The callee is passed the request at a LATER line than the sink. Calls are
    // judged at Program:exit precisely so statement order is not the criterion.
    {
      code: "function read(p) { fs.readFileSync(p); }\napp.get('/f', (req, res) => read(req.query.name));",
      errors: [{ messageId: 'violationDetected' }],
    },
    // A local bound to a request, one hop.
    {
      code: 'const p = req.query.file; fs.readFileSync(p);',
      errors: [{ messageId: 'violationDetected' }],
    },
    // The path argument IS the request object. `readsUserInput` only ever saw
    // this through a member chain (`req.query.f`); the bare identifier is
    // routed through the variable path and went unreported.
    {
      code: 'fs.readFileSync(req);',
      errors: [{ messageId: 'violationDetected' }],
    },
    // The parameter arm, in each function form. Each is named a different way,
    // so each `functionName` resolution is exercised by a real attack shape.
    {
      code: 'const read = function (userPath) { fs.readFileSync(userPath); }; read(req.query.f);',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'const read = (userPath) => fs.readFileSync(userPath); read(req.query.f);',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'const handlers = { read(userPath) { fs.readFileSync(userPath); } }; handlers.read(req.query.f);',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'let read; read = (userPath) => { fs.readFileSync(userPath); }; read(req.query.f);',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'const read = function inner(userPath) { fs.readFileSync(userPath); }; inner(req.query.f);',
      errors: [{ messageId: 'violationDetected' }],
    },
    // --- The request reaches the path through an expression -----------------
    // benchmarks/corpus/CWE-022/vulnerable/path-join-user.js. The old member-
    // chain walk saw a CallExpression and stopped, so the ecosystem's own
    // labelled path-traversal fixture was a false negative.
    {
      code: "const userFile = req.query.file;\nconst content = fs.readFileSync(path.join('/uploads', userFile));",
      errors: [{ messageId: 'violationDetected' }],
    },
    // benchmarks/corpus/CWE-022/vulnerable/readfile-concat.js — same request,
    // behind a `+` instead of a call.
    {
      code: "const userFile = req.params.filename;\nconst content = fs.readFileSync('/uploads/' + userFile);",
      errors: [{ messageId: 'violationDetected' }],
    },
    // And behind a template literal, the third way this is normally written.
    {
      code: 'const userFile = req.body.name;\nfs.readFileSync(`/uploads/${userFile}`);',
      errors: [{ messageId: 'violationDetected' }],
    },
    // Deeper than one property — the old check read only the immediate object
    // and missed this.
    {
      code: 'fs.readFile(req.body.upload.path, cb)',
      errors: [{ messageId: 'violationDetected' }],
    },
    // User input from req object
    {
      code: 'fs.readFile(req.file, cb)',
      errors: [{ messageId: 'violationDetected' }],
    },
    // User input from request object
    {
      code: 'fs.readFile(request.path, cb)',
      errors: [{ messageId: 'violationDetected' }],
    },
    // User input from params object
    {
      code: 'fs.readFileSync(params.filename)',
      errors: [{ messageId: 'violationDetected' }],
    },
    // User input from query object
    {
      code: 'fs.readFile(query.file, cb)',
      errors: [{ messageId: 'violationDetected' }],
    },
    // User input from body object
    {
      code: 'fs.writeFile(body.path, data, cb)',
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
