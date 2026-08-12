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
    "fs.readFileSync(filePath)",
    "fs.readFile(userFile, cb)",
    "fs.readdirSync(scanPath)",
    "fs.writeFileSync(destPath, content)",
    // A local bound to something visible that is NOT a request.
    "const p = path.join(__dirname, 'data'); fs.readFileSync(p);",
    "const p = getPath(); fs.readFileSync(p);",
    // A destructured binding names no Identifier we can follow.
    "const { p } = opts; fs.readFileSync(p);",
    // A declaration with no initializer resolves to nothing.
    "let p; fs.readFileSync(p);",
    // An arrow whose params do not include the path still resolves upward.
    "const run = (other) => { fs.readFileSync(missing); };",
    // Static file paths
    { code: "fs.readFileSync('./config.json')" },
    { code: "fs.writeFile('/app/data/log.txt', data, cb)" },
    { code: "fs.readdir('/safe/path')" },
    { code: "fs.stat('/known/file.txt')" },
    // Non-fs code
    { code: "const x = 1" },
    { code: "other.readFile(path)" },
    
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
    { code: "fs.readFileSync(safePath)" },
    { code: "fs.readFileSync(sanitizedPath)" },
    { code: "fs.readFileSync(validatedFilename)" },
    { code: "fs.readFileSync(cleanPath)" },
    
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
    // --- Attributable to a request: this rule's actual subject --------------
    // A function PARAMETER is untrusted by definition — the callee cannot see
    // what any caller passes — so every fs method reports on one.
    {
      code: "function read(filePath) { fs.readFileSync(filePath); }",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "function read(userFile, cb) { fs.readFile(userFile, cb); }",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "function read(userDir) { fs.readdir(userDir); }",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "function read(scanPath) { fs.readdirSync(scanPath); }",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "function read(targetPath) { fs.stat(targetPath); }",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "function read(checkPath) { fs.statSync(checkPath); }",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "function write(outputPath, data, cb) { fs.writeFile(outputPath, data, cb); }",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "function write(destPath, content) { fs.writeFileSync(destPath, content); }",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "function write(logPath, text, cb) { fs.appendFile(logPath, text, cb); }",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "function write(filePath, data) { fs.appendFileSync(filePath, data); }",
      errors: [{ messageId: 'violationDetected' }],
    },
    // A local bound to a request, one hop.
    {
      code: "const p = req.query.file; fs.readFileSync(p);",
      errors: [{ messageId: 'violationDetected' }],
    },
    // The parameter arm, in each function form.
    {
      code: "const read = function (userPath) { fs.readFileSync(userPath); };",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "const read = (userPath) => fs.readFileSync(userPath);",
      errors: [{ messageId: 'violationDetected' }],
    },
    // Deeper than one property — the old check read only the immediate object
    // and missed this.
    {
      code: "fs.readFile(req.body.upload.path, cb)",
      errors: [{ messageId: 'violationDetected' }],
    },
    // User input from req object
    { code: "fs.readFile(req.file, cb)", errors: [{ messageId: 'violationDetected' }] },
    // User input from request object
    { code: "fs.readFile(request.path, cb)", errors: [{ messageId: 'violationDetected' }] },
    // User input from params object
    { code: "fs.readFileSync(params.filename)", errors: [{ messageId: 'violationDetected' }] },
    // User input from query object
    { code: "fs.readFile(query.file, cb)", errors: [{ messageId: 'violationDetected' }] },
    // User input from body object
    { code: "fs.writeFile(body.path, data, cb)", errors: [{ messageId: 'violationDetected' }] },
  ],
});
