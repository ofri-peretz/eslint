/**
 * Comprehensive tests for no-unlimited-resource-allocation rule
 * Security: CWE-770 (Allocation of Resources Without Limits or Throttling)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { expect } from 'vitest';
import { noUnlimitedResourceAllocation } from './index';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+)
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-unlimited-resource-allocation', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - safe resource allocation', noUnlimitedResourceAllocation, {
      valid: [
    // Each reaches a `propertyName(...) ?? ''` sentinel with a key that cannot
    // be resolved, and each must fail CLOSED: an unnameable property is not a
    // request surface, not a size, and not an fs write.
    {
      name: 'a dynamic key is not a request surface',
      code: `function f(req, k) { return Buffer.alloc(req[k]); }`,
    },
    {
      name: 'a dynamic key is not a size property',
      code: `function f(body, k) { return Buffer.alloc(body[k]); }`,
    },
    {
      // `couldBeASize` is only reached from the `new Buffer(x)` branch, and
      // this is the member arm of its switch: a key that cannot be resolved
      // names no size property, so the allocation is not sized by user input.
      name: 'a dynamic key is not a size property',
      code: 'function f(req, k) { return new Buffer(req.body[k]); }',
    },
    {
      name: 'a dynamic fs method is not a known write',
      code: `function f(fs, m, data) { return fs[m]('out.bin', data); }`,
    },
        // Safe buffer allocation with limits
        {
          name: 'a fixed size',
          code: 'const buf = Buffer.alloc(1024);',
        },
        {
          code: 'const limitedBuf = Buffer.alloc(Math.min(userSize, 1024 * 1024));',
        },
        // Safe array allocation
        {
          code: 'const arr = new Array(10);',
        },
        // Validated file operations
        {
          code: 'if (stats.size < MAX_FILE_SIZE) { fs.readFile(path, callback); }',
        },
        // Resource allocation outside loops
        {
          code: `
            const buffer = Buffer.alloc(1024);
            for (let i = 0; i < 10; i++) {
              // Use buffer safely
            }
          `,
        },
        // Static path construction - should NOT be flagged as unlimited resource
        {
          code: `import path from 'path'; fs.readFileSync(path.join(__dirname, 'data', 'users.json'));`,
        },
        // Same static path construction, but using `path.resolve` instead of
        // `path.join` - exercises the `pathArg.callee.property.name === 'resolve'`
        // side of that binary-expr (only `'join'` was previously exercised).
        {
          code: `import path from 'path'; fs.readFileSync(path.resolve(__dirname, 'data', 'users.json'));`,
        },
        // Buffer.alloc with a spread element as its (only) argument -
        // exercises the true side of `sizeArg.type === 'SpreadElement'` in
        // the size-estimation ternary (the estimate short-circuits to null
        // rather than attempting to statically analyze a spread).
        {
          code: `const buf = Buffer.alloc(...sizeArgs);`,
        },
        // `new Buffer(...)` with a spread element argument - exercises the
        // same true side of `sizeArg.type === 'SpreadElement'`, but in the
        // NewExpression handler's size-estimation ternary.
        {
          code: `const buf = new Buffer(...sizeArgs);`,
        },
        // A CallExpression whose callee is itself a NewExpression, but not
        // `new Buffer` - exercises the false branches of `isNewBuffer`'s
        // `callee.callee.type === 'Identifier' && callee.callee.name === 'Buffer'`
        // checks (the callee is a `new Foo()` result, not `new Buffer`).
        {
          code: `(new Foo())(req.query.size);`,
        },
        // Same shape, but the outer callee's inner callee is not even an
        // Identifier (it's a MemberExpression) - exercises the
        // `callee.callee.type === 'Identifier'` false branch directly.
        {
          code: `(new obj.Foo())(req.query.size);`,
        },
        // `Buffer.alloc()` called with zero arguments - exercises the false
        // side of `args.length > 0` in the CallExpression Buffer handler.
        {
          code: `const buf = Buffer.alloc();`,
        },
        // `fs.readFile()` called with zero arguments - exercises the false
        // side of `args.length > 0` in the fs-operations handler.
        {
          code: `fs.readFile();`,
        },
        // `path.join()` (zero args) inside an fs call - exercises the false
        // side of `pathArgs.length > 0` in the static-path-construction
        // safety check (falls through to the normal untrusted-input check,
        // but `path.join()` itself isn't user input so nothing is reported).
        {
          code: `fs.readFile(path.join(), callback);`,
        },
        // `Array(x, y)` called with two arguments (not exactly one) -
        // exercises the false side of `args.length === 1` in the
        // CallExpression Array-constructor handler.
        {
          code: `const arr = Array(10, 20);`,
        },
        // `Array(localVar)` where `localVar` is not user input - exercises
        // the false side of `isUserInput(sizeArg)` in the same handler.
        {
          code: `const arr = Array(localVar);`,
        },
        // A `.set(...)`-named call whose source text happens to mention
        // `Buffer.alloc` but with fewer than 2 arguments - exercises the
        // false side of `args.length >= 2` in the cache-growth detector
        // (the callee text "resetCache" contains the substring "set").
        {
          code: `resetCache(Buffer.alloc(10));`,
        },
        // A `.set(...)`-named call with 2+ arguments whose full source text
        // mentions `Buffer.alloc` (via the first argument) but whose value
        // argument (second) does not mention "Buffer.alloc"/"length" -
        // exercises the false side of
        // `valueText.includes('Buffer.alloc') && valueText.includes('length')`
        // in the cache-growth detector.
        {
          code: `resetCache(Buffer.alloc(10), plainValue);`,
        },
        // `arr.map()` called with zero arguments - exercises the false side
        // of `args.length > 0` in the recursive-data-structure detector.
        {
          code: `arr.map();`,
        },
        // `new Buffer()` called with zero arguments - exercises the false
        // side of `args.length > 0` in the NewExpression Buffer handler.
        {
          code: `const buf2 = new Buffer();`,
        },
        // `new Array(a, b)` (two arguments, not exactly one) - exercises the
        // false side of `args.length === 1` in the NewExpression
        // Array-constructor handler.
        {
          code: `const arr2 = new Array(10, 20);`,
        },
        // `new Date(...)` inside a loop - callee text matches none of
        // Buffer/Array/Map/Set, exercising the false side of that
        // composite OR-chain in the NewExpression loop-allocation check.
        {
          code: `
            for (let i = 0; i < 10; i++) {
              const d = new Date(dynamicValue);
            }
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Unlimited Buffer Allocation', () => {
    ruleTester.run('invalid - unlimited buffer allocation', noUnlimitedResourceAllocation, {
      valid: [],
      invalid: [
        {
          name: 'an allocation sized by the request',
          code: 'const buf = Buffer.alloc(req.query.size);',
          errors: [
            {
              messageId: 'userControlledResourceSize',
            },
          ],
        },
        {
          code: 'const buffer = new Buffer(req.query.size);',
          errors: [
            {
              messageId: 'userControlledResourceSize',
            },
          ],
        },
        {
          code: 'const fast = Buffer.allocUnsafe(req.body.length);',
          errors: [
            {
              messageId: 'userControlledResourceSize',
            },
          ],
        },
        {
          code: 'const largeBuf = Buffer.alloc(1024 * 1024 * 100);', // 100MB
          errors: [
            {
              messageId: 'unlimitedBufferAllocation',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Unlimited Memory Allocation', () => {
    ruleTester.run('invalid - unlimited memory allocation', noUnlimitedResourceAllocation, {
      valid: [],
      invalid: [
        {
          code: 'const arr = new Array(req.body.size);',
          errors: [
            {
              messageId: 'unlimitedMemoryAllocation',
            },
          ],
        },
        {
          code: 'const bigArray = Array(req.body.size);',
          errors: [
            {
              messageId: 'unlimitedMemoryAllocation',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Unlimited File Operations', () => {
    ruleTester.run('invalid - unlimited file operations', noUnlimitedResourceAllocation, {
      valid: [],
      invalid: [
        {
          code: 'fs.readFile(req.query.file, callback);',
          errors: [
            {
              messageId: 'unlimitedFileOperations',
            },
          ],
        },
        {
          code: 'fs.writeFileSync(req.query.file, data);',
          errors: [
            {
              messageId: 'unlimitedFileOperations',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Resource Allocation in Loops', () => {
    ruleTester.run('invalid - resource allocation inside loops', noUnlimitedResourceAllocation, {
      valid: [
        // Literal-size allocations in loops are bounded — safe (FP regression lock)
        {
          code: `
            for (let i = 0; i < 10; i++) {
              const buf = Buffer.alloc(1024); // literal size: always 1024 bytes
            }
          `,
        },
        {
          code: `
            while (condition) {
              const arr = new Array(100); // literal size: bounded
            }
          `,
        },
        {
          code: `
            for (const item of items) {
              const buffer = Buffer.alloc(512); // literal size: bounded
            }
          `,
        },
        // CONTROL for the two invalid cases below: the same allocations, in a
        // loop nobody outside the process can lengthen. Without this pair the
        // invalid cases would also pass on a rule that reports every loop.
        {
          code: `
            function handler(req) {
              for (let i = 0; i < 10; i++) {
                const buf = Buffer.alloc(1024 * 1024);
              }
            }
          `,
        },
        // 107 of the 173 findings this rule produced on the 20-repo corpus
        // were this expression. `Set` takes an ITERABLE, not a size: copying
        // one allocates what the program already holds, and no input makes it
        // larger.
        {
          code: `
            for (const scc of components) {
              const sccSet = new Set(scc);
            }
          `,
        },
      ],
      invalid: [
        // The finding is the TRIP COUNT, not the size. A fixed 1 MB taken an
        // invoker-chosen number of times exhausts the same heap.
        {
          code: `
            function handler(req) {
              const count = Number(req.query.count);
              for (let i = 0; i < count; i++) {
                const buf = Buffer.alloc(1024 * 1024);
              }
            }
          `,
          errors: [{ messageId: 'resourceAllocationInLoop' }],
        },
        {
          code: `
            function handler(req) {
              while (req.body.more) {
                const arr = new Array(64);
              }
            }
          `,
          errors: [{ messageId: 'resourceAllocationInLoop' }],
        },
      ],
    });
  });

  describe('Invalid Code - Missing Resource Limits', () => {
    ruleTester.run('invalid - missing resource validation', noUnlimitedResourceAllocation, {
      valid: [],
      invalid: [
        {
          code: 'const buf = Buffer.alloc(req.body.size);',
          errors: [
            {
              messageId: 'userControlledResourceSize',
            },
          ],
        },
        // Was `new Array(inputSize)`, which reported because the printed text
        // of `inputSize` CONTAINS 'input'. That same substring is what made
        // mongoose's `fs.readFileSync(path.resolve(cwd, inputFile))` a false
        // positive on the corpus.
        {
          code: 'function h(req) { const arr = new Array(req.body.count); }',
          errors: [
            {
              messageId: 'unlimitedMemoryAllocation',
            },
          ],
        },
      ],
    });
  });

  describe('Valid Code - False Positives Reduced', () => {
    ruleTester.run('valid - false positives reduced', noUnlimitedResourceAllocation, {
      valid: [
        // Safe annotations
        {
          code: `
            /** @limited-resource */
            function allocateBuffer() {
              const buf = Buffer.alloc(userSize);
            }
          `,
          options: [{ trustedAnnotations: ['@limited-resource'] }],
        },
        // Validated sizes
        {
          code: 'const buf = Buffer.alloc(validateSize(req.body.size));',
        },
        // Limited allocations
        {
          code: 'const buf = Buffer.alloc(Math.min(userSize, MAX_BUFFER_SIZE));',
        },
        // Pre-allocated resources outside loops
        {
          code: `
            const buffers = [];
            for (let i = 0; i < 10; i++) {
              buffers[i] = Buffer.alloc(1024); // Pre-allocated outside main logic
            }
          `,
        },
        // Safe resource functions
        {
          code: `
            const buf = safeAlloc(userSize);
          `,
        },
        // Disabled validation requirement — with `requireResourceValidation:
        // false`, unvalidated user-controlled sizes are no longer flagged
        // (proves the option actually gates the userControlledResourceSize
        // check; req.query.size is real user input and would be reported
        // by default, see the paired invalid case below).
        {
          code: 'const buf = Buffer.alloc(req.query.size);',
          options: [{ requireResourceValidation: false }],
        },
        {
          code: 'const buffer = new Buffer(req.query.size);',
          options: [{ requireResourceValidation: false }],
        },
        // @safe annotation directly on the userControlledResourceSize path
        // (Buffer.alloc with unvalidated user input) - exercises the
        // safetyChecker.isSafe() early-return for CallExpression Buffer.alloc.
        {
          code: `
            /** @safe */
            const buf = Buffer.alloc(req.query.size);
          `,
        },
        // @safe annotation on an oversized literal buffer allocation -
        // exercises the safetyChecker.isSafe() early-return on the
        // unlimitedBufferAllocation path (CallExpression).
        {
          code: `
            /** @safe */
            const largeBuf = Buffer.alloc(1024 * 1024 * 100);
          `,
        },
        // @safe annotation on a multer() config without limits - exercises
        // the safetyChecker.isSafe() early-return on the
        // unlimitedFileOperations (multer) path.
        {
          code: `
            /** @safe */
            const upload = multer({ dest: "./uploads" });
          `,
        },
        // @safe annotation on an fs read/write call whose path is user
        // input - exercises the safetyChecker.isSafe() early-return on the
        // unlimitedFileOperations (fs) path.
        {
          code: `
            /** @safe */
            fs.readFile(req.query.file, callback);
          `,
        },
        // @safe annotation on an Array(userInput) call expression -
        // exercises the safetyChecker.isSafe() early-return on the
        // unlimitedMemoryAllocation (Array call) path.
        {
          code: `
            /** @safe */
            const arr = Array(req.body.size);
          `,
        },
        // @safe annotation on a dynamic-size CallExpression allocation
        // inside a loop - exercises the safetyChecker.isSafe() early-return
        // on the resourceAllocationInLoop (CallExpression) path.
        {
          code: `
            /** @safe */
            for (let i = 0; i < 10; i++) {
              const buf = Buffer.alloc(userSize);
            }
          `,
        },
        // @safe annotation on `new Buffer(userInput)` - exercises the
        // safetyChecker.isSafe() early-return on the
        // userControlledResourceSize path (NewExpression).
        {
          code: `
            /** @safe */
            const buf3 = new Buffer(req.query.size);
          `,
        },
        // @safe annotation on an oversized literal `new Buffer(...)` -
        // exercises the safetyChecker.isSafe() early-return on the
        // unlimitedBufferAllocation path (NewExpression).
        {
          code: `
            /** @safe */
            const largeBuf2 = new Buffer(1024 * 1024 * 100);
          `,
        },
        // @safe annotation on `new Array(userInput)` - exercises the
        // safetyChecker.isSafe() early-return on the
        // unlimitedMemoryAllocation path (NewExpression).
        {
          code: `
            /** @safe */
            const arr2 = new Array(req.body.size);
          `,
        },
        // @safe annotation on a dynamic-size `new` allocation inside a loop
        // - exercises the safetyChecker.isSafe() early-return on the
        // resourceAllocationInLoop path (NewExpression).
        {
          code: `
            /** @safe */
            for (let i = 0; i < 10; i++) {
              const m = new Map(dynamicEntries);
            }
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Configuration Options', () => {
    ruleTester.run('config - custom max resource size', noUnlimitedResourceAllocation, {
      valid: [
        {
          code: 'const buf = Buffer.alloc(500000);', // 500KB, under 1MB default
        },
      ],
      invalid: [
        {
          code: 'const buf = Buffer.alloc(2000000);', // 2MB, over 1MB default
          options: [{ maxResourceSize: 1000000 }],
          errors: [
            {
              messageId: 'unlimitedBufferAllocation',
            },
          ],
        },
      ],
    });

    ruleTester.run('config - custom user input variables', noUnlimitedResourceAllocation, {
      valid: [
        {
          code: 'const buf = Buffer.alloc(incoming.body.size);',
          options: [{ userInputVariables: ['otherRoot'] }],
        },
        // The option renames the ROOT. It does not make a bare identifier
        // evidence of anything — `customRoot` with no request-surface access
        // is still only a name.
        {
          code: 'const buf = Buffer.alloc(customRoot);',
          options: [{ userInputVariables: ['customRoot'] }],
        },
      ],
      invalid: [
        {
          code: 'const buf = Buffer.alloc(incoming.body.size);',
          options: [{ userInputVariables: ['incoming'] }],
          errors: [
            {
              messageId: 'userControlledResourceSize',
            },
          ],
        },
      ],
    });

    ruleTester.run('config - requireResourceValidation toggle', noUnlimitedResourceAllocation, {
      valid: [
        // Disabling the option suppresses the userControlledResourceSize
        // check for both Buffer.alloc() and new Buffer(), even though the
        // size argument is unvalidated user input.
        {
          code: 'const buf = Buffer.alloc(req.query.size);',
          options: [{ requireResourceValidation: false }],
        },
        {
          code: 'const buffer = new Buffer(req.query.size);',
          options: [{ requireResourceValidation: false }],
        },
      ],
      invalid: [
        // Same code, option left at its default (true) — still flagged.
        {
          code: 'const buf = Buffer.alloc(req.query.size);',
          errors: [
            {
              messageId: 'userControlledResourceSize',
            },
          ],
        },
        {
          code: 'const buf = Buffer.alloc(req.query.size);',
          options: [{ requireResourceValidation: true }],
          errors: [
            {
              messageId: 'userControlledResourceSize',
            },
          ],
        },
        {
          code: 'const buffer = new Buffer(req.query.size);',
          options: [{ requireResourceValidation: true }],
          errors: [
            {
              messageId: 'userControlledResourceSize',
            },
          ],
        },
      ],
    });
  });

  describe('Complex Resource Allocation Scenarios', () => {
    ruleTester.run('complex - real-world DoS through resource exhaustion', noUnlimitedResourceAllocation, {
      valid: [
        // Was invalid, asserting BOTH `unlimitedMemoryAllocation` and
        // `userControlledResourceSize` on a `cache.set(...)` whose value
        // contains a `Buffer.alloc`. Two separate reasons it is no longer a
        // finding, and neither is a matter of taste:
        //
        //  - the memory report came from
        //    `calleeText.includes('set') && text.includes('Buffer.alloc')`,
        //    which also matches `offset`, `reset` and `dataset`. It produced 0
        //    findings on the 20-repo corpus and is deleted.
        //  - `data` is a PARAMETER. That a function's argument is named `data`
        //    says nothing about its callers, and assuming otherwise is what
        //    reported uptime-kuma's base64 encoder and mongoose's build script.
        //
        // Nothing in this snippet establishes that anyone outside the process
        // chooses `data.length`.
        {
          code: `
            const userCache = new Map();

            function cacheUserData(userId, data) {
              userCache.set(userId, {
                data,
                timestamp: Date.now(),
                largeBuffer: Buffer.alloc(data.length * 2)
              });
            }
          `,
        },
        // Was invalid as "billion laughs". xml2js parses through sax-js, which
        // rejects custom entity references outright — measured against
        // xml2js 0.6.2 / sax 1.6.1, see the locked cases in the wild-corpus
        // block at the bottom of this file.
        {
          code: `
            const xml2js = require('xml2js');

            function parseXML(xmlString) {
              const parser = new xml2js.Parser();
              parser.parseString(xmlString, (err, result) => {
                // Process result
              });
            }
          `,
        },
      ],
      invalid: [
        {
          code: `
            // ZIP bomb vulnerability - unlimited decompression
            const unzip = require('unzipper');

            app.post('/upload-zip', (req, res) => {
              const zipStream = unzip.Extract({ path: '/tmp' });

              // DANGEROUS: No size limits on zip extraction
              req.pipe(zipStream);

              zipStream.on('finish', () => {
                res.json({ extracted: true });
              });
            });
          `,
          errors: [
            {
              messageId: 'unlimitedFileOperations',
            },
          ],
        },
        {
          code: `
            // Resource exhaustion through user-controlled loops
            app.get('/generate-report', (req, res) => {
              const reportCount = parseInt(req.query.count) || 1;

              // DANGEROUS: User controls loop iterations
              for (let i = 0; i < reportCount; i++) {
                const reportBuffer = Buffer.alloc(1024 * 1024); // 1MB per iteration
                generateReport(i, reportBuffer);
              }

              res.json({ generated: reportCount });
            });
          `,
          errors: [
            {
              messageId: 'resourceAllocationInLoop',
            },
          ],
        },
        // The "recursive data structure processing" case that used to live
        // here asserted that `arr.map(cb)` is an unbounded allocation when the
        // printed text of `cb` contains 'Object.keys' and 'map'. It is now
        // valid — see the removal note in index.ts. Nothing in the shape says
        // where `data` came from or that anything unbounded is allocated, and
        // `arr.map(cb)` is the most common expression in JavaScript. It was
        // 2 of this rule's 4 wild-corpus findings, on ordinary array
        // iteration in okta-auth-js and the Shopify CLI.
        {
          code: `
            // File upload without size limits
            const multer = require('multer');
            const upload = multer({
              dest: 'uploads/',
              // DANGEROUS: No file size limits
            });

            app.post('/upload', upload.single('file'), (req, res) => {
              res.json({ uploaded: req.file.filename });
            });
          `,
          errors: [
            {
              messageId: 'unlimitedFileOperations',
            },
          ],
        },
        // The unbounded-cache case moved to `valid` — see the block below.
        // A handler that DOES prove the size is invoker-supplied still
        // reports, which is the control that keeps the move honest.
        {
          code: `
            app.post('/cache', (req, res) => {
              const entry = Buffer.alloc(Number(req.body.bytes));
              store.set(req.body.key, entry);
            });
          `,
          errors: [
            {
              messageId: 'userControlledResourceSize',
            },
          ],
        },
      ],
    });
  });
  describe('Other Resource Patterns', () => {
    ruleTester.run('invalid - deprecated buffer and array constructors', noUnlimitedResourceAllocation, {
      valid: [],
      invalid: [
        // new Buffer() - deprecated but dangerous
        {
          code: 'const buf = new Buffer(req.body.size);',
          errors: [{ messageId: 'userControlledResourceSize' }],
        },
        {
          code: 'const buf = new Buffer(1024 * 1024 * 100);', // 100MB
          errors: [{ messageId: 'unlimitedBufferAllocation' }],
        },
        // Array() called as function
        {
          code: 'const arr = Array(req.query.length);',
          errors: [{ messageId: 'unlimitedMemoryAllocation' }],
        },
        // new Array() variations. Was `new Array(input)` — a bare parameter
        // name. `input` is in the root list, but a root is evidence only when
        // it is read through a request surface.
        {
          code: 'function h(input) { const arr = new Array(input.query.n); }',
          errors: [{ messageId: 'unlimitedMemoryAllocation' }],
        },
      ],
    });

    ruleTester.run('invalid - multer configurations', noUnlimitedResourceAllocation, {
      valid: [
        // Multer with limits
        {
          code: 'const upload = multer({ limits: { fileSize: 1000 } });',
        },
        // Multer without options (currently ignored by rule)
        {
          code: 'const upload = multer();',
        },
        // Multer with a direct top-level `fileSize` property (non-standard
        // but still recognized as a valid limit) - exercises the
        // `prop.key.name === 'fileSize'` true-return branch.
        {
          code: 'const upload = multer({ fileSize: 1000 });',
        },
      ],
      invalid: [
        // Multer with options but no limits
        {
          code: 'const upload = multer({ dest: "./uploads" });',
          errors: [{ messageId: 'unlimitedFileOperations' }],
        },
        // Multer with limits property but empty/wrong (edge case)
        {
          code: 'const upload = multer({ limits: {} });',
          errors: [{ messageId: 'unlimitedFileOperations' }],
        },
        // Multer options object containing a spread element (not a
        // `Property` node) alongside a non-Identifier computed key -
        // exercises the `prop.type !== 'Property' || prop.key.type !== 'Identifier'`
        // early-return-false branch inside hasValidLimits' predicate.
        {
          code: 'const upload = multer({ ...baseOptions, [computedKey]: true, dest: "./uploads" });',
          errors: [{ messageId: 'unlimitedFileOperations' }],
        },
      ],
    });
  });

  describe('Loop Allocation Exceptions', () => {
    ruleTester.run('valid - loop allocation exceptions', noUnlimitedResourceAllocation, {
      valid: [
        // The allocation is in the for-INIT, so it runs once however dynamic
        // its size is. `isInsideLoop` alone cannot tell init from body — this
        // is `underscore-min.js`'s `for (var e = Array(t), u = 0; u < t; u++)`,
        // which reported 7 times across the corpus.
        'for (var e = Array(t), u = 0; u < t; u++) { e[u] = u; }',
        // A read-only size probe allocates nothing; it matched only because
        // the printed callee text contained 'Buffer'.
        'for (const x of xs) { Buffer.byteLength(x); }',
        // Zero-arg constructors allocate a constant, so the numeric-literal
        // escape could never apply to them — every `new Set()` in any loop
        // used to report.
        'for (const x of xs) { const s = new Set(); }',
        // Not an allocation at all.
        'for (let i = 0; i < 10; i++) { if (Array.isArray(v)) { use(v); } }',

        // Assignment to array element in loop (pre-allocated pattern)
        {
          code: `
            const buffers = new Array(10);
            for (let i = 0; i < 10; i++) {
              buffers[i] = Buffer.alloc(100);
            }
          `,
        },
        // Assignment to an array element in a loop the invoker cannot
        // lengthen. The dedicated `parent.type === 'AssignmentExpression'`
        // exemption this used to exercise is gone: once the loop bound is what
        // decides the finding, `buffers[i] = Buffer.alloc(n)` inside an
        // invoker-controlled loop is unbounded too, and the container is sized
        // by that same loop.
        {
          code: `
            const buffers = [];
            for (let i = 0; i < 10; i++) {
              buffers[i] = Buffer.alloc(dynamicSize);
            }
          `,
        },
        // Array.isArray call inside a loop - exercises the true side of the
        // `calleeText === 'Array.isArray'` safe-detector exception (this
        // callee text also contains "Array", so it would otherwise match the
        // loop-allocation callee-text prefilter).
        {
          code: `
            for (let i = 0; i < 10; i++) {
              if (Array.isArray(dynamicValue)) {
                // no-op
              }
            }
          `,
        },
      ],
      invalid: [
        // A for-of over a request-supplied collection: the invoker decides how
        // many times this allocates.
        {
          code: `
            function handler(req) {
              for (const item of req.body.items) {
                const b = Buffer.alloc(4096);
              }
            }
          `,
          errors: [{ messageId: 'resourceAllocationInLoop' }],
        },
        // NewExpression spelling of the same finding, and the control for the
        // `new Set(scc)` valid case above — what changed is the LOOP, not the
        // constructor.
        {
          code: `
            function handler(req) {
              for (const key in req.query) {
                const s = new Set(entries);
              }
            }
          `,
          errors: [{ messageId: 'resourceAllocationInLoop' }],
        },
      ],
    });
  });

  describe('Arithmetic Estimates', () => {
    ruleTester.run('arithmetic-size-estimation', noUnlimitedResourceAllocation, {
      valid: [
        // Division result small enough
        {
          code: 'const buf = Buffer.alloc(2048 / 2);',
        },
        // Subtraction
        {
          code: 'const buf = Buffer.alloc(2000 - 1000);',
        },
        // Unsupported binary operator (modulo) - estimateResourceSize's
        // switch falls through to `default: return null`, so the size is
        // untracked and treated as safe (no static bound to compare).
        {
          code: 'const buf = Buffer.alloc(2048 % 100);',
        },
        // A BinaryExpression size argument where one operand is not
        // statically resolvable (a local, non-user-input identifier) -
        // exercises the false side of `left !== null && right !== null` in
        // estimateResourceSize (the recursive estimate for `unknownVar` is
        // null, so the whole expression's size is untracked).
        {
          code: 'const buf = Buffer.alloc(localMultiplier * 100);',
        },
        // Division by a literal zero - exercises the `right !== 0 ? ... : null`
        // false branch in estimateResourceSize's division case; the estimate
        // becomes null, so there's nothing to compare against maxResourceSize.
        {
          code: 'const buf = Buffer.alloc(2048 / 0);',
        },
        // A binary expression whose estimated size is exactly 0 - exercises
        // the falsy side of `estimatedSize && estimatedSize > maxResourceSize`
        // (0 is a valid estimate but is falsy, so the check short-circuits).
        {
          code: 'const buf = Buffer.alloc(1000 - 1000);',
        },
      ],
      invalid: [
        // Multiplication overload
        {
          code: 'const buf = Buffer.alloc(1024 * 1024 * 2);', // 2MB
          errors: [{ messageId: 'unlimitedBufferAllocation' }],
        },
        // Addition overload
        {
          code: 'const buf = Buffer.alloc(1000000 + 100000);', // 1.1MB
          errors: [{ messageId: 'unlimitedBufferAllocation' }],
        },
      ],
    });
  });
});

/**
 * Wild-corpus regression: `calleeText.includes('Extract')`.
 *
 * The ZIP-bomb branch matched the callee's *printed text* for the bare
 * substring 'Extract' and then reported unconditionally, so passport-jwt's
 * standard configuration —
 *
 *   jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()
 *
 * — was reported as an unbounded decompression in four separate repositories.
 * Nine findings on the 13-repo corpus, none of them touching an archive.
 *
 * Matching is now structural: a known archive receiver plus one of its
 * decompression methods.
 */
describe('corpus regression — ZIP bomb detection', () => {
  ruleTester.run('decompression is matched structurally', noUnlimitedResourceAllocation, {
    valid: [
      { name: 'passport-jwt extractor', code: `const o = { jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken() };` },
      { name: 'passport-jwt with scheme', code: `const o = { jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('Bearer') };` },
      { name: 'any other Extract-named helper', code: `const x = ExtractColors.fromImage(img);` },
      // A receiver that is not bound to an archive module, however it reads.
      { name: 'unbound receiver named unzipper', code: `unzipper.Extract({ path: 'out' });` },
      // Namespace import — the other specifier kind the collector accepts.
      {
        name: 'namespace import of an archive module, non-decompression method',
        code: `import * as unzipper from 'unzipper';\nunzipper.version();`,
      },
      // A named import binds a member, not the module, so it is not a receiver.
      {
        name: 'named import specifier is not a module binding',
        code: `import { Extract } from 'unzipper';\nExtract({ path: 'out' });`,
      },
      // A DYNAMIC key on an archive binding names no method, so there is
      // nothing to match. This is where the line belongs — a string key is
      // resolvable and now reports; see the invalid case below.
      {
        name: 'dynamic-keyed member on an archive binding',
        code: `const tar = require('tar');\ntar[m]();`,
      },
    ],
    invalid: [
      {
        // FN: was `valid`, on the ground that a string-keyed member "yields no
        // Identifier property, so there is no method name to match". It yields
        // a perfectly good method name — `tar['extract']()` extracts exactly
        // as `tar.extract()` does, and decompresses unbounded either way.
        // @found computed-key blind-spot probe
        name: 'FN: an archive extract reached by a string subscript',
        code: `const tar = require('tar');\ntar['extract']();`,
        errors: 1,
      },
      {
        name: 'unzipper.Extract still reports',
        code: `const unzipper = require('unzipper');\nstream.pipe(unzipper.Extract({ path: 'out' }));`,
        errors: [{ messageId: 'unlimitedFileOperations' }],
      },
      {
        name: 'unzipper.Parse still reports',
        code: `const unzipper = require('unzipper');\nstream.pipe(unzipper.Parse());`,
        errors: [{ messageId: 'unlimitedFileOperations' }],
      },
      // The aliased spelling real code uses, and the reason receiver names
      // are resolved to their import source rather than matched by name.
      {
        name: 'aliased require still reports',
        code: `const unzip = require('unzipper');\nconst s = unzip.Extract({ path: '/tmp' });`,
        errors: [{ messageId: 'unlimitedFileOperations' }],
      },
      {
        name: 'default import alias still reports',
        code: `import zip from 'unzipper';\nstream.pipe(zip.Extract({ path: 'out' }));`,
        errors: [{ messageId: 'unlimitedFileOperations' }],
      },
      {
        name: 'zlib.createGunzip still reports',
        code: `req.pipe(zlib.createGunzip());`,
        errors: [{ messageId: 'unlimitedFileOperations' }],
      },
      {
        name: 'tar.extract still reports',
        code: `const tar = require('tar');\ntar.extract({ cwd: 'out' });`,
        errors: [{ messageId: 'unlimitedFileOperations' }],
      },
    ],
  });
});

/**
 * Layer 2 — the `node.loc?.start.line ?? 0` fallbacks on both
 * resourceAllocationInLoop reports. A real parser always attaches `loc`, so
 * these arms need a synthetic node.
 */
describe('resourceAllocationInLoop line fallback', () => {
  // `while (req.body)` — a request-surface read on a request root, the shape
  // the rule needs, and one a synthetic node can carry without a resolvable
  // scope.
  const loopedCall = (type: 'CallExpression' | 'NewExpression') => {
    const root: Record<string, unknown> = { type: 'Identifier', name: 'req' };
    const test = {
      type: 'MemberExpression',
      computed: false,
      object: root,
      property: { type: 'Identifier', name: 'body' },
    };
    root.parent = test;
    return {
      type,
      callee: { type: 'Identifier', name: 'Array' },
      arguments: [{ type: 'Identifier', name: 'n' }],
      parent: {
        type: 'WhileStatement',
        test,
        parent: null,
      },
    };
  };

  it('CallExpression falls back to line 0 when loc is missing', () => {
    const { listeners, reports } = createWithMockContext(noUnlimitedResourceAllocation, {
      sourceText: 'while (req.body) { Array(n); }',
    });
    (listeners.CallExpression as (n: unknown) => void)(loopedCall('CallExpression'));
    const inLoop = reports.filter((r) => r.messageId === 'resourceAllocationInLoop');
    expect(inLoop).toHaveLength(1);
    expect(inLoop[0].data?.line).toBe('0');
  });

  it('NewExpression falls back to line 0 when loc is missing', () => {
    const { listeners, reports } = createWithMockContext(noUnlimitedResourceAllocation, {
      sourceText: 'while (req.body) { new Array(n); }',
    });
    (listeners.NewExpression as (n: unknown) => void)(loopedCall('NewExpression'));
    const inLoop = reports.filter((r) => r.messageId === 'resourceAllocationInLoop');
    expect(inLoop).toHaveLength(1);
    expect(inLoop[0].data?.line).toBe('0');
  });
});

/**
 * Wild-corpus sweep (8 repos of published SDK/CLI code): 4 findings, 1 real.
 *
 * Two defects, both substring matching over printed callee text:
 *
 *  - `calleeText.includes('parseString')` matched `parseStringArgument(…)`, a
 *    Redis command-token reader.
 *  - `calleeText.includes('map') || calleeText.includes('forEach')` matched
 *    ordinary array iteration. That check is gone — see index.ts.
 */
describe('corpus regression — XML parsing and array iteration', () => {
  ruleTester.run('wild corpus', noUnlimitedResourceAllocation, {
    valid: [
      // redis/ioredis lib/utils/argumentParsers.ts:77 — reads one Redis token.
      {
        name: 'parseStringArgument is not an XML parser',
        code: `const token = parseStringArgument(args[i]);`,
      },
      { name: 'a member call merely containing the substring', code: `helpers.parseStringList(args);` },
      // okta-auth-js .../Base/Remediator.ts:170 and Shopify CLI
      // .../node/json-schema.ts:136 — ordinary iteration.
      {
        name: 'forEach over a local array',
        code: `inputsFromRemediation.forEach((input) => { return Object.keys(input).map((k) => k); });`,
      },
      {
        name: 'map over a local array',
        code: `const out = errors.map((error) => Object.keys(error).map((k) => k));`,
      },
      // The decompression report asks for maxOutputLength, so a call that
      // already passes one must stop asking.
      {
        name: 'gunzip with an output limit',
        code: `const zlib = require('zlib'); const g = zlib.createGunzip({maxOutputLength: 1000});`,
      },
      {
        name: 'gunzip with a maxSize limit',
        code: `const zlib = require('zlib'); const g = zlib.createGunzip({maxSize: 1000});`,
      },
      // axios lib/adapters/http.js:1193 — the output bound is spelled as a
      // byte count on the piped stream rather than as `maxOutputLength`.
      {
        name: 'the decompressed bytes are counted and capped',
        code: `const zlib = require('zlib');
          function onResponse(res, limit) {
            const streams = [];
            streams.push(zlib.createUnzip());
            let totalResponseBytes = 0;
            res.on('data', (chunk) => {
              totalResponseBytes += chunk.length;
              if (totalResponseBytes > limit) { throw new Error('too big'); }
            });
          }`,
      },
      // `.byteLength` is the same accumulator, spelled for a Buffer.
      {
        name: 'byteLength counted and capped',
        code: `const zlib = require('zlib');
          function onResponse(res, limit) {
            const g = zlib.createUnzip();
            let total = 0;
            res.on('data', (chunk) => {
              total += chunk.byteLength;
              if (total >= limit) { throw new Error('too big'); }
            });
          }`,
      },
      // A receiver that is not a plain identifier resolves to no binding.
      {
        name: 'a nested receiver',
        code: `const zlib = require('zlib'); const g = zlib.streams.createGunzip();`,
      },
      // Not an XML module, so `new` does not bind a parser.
      { name: 'an unrelated constructor', code: `const d = new Date(); d.parseString(x);` },

      // These four were INVALID until 2026-08-18, on the premise that
      // `xml2js.parseString` is a billion-laughs sink. The premise was never
      // measured. It is false: xml2js parses through sax-js, which rejects
      // custom entity references outright.
      //
      //   xml2js 0.6.2 / sax 1.6.1, all answering `Invalid character entity`:
      //     <!DOCTYPE d [<!ENTITY a "HELLO">]><d>&a;</d>
      //     <!DOCTYPE d [<!ENTITY a "xx"><!ENTITY b "&a;&a;&a;">]><d>&b;</d>
      //     <!ENTITY xxe SYSTEM "file:///etc/passwd">
      //     nine-level billion laughs → error in 1 ms, 0 characters expanded
      //
      // 24 of this rule's 173 corpus findings were this shape, every one of
      // them in n8n, every one naming a vulnerability the parser cannot have.
      // They are valid now and locked that way, so the path cannot return
      // without someone re-measuring the parser first.
      {
        name: 'xml2js.parseString cannot expand entities',
        code: `const xml2js = require('xml2js'); xml2js.parseString(xmlString, cb);`,
      },
      {
        name: 'parseStringPromise via the module',
        code: `const xml2js = require('xml2js'); xml2js.parseStringPromise(xmlString);`,
      },
      {
        name: 'a bare named import',
        code: `import {parseString} from 'xml2js'; parseString(xmlString, cb);`,
      },
      {
        name: 'an instance constructed from a bare named import',
        code: `import {Parser} from 'xml2js'; const p = new Parser(); p.parseString(xmlString, cb);`,
      },
    ],
    invalid: [
      // Shopify CLI .../services/function/binaries.ts:315 — the one real
      // finding: a decompression stream with no output bound.
      {
        name: 'binaries.ts:315 — gunzip with no output limit',
        code: `const gzip = require('zlib'); const gunzip = gzip.createGunzip();`,
        errors: [{ messageId: 'unlimitedFileOperations' }],
      },
      // CONTROLS for the byte-count guard: each half alone is not a bound.
      // nodemailer lib/fetch/index.js:282 counts nothing at all.
      {
        name: 'counting bytes without comparing them is not a bound',
        code: `const zlib = require('zlib');
          function onResponse(res) {
            const g = zlib.createUnzip();
            let total = 0;
            res.on('data', (chunk) => { total += chunk.length; });
          }`,
        errors: [{ messageId: 'unlimitedFileOperations' }],
      },
      {
        name: 'comparing an unrelated value is not a bound',
        code: `const zlib = require('zlib');
          function onResponse(res, limit) {
            const g = zlib.createUnzip();
            if (res.statusCode > limit) { return; }
          }`,
        errors: [{ messageId: 'unlimitedFileOperations' }],
      },
      {
        name: 'options without a limit still reports',
        code: `const zlib = require('zlib'); const g = zlib.createGunzip({level: 9});`,
        errors: [{ messageId: 'unlimitedFileOperations' }],
      },
      {
        name: 'a spread options object establishes no limit',
        code: `const zlib = require('zlib'); const g = zlib.createGunzip({...opts});`,
        errors: [{ messageId: 'unlimitedFileOperations' }],
      },
      {
        name: 'a computed option key establishes no limit',
        code: `const zlib = require('zlib'); const g = zlib.createGunzip({['maxOutputLength']: 1});`,
        errors: [{ messageId: 'unlimitedFileOperations' }],
      },
      {
        name: 'a non-object options argument establishes no limit',
        code: `const zlib = require('zlib'); const g = zlib.createGunzip(opts);`,
        errors: [{ messageId: 'unlimitedFileOperations' }],
      },
    ],
  });
});

/**
 * Schema options that nothing else in this file sets.
 *
 * `safeResourceFunctions`, `trustedSanitizers` and `strictMode` all shipped
 * with their branches never executed by a test. Each is covered below by a PAIR
 * over the SAME source text — one entry that sets the option, one that does
 * not — whose verdicts disagree. Setting an option and asserting the default
 * answer would execute the line while proving nothing: the branch could be
 * deleted and this suite would stay green.
 */
describe('no-unlimited-resource-allocation — option differentials', () => {
  // A user-controlled allocation size routed through a project-local clamp.
  // The rule has no way to know `clampToQuota` bounds anything, so by default
  // it reports; `safeResourceFunctions` is how a project tells it.
  const CLAMPED_ALLOC = `
    function upload(req) {
      return Buffer.alloc(clampToQuota(req.body.size));
    }
  `;

  ruleTester.run('option safeResourceFunctions', noUnlimitedResourceAllocation, {
    valid: [
      // Registering the clamp satisfies hasSizeValidation, which is the only
      // thing standing between this call and a userControlledResourceSize
      // report. Drop the option and the invalid twin below fires.
      {
        code: CLAMPED_ALLOC,
        options: [{ safeResourceFunctions: ['clampToQuota'] }],
      },
    ],
    invalid: [
      // Identical source on the defaults (validateSize / checkLimits /
      // limitResource / safeAlloc): the clamp is an unknown name, the size is
      // still request-derived, so it reports.
      {
        code: CLAMPED_ALLOC,
        errors: [{ messageId: 'userControlledResourceSize' }],
      },
    ],
  });

  // The same allocation with nothing wrapping the size at all.
  const RAW_ALLOC = `
    function upload(req) {
      return Buffer.alloc(req.body.size);
    }
  `;

  ruleTester.run('option trustedSanitizers', noUnlimitedResourceAllocation, {
    valid: [
      // Note WHAT this option can reach in this rule: every report site hands
      // safetyChecker.isSafe the ALLOCATION call itself, never the size
      // expression, so the name that has to be registered is the allocator's —
      // `Buffer.alloc` is matched on its member name `alloc`. That is the only
      // shape of `trustedSanitizers` this rule can honour, and it reads as
      // "our pooled .alloc() is capped internally".
      {
        code: RAW_ALLOC,
        options: [{ trustedSanitizers: ['alloc'] }],
      },
    ],
    invalid: [
      // Same source, default (empty) trustedSanitizers. Membership is exact, so
      // nothing in the built-in SANITIZATION_FUNCTIONS list matches `alloc`.
      {
        code: RAW_ALLOC,
        errors: [{ messageId: 'userControlledResourceSize' }],
      },
    ],
  });

  ruleTester.run('option strictMode', noUnlimitedResourceAllocation, {
    valid: [
      {
        code: RAW_ALLOC,
        options: [{ trustedSanitizers: ['alloc'] }],
      },
    ],
    invalid: [
      // strictMode forces safetyChecker.isSafe to false unconditionally, so the
      // trustedSanitizers entry that silenced the valid twin stops being
      // honoured. The userControlledResourceSize site is guarded only by
      // isSafe, so nothing else can account for the disagreement.
      {
        code: RAW_ALLOC,
        options: [{ trustedSanitizers: ['alloc'], strictMode: true }],
        errors: [{ messageId: 'userControlledResourceSize' }],
      },
    ],
  });
});

/**
 * Every arm of the two predicates the 2026-08-18 rewrite introduced.
 *
 * `isInvokerControlled` and `couldBeASize` are both recursive switches, and a
 * switch arm that no test enters is a decision nobody has checked. Each case
 * below is a PAIR over the same shape — one that must report, one that must
 * not — so an arm cannot be deleted and leave this file green.
 */
describe('no-unlimited-resource-allocation — predicate arms', () => {
  ruleTester.run('isInvokerControlled', noUnlimitedResourceAllocation, {
    valid: [
      // computed member, index NOT invoker-supplied
      { name: 'computed index from a local', code: 'function h(i) { const b = Buffer.alloc(sizes[i]); }' },
      { name: 'conditional, neither arm supplied', code: 'function h(f) { const b = Buffer.alloc(f ? 8 : 16); }' },
      { name: 'template of locals', code: 'function h(n) { const a = Array(`${n}`); }' },
      { name: 'await of a local', code: 'async function h(p) { const b = Buffer.alloc(await p); }' },
      { name: 'a cast local', code: 'function h(n) { const b = Buffer.alloc(n as number); }' },
      { name: 'a non-null local', code: 'function h(n) { const b = Buffer.alloc(n!); }' },
      // The walk is bounded. Thirteen bindings deep the answer is "unknown",
      // and unknown reports nothing — a cap that reported would turn every
      // long chain into a finding.
      {
        name: 'beyond the depth cap',
        code: `function h(req) {
          const a1 = req.body.n; const a2 = f(a1); const a3 = f(a2); const a4 = f(a3);
          const a5 = f(a4); const a6 = f(a5); const a7 = f(a6); const a8 = f(a7);
          const a9 = f(a8); const a10 = f(a9); const a11 = f(a10); const a12 = f(a11);
          const a13 = f(a12); const a14 = f(a13);
          const b = Buffer.alloc(a14);
        }`,
      },
    ],
    invalid: [
      {
        name: 'computed index IS invoker-supplied',
        code: 'function h(req) { const b = Buffer.alloc(sizes[req.body.i]); }',
        errors: [{ messageId: 'userControlledResourceSize' }],
      },
      {
        name: 'one arm of a conditional',
        code: 'function h(req, f) { const b = Buffer.alloc(f ? req.body.n : 16); }',
        errors: [{ messageId: 'userControlledResourceSize' }],
      },
      {
        name: 'interpolated into a template',
        code: 'function h(req) { const a = Array(`${req.body.n}`); }',
        errors: [{ messageId: 'unlimitedMemoryAllocation' }],
      },
      {
        name: 'awaited',
        code: 'async function h(req) { const b = Buffer.alloc(await req.body.n); }',
        errors: [{ messageId: 'userControlledResourceSize' }],
      },
      {
        name: 'cast',
        code: 'function h(req) { const b = Buffer.alloc(req.body.n as number); }',
        errors: [{ messageId: 'userControlledResourceSize' }],
      },
      {
        name: 'non-null asserted',
        code: 'function h(req) { const b = Buffer.alloc(req.body.n!); }',
        errors: [{ messageId: 'userControlledResourceSize' }],
      },
    ],
  });

  // `couldBeASize` gates ONLY the overloaded `new Buffer(x)`. Each pair is the
  // same call with a numeric-shaped argument and a content-shaped one.
  ruleTester.run('couldBeASize', noUnlimitedResourceAllocation, {
    valid: [
      { name: 'a string from the request is content', code: 'function h(req) { const b = new Buffer(req.body.name); }' },
      { name: 'a request array is content', code: 'function h(req) { const b = new Buffer(req.body.bytes.slice()); }' },
      // `+` is arithmetic AND string concatenation. The encoding argument is
      // what settles it — Node only accepts one on the string overload.
      { name: 'string concatenation with an encoding', code: 'function h(req) { const b = new Buffer(req.body.a + req.body.b, "utf8"); }' },
      { name: 'an encoding beside a numeric-looking argument', code: 'function h(req) { const b = new Buffer(Number(req.body.n), "utf8"); }' },
      { name: 'a local of unknown shape', code: 'function h(req) { const v = req.body.v; const b = new Buffer(v); }' },
      { name: 'a cast of content', code: 'function h(req) { const b = new Buffer(req.body.v as string); }' },
      { name: 'a non-null content', code: 'function h(req) { const b = new Buffer(req.body.v!); }' },
      { name: 'a conditional over content', code: 'function h(req) { const b = new Buffer(f ? req.body.a : req.body.b); }' },
      { name: 'a fallback over content', code: 'function h(req) { const b = new Buffer(req.body.a || req.body.b); }' },
      { name: 'a plain numeric literal is bounded', code: 'const b = new Buffer(64);' },
      { name: 'an array literal is content', code: 'function h(req) { const b = new Buffer([req.body.a, 2, 3]); }' },
      // A declaration with no initializer resolves to nothing to follow.
      { name: 'a binding with no initializer', code: 'function h(req) { let v; v = req.body.n; const b = new Buffer(v); }' },
    ],
    invalid: [
      {
        name: 'Number() is a size',
        code: 'function h(req) { const b = new Buffer(Number(req.body.n)); }',
        errors: [{ messageId: 'userControlledResourceSize' }],
      },
      {
        name: 'Math.floor() is a size',
        code: 'function h(req) { const b = new Buffer(Math.floor(req.body.n)); }',
        errors: [{ messageId: 'userControlledResourceSize' }],
      },
      {
        name: 'arithmetic is a size',
        code: 'function h(req) { const b = new Buffer(req.body.n * 2); }',
        errors: [{ messageId: 'userControlledResourceSize' }],
      },
      {
        name: 'unary coercion is a size',
        code: 'function h(req) { const b = new Buffer(+req.body.n); }',
        errors: [{ messageId: 'userControlledResourceSize' }],
      },
      {
        name: 'bitwise-not truncation is a size',
        code: 'function h(req) { const b = new Buffer(~req.body.n); }',
        errors: [{ messageId: 'userControlledResourceSize' }],
      },
      {
        name: '.length is a size',
        code: 'function h(req) { const b = new Buffer(req.body.chunk.length); }',
        errors: [{ messageId: 'userControlledResourceSize' }],
      },
      {
        name: 'through a local binding',
        code: 'function h(req) { const n = Number(req.body.n); const b = new Buffer(n); }',
        errors: [{ messageId: 'userControlledResourceSize' }],
      },
      {
        name: 'one numeric arm of a conditional',
        code: 'function h(req) { const b = new Buffer(f ? Number(req.body.n) : req.body.s); }',
        errors: [{ messageId: 'userControlledResourceSize' }],
      },
      {
        name: 'one numeric arm of a fallback',
        code: 'function h(req) { const b = new Buffer(Number(req.body.n) || req.body.s); }',
        errors: [{ messageId: 'userControlledResourceSize' }],
      },
      {
        name: 'a cast of a size',
        code: 'function h(req) { const b = new Buffer(Number(req.body.n) as number); }',
        errors: [{ messageId: 'userControlledResourceSize' }],
      },
      {
        name: 'a non-null size',
        code: 'function h(req) { const b = new Buffer(Number(req.body.n)!); }',
        errors: [{ messageId: 'userControlledResourceSize' }],
      },
    ],
  });

  ruleTester.run('enclosingLoop', noUnlimitedResourceAllocation, {
    valid: [
      // The allocation is in what the loop ITERATES OVER, so it runs once —
      // the for-of twin of the `for (var e = Array(t), u = 0; …)` init case.
      {
        name: 'allocation in the iterated expression',
        code: 'function h(req) { for (const x of new Set(req.body.items)) { use(x); } }',
      },
      {
        name: 'allocation in the for-in right',
        code: 'function h(req) { for (const k in new Map(req.body.entries)) { use(k); } }',
      },
      // `for (;;)` has no test, so there is no bound to read.
      {
        name: 'a loop with no test establishes no bound',
        code: 'function h(req) { for (;;) { const s = new Set(entries); break; } }',
      },
      // The clamp is on the binding, not at the call — the corpus safe
      // fixture's shape, `benchmarks/corpus/CWE-770/safe/buffer-alloc-clamped.js`.
      {
        name: 'a clamp one line above the allocation',
        code: 'function h(req) { const size = Math.min(Number(req.body.n), 65536); const b = Buffer.alloc(size); }',
      },
      // @safe on each of the two report paths.
      {
        name: '@safe on the call path',
        code: `function h(req) {
          /** @safe */
          for (const x of req.body.items) { Buffer.alloc(64); }
        }`,
      },
      {
        name: '@safe on the new path',
        code: `function h(req) {
          /** @safe */
          for (const x of req.body.items) { const s = new Set(entries); }
        }`,
      },
    ],
    invalid: [
      // `for (;;)` has no test, so this path establishes no loop bound — the
      // report that survives is the SIZE one, from a different branch.
      {
        name: 'a loop with no test still reports the size',
        code: 'function h(req) { for (;;) { const b = Buffer.alloc(req.body.n); break; } }',
        errors: [{ messageId: 'userControlledResourceSize' }],
      },
      {
        name: 'do-while bounded by the request',
        code: 'function h(req) { do { const b = Buffer.alloc(64); } while (req.body.more); }',
        errors: [{ messageId: 'resourceAllocationInLoop' }],
      },
    ],
  });
});
