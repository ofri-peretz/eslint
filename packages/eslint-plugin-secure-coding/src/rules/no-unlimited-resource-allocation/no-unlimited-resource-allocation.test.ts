/**
 * Comprehensive tests for no-unlimited-resource-allocation rule
 * Security: CWE-770 (Allocation of Resources Without Limits or Throttling)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
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
        // Safe buffer allocation with limits
        {
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
          code: `fs.readFileSync(path.join(__dirname, 'data', 'users.json'));`,
        },
        // Same static path construction, but using `path.resolve` instead of
        // `path.join` - exercises the `pathArg.callee.property.name === 'resolve'`
        // side of that binary-expr (only `'join'` was previously exercised).
        {
          code: `fs.readFileSync(path.resolve(__dirname, 'data', 'users.json'));`,
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
      ],
      invalid: [
        // Variable-size allocations in loops are genuinely risky
        {
          code: `
            for (let i = 0; i < 10; i++) {
              const buf = Buffer.alloc(userSize); // dynamic size from user input
            }
          `,
          errors: [{ messageId: 'resourceAllocationInLoop' }],
        },
        {
          code: `
            while (condition) {
              const arr = new Array(dynamicCount); // variable size, not literal
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
        {
          code: 'const arr = new Array(inputSize);',
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
          code: 'const buf = Buffer.alloc(customSize);',
          options: [{ userInputVariables: ['otherSize'] }],
        },
      ],
      invalid: [
        {
          code: 'const buf = Buffer.alloc(customSize);',
          options: [{ userInputVariables: ['customSize'] }],
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
      valid: [],
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
            // Billion laughs attack - XML expansion
            const xml2js = require('xml2js');

            function parseXML(xmlString) {
              // DANGEROUS: XML parser with no limits can expand exponentially
              const parser = new xml2js.Parser();
              parser.parseString(xmlString, (err, result) => {
                // Process result
              });
            }
          `,
          errors: [
            {
              messageId: 'unlimitedMemoryAllocation',
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
        {
          code: `
            // Memory exhaustion through recursive data structures
            function processUserData(data) {
              // DANGEROUS: Creates arrays based on user input depth
              if (Array.isArray(data)) {
                return data.map(item => {
                  if (typeof item === 'object') {
                    // Creates new arrays for nested objects
                    return Object.keys(item).map(key => [key, item[key]]);
                  }
                  return item;
                });
              }
              return data;
            }
          `,
          errors: [
            {
              messageId: 'unlimitedMemoryAllocation',
            },
          ],
        },
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
        {
          code: `
            // Cache with unlimited growth
            const userCache = new Map();

            function cacheUserData(userId, data) {
              // DANGEROUS: Cache grows without bounds
              userCache.set(userId, {
                data,
                timestamp: Date.now(),
                largeBuffer: Buffer.alloc(data.length * 2) // Grows with data size
              });
            }
          `,
          errors: [
            {
              messageId: 'unlimitedMemoryAllocation',
            },
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
        // new Array() variations
        {
          code: 'const arr = new Array(input);',
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
        // Assignment to array element in loop (pre-allocated pattern)
        {
          code: `
            const buffers = new Array(10);
            for (let i = 0; i < 10; i++) {
              buffers[i] = Buffer.alloc(100);
            }
          `,
        },
        // `new Set(dynamicEntries)` in a loop is exercised as an *invalid*
        // case just below (it must reach the report path so the `Set`
        // sub-check of the callee-text OR-chain gets evaluated - `Buffer`,
        // `Array`, and `Map` are all false for this callee, so only `Set`
        // decides whether the OR is entered at all).
        // Assignment to array element in loop, with a *dynamic* (non-literal)
        // size - exercises the true side of the
        // `parent.type === 'AssignmentExpression' && parent.left.type === 'MemberExpression'`
        // pre-allocated-pattern branch (the literal-size early-return above
        // does NOT apply here, since the size isn't a numeric literal).
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
        // Dynamic-size allocation in loop without assignment (still risky)
        {
          code: `
            for (let i = 0; i < 10; i++) {
              const b = Buffer.alloc(userSize);
            }
          `,
          errors: [{ messageId: 'resourceAllocationInLoop' }],
        },
        // `new Set(dynamicEntries)` inside a loop, not assigned to an array
        // element and not annotated `@safe` - reaches the report path so
        // the `newCalleeText.includes('Set')` branch of the callee-text
        // OR-chain is actually evaluated (Buffer/Array/Map are all false).
        {
          code: `
            for (let i = 0; i < 10; i++) {
              const s = new Set(dynamicEntries);
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
