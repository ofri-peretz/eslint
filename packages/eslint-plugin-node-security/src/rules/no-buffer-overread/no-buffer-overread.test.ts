/**
 * Comprehensive tests for no-buffer-overread rule
 * Security: CWE-126 (Buffer Access with Incorrect Length Value)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noBufferOverread } from './index';

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

/**
 * The pre-inversion contract: every index the rule cannot prove validated is a
 * finding.
 *
 * Measured on the 8-repo corpus that produced 15 findings: two argument
 * parsers, four loop counters, one buffer WRITE, and eight inside minified
 * vendor bundles. The default now requires an index traceable to input; these
 * cases keep pinning the index-tracing and bounds-check plumbing through the
 * restoring option.
 */
const UNVALIDATED = [{ reportUnvalidatedIndices: true }];

describe('no-buffer-overread', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - safe buffer operations', noBufferOverread, {
      valid: [
        // Safe buffer access with bounds checking (if statement provides bounds check)
        {
          code: 'if (index >= 0 && index < buffer.length) { const byte = buffer[index]; }',
        },
        // Safe buffer methods with literal offset
        {
          code: 'const value = buffer.readUInt32LE(0);',
        },
        // Non-buffer operations (array doesn't match buffer pattern)
        {
          code: 'const item = array[index];',
        },
        // Literal indices (non-negative)
        {
          code: 'const firstByte = buffer[0];',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Unsafe Buffer Access', () => {
    ruleTester.run('invalid - unsafe buffer access patterns', noBufferOverread, {
      valid: [],
      invalid: [
        // buffer[userInput] - 'userInput' contains 'user' and 'input' which are user-controlled keywords
        {
          code: 'const byte = buffer[userInput];',
          errors: [
            {
              messageId: 'userControlledBufferIndex',
            },
          ],
        },
        // buffer[offset] - 'offset' is a user-controlled keyword
        {
          code: 'const value = buffer[offset];',
          errors: [
            {
              messageId: 'userControlledBufferIndex',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Negative Indices', () => {
    ruleTester.run('invalid - negative buffer indices', noBufferOverread, {
      valid: [],
      invalid: [
        // Literal negative index
        {
          code: 'const byte = buffer[-1];',
          errors: [
            {
              messageId: 'negativeBufferIndex',
            },
          ],
        },
        // Subtraction expression could be negative
        {
          code: 'const value = buffer[userInput - 10];',
          errors: [
            {
              messageId: 'negativeBufferIndex',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Missing Bounds Checks', () => {
    ruleTester.run('invalid - missing bounds validation', noBufferOverread, {
      valid: [],
      invalid: [
        // userOffset contains 'offset' (user-controlled keyword)
        {
          code: 'buffer.readUInt32LE(userOffset);',
          errors: [
            {
              messageId: 'missingBoundsCheck',
            },
          ],
        },
        // req.query.offset - 'offset' is user-controlled
        {
          code: 'buffer.writeUInt16LE(value, userOffset);',
          errors: [
            {
              messageId: 'missingBoundsCheck',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Buffer Operations', () => {
    ruleTester.run('invalid - unsafe buffer operations', noBufferOverread, {
      valid: [],
      invalid: [
        // copy with user-controlled offset
        {
          code: 'buffer.copy(targetBuffer, userOffset);',
          errors: [
            {
              messageId: 'missingBoundsCheck',
            },
          ],
        },
        // slice with single user-controlled argument reports 2 errors
        {
          // One site, one finding — the slice handler owns the view methods.
          code: 'buffer.slice(userOffset);',
          errors: [
            {
              messageId: 'unsafeBufferSlice',
            },
          ],
        },
      ],
    });
  });

  describe('Valid Code - False Positives Reduced', () => {
    ruleTester.run('valid - false positives reduced', noBufferOverread, {
      valid: [
        // Safe annotations
        {
          code: `
            /** @safe */
            const byte = buffer[userInput];
          `,
        },
        // Safe Math.max/min patterns
        {
          code: `
            const start = Math.max(0, userStart);
            const end = Math.min(buffer.length, userEnd);
            const slice = buffer.slice(start, end);
          `,
        },
        // Literal indices for slice
        {
          code: 'const header = buffer.slice(0, 4);',
        },
        // Non-buffer variable name (doesn't match buffer pattern)
        {
          code: 'const byte = data[userInput];',
        },
      ],
      invalid: [],
    });
  });

  describe('Configuration Options', () => {
    ruleTester.run('config - custom buffer methods', noBufferOverread, {
      valid: [
        // Non-default method name - won't trigger
        {
          code: 'buffer.customRead(userOffset);',
        },
      ],
      invalid: [
        // Custom method in config - now triggers
        {
          code: 'buffer.customRead(userOffset);',
          options: [{ bufferMethods: ['customRead'] }],
          errors: [
            {
              messageId: 'missingBoundsCheck',
            },
          ],
        },
      ],
    });
  });

  describe('Validation Logic Coverage', () => {
    ruleTester.run('valid - custom validation helpers', noBufferOverread, {
      valid: [
        // Validated by function parameter assumption
        {
          code: `
            function readBuffer(buffer, validIndex) {
              return buffer[validIndex];
            }
          `,
        },
        // Validated by direct bounds check call
        {
          code: 'buffer[checkBounds(userIndex)];',
          options: [{ boundsCheckFunctions: ['checkBounds'] }],
        },
      ],
      invalid: [
        // Known Limitation: Variable tracking through function calls not fully supported
        {
          code: 'const idx = validateIndex(userIndex); const val = buffer[idx];',
          options: [{ reportUnvalidatedIndices: true, boundsCheckFunctions: ['validateIndex'] }],
          errors: [{ messageId: 'unsafeBufferAccess' }],
        },
        // Known Limitation: Math.min expressions not fully tracked via variables
        {
          code: 'const safeIdx = Math.min(buffer.length - 1, userIndex); const val = buffer[safeIdx];',
          options: UNVALIDATED,
          errors: [{ messageId: 'unsafeBufferAccess' }],
        },
      ],
    });

    ruleTester.run('invalid - complex bounds checking limitations', noBufferOverread, {
      valid: [],
      invalid: [
        // Known Limitation: Variable declarations not fully tracked for bounds checks
        {
          code: `
            const limit = Math.min(index, buffer.length);
            // This pattern is detected by hasBoundsCheck via VariableDeclaration
            const val = buffer[index]; 
          `,
          errors: [{ messageId: 'userControlledBufferIndex' }],
        },
      ],
    });
  });

  describe('Negative Index Analysis', () => {
    ruleTester.run('invalid - indirect negative values', noBufferOverread, {
      valid: [],
      invalid: [
        // Variable assigned negative literal
        {
          code: 'const neg = -5; buffer[neg];',
          options: UNVALIDATED,
          errors: [{ messageId: 'unsafeBufferAccess' }], // Variable tracking limitation
        },
        // Variable assigned unary negative
        {
          code: 'const n = -1; buffer[n];',
          options: UNVALIDATED,
          errors: [{ messageId: 'unsafeBufferAccess' }], // Variable tracking limitation
        },
      ],
    });
  });

  describe('Complex Buffer Overread Scenarios', () => {
    ruleTester.run('complex - real-world buffer patterns', noBufferOverread, {
      valid: [
        // Binary expression coverage (triggers the visitor but currently empty logic)
        {
          code: 'if (buffer.length - 1 > index) {}',
        },
      ],
      invalid: [
        // buffer[userOffset] triggers userControlledBufferIndex
        {
          code: 'const byte = buffer[userOffset]; const value = buffer.readUInt32LE(userOffset);',
          errors: [
            {
              messageId: 'userControlledBufferIndex',
            },
            {
              messageId: 'missingBoundsCheck',
            },
          ],
        },
        // Multiple unsafe accesses
        {
          code: 'buffer.readUInt16LE(userIndex); buffer.readUInt32LE(userOffset);',
          errors: [
            {
              messageId: 'missingBoundsCheck',
            },
            {
              messageId: 'missingBoundsCheck',
            },
          ],
        },
      ],
    });
  });

  // ── The inversion + the FN fix ─────────────────────────────────────────
  // Every `valid` case is a verbatim shape from the 8-repo corpus scan and
  // reported before this change.
  describe('Shape Is Not An Overread', () => {
    ruleTester.run('scope, writes, loop bounds and subarray', noBufferOverread, {
      valid: [
        // okta/okta-auth-js lib/crypto/base64.ts:57 — a buffer WRITE. If this
        // is anything it is CWE-787, not the overread this rule reports.
        `const buffer = new Uint8Array(str.length);
         for (var i = 0; i < str.length; i++) { buffer[i] = str.charCodeAt(i); }`,
        // okta/okta-signin-widget .../typingdna.js:1206-1229 — four findings,
        // every one a loop counter the loop condition already bounds.
        `function score(revs) {
           let rec = 0;
           for (let i = 0; i < revs.length; i++) { rec += Number(revs[i] > 0); }
           return rec;
         }`,
        // The same, bounded by a hoisted limit and by a while loop.
        `function walk(bytes, len) {
           let out = 0;
           for (let i = 0; i < len; i++) { out += bytes[i]; }
           return out;
         }`,
        `function scan(bytes, len) {
           let i = 0, out = 0;
           while (i < len) { out += bytes[i]; i++; }
           return out;
         }`,
        // Shopify/cli packages/e2e/scripts/cleanup-apps.ts:566 — `args` became
        // a "buffer" only because `process.argv.slice(2)` calls a method that
        // is also a Buffer method. The receiver has to be a buffer too.
        `const args = process.argv.slice(2);
         const patternIdx = args.indexOf('--pattern');
         const nextArg = args[patternIdx + 1];`,
        // The third arm's inversion, isolated: a real buffer, a real read, an
        // index this rule cannot prove validated — and no evidence anyone
        // untrusted chose it. Reported before the change, silent now.
        `function readAt(buf, n) { return buf[n + 1]; }`,
        // The write guard, isolated: the index IS user-controlled, so the
        // user-controlled arm would fire — but this is a WRITE, which is
        // CWE-787 and a different rule's site.
        `function store(req) { const buf = Buffer.alloc(8); buf[req.query.i] = 1; }`,
        // The loop-bound guard, isolated: `index` matches the user-controlled
        // keyword list, so the arm fires on the old code — but the loop
        // condition bounds it.
        `function sum(buf) { let t = 0; for (let index = 0; index < buf.length; index++) { t += buf[index]; } return t; }`,
        // The scoping fix, isolated: `store` is a Buffer in one function and an
        // unrelated parameter in another. The file-wide name set made the
        // second one a buffer too.
        `function a() { const store = Buffer.alloc(8); return store[0]; }
         function b(req, store) { return store[req.query.i]; }`,
        // Scoping: a buffer in one function must not make an unrelated
        // same-named local in another function a buffer. This is the shape that
        // produced 8 findings across two minified vendor bundles.
        `function a() { const buf = Buffer.alloc(8); return buf[0]; }
         function b(buf, n) { return buf.length + n; }`,
      ],
      invalid: [
        // Still reported: the index really does trace to the request.
        {
          code: `app.get('/b', (req, res) => { const buf = Buffer.alloc(64); res.end(buf[req.query.i]); });`,
          errors: [{ messageId: 'userControlledBufferIndex' }],
        },
        // Still reported: a negative literal index is an overread whatever else
        // is true, and the write/loop guards must not swallow it.
        {
          code: `const buf = Buffer.alloc(8); const x = buf[-1];`,
          errors: [{ messageId: 'negativeBufferIndex' }],
        },
        // FALSE NEGATIVE CLOSED: `subarray` is the non-deprecated spelling of
        // `slice` on a Buffer and returns a view over the SAME memory, so an
        // unvalidated offset reads exactly as far past the end. It was missing
        // from bufferMethods entirely, which meant a codebase that had followed
        // Node's own advice to migrate off `slice` lost the check.
        {
          code: `function read(buf, req) { return buf.subarray(req.query.start, req.query.end); }`,
          errors: [
            { messageId: 'unsafeBufferSlice' },
            { messageId: 'unsafeBufferSlice' },
          ],
        },
        // The deprecated spelling still reports, so the fix added a case rather
        // than moving one.
        {
          code: `function read(buf, req) { return buf.slice(req.query.start); }`,
          errors: [{ messageId: 'unsafeBufferSlice' }],
        },
      ],
    });
  });
});

/**
 * The four options no test had ever set, so their branches shipped unexecuted.
 *
 * Each is a PAIR on identical source: default verdict and configured verdict,
 * opposite to each other. A case that came out the same either way would
 * execute the line without proving the branch decides anything.
 */
describe('no-buffer-overread — options', () => {
  ruleTester.run('bufferTypes', noBufferOverread, {
    valid: [
      // CONTROL: `MyBuf` is not a known buffer constructor, so `b` is never
      // registered as a buffer and the indexed read is not judged.
      'const b = new MyBuf(8); const byte = b[offset];',
      // NARROWING: dropping `DataView` from the list stops the rule tracking
      // it — proof the option REPLACES the built-in constructor names.
      {
        code: 'const b = new DataView(x); const byte = b[offset];',
        options: [{ bufferTypes: ['Buffer'] }],
      },
    ],
    invalid: [
      // WIDENING: an in-house buffer wrapper, declared, makes the identical
      // first valid case report.
      {
        code: 'const b = new MyBuf(8); const byte = b[offset];',
        options: [{ bufferTypes: ['Buffer', 'Uint8Array', 'ArrayBuffer', 'DataView', 'MyBuf'] }],
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
      // CONTROL for narrowing: identical source, default constructor list.
      {
        code: 'const b = new DataView(x); const byte = b[offset];',
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
    ],
  });

  ruleTester.run('trustedSanitizers', noBufferOverread, {
    valid: [
      // The project's own clamp, named through the option, is accepted as a
      // bounds check.
      {
        code: 'const userIndex = clampToLength(raw); const byte = buffer[userIndex];',
        options: [{ trustedSanitizers: ['clampToLength'] }],
      },
    ],
    invalid: [
      // CONTROL: identical source, default list — `clampToLength` is not a
      // sanitizer the devkit knows, so the index is unvalidated.
      {
        code: 'const userIndex = clampToLength(raw); const byte = buffer[userIndex];',
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
      // A DIFFERENT helper is still unvalidated: the option names one function,
      // not a shape.
      {
        code: 'const userIndex = coerce(raw); const byte = buffer[userIndex];',
        options: [{ trustedSanitizers: ['clampToLength'] }],
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
      // A bare identifier index with no initializer at all — nothing to trace.
      {
        code: 'const byte = buffer[userIndex];',
        options: [{ trustedSanitizers: ['clampToLength'] }],
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
    ],
  });

  ruleTester.run('trustedSanitizers — shapes', noBufferOverread, {
    valid: [
      // A method call names the sanitizer through its property.
      {
        code: 'const userIndex = bounds.clampToLength(raw); const byte = buffer[userIndex];',
        options: [{ trustedSanitizers: ['clampToLength'] }],
      },
      // An offset argument to a buffer method, not an index expression.
      {
        code: 'const userOffset = bounds.clampToLength(raw); buffer.readUInt32LE(userOffset);',
        options: [{ trustedSanitizers: ['clampToLength'] }],
      },
      // A slice bound.
      {
        code: 'const buf = new Buffer(8); const userOffset = clampToLength(raw); buf.subarray(userOffset);',
        options: [{ trustedSanitizers: ['clampToLength'] }],
      },
    ],
    invalid: [
      // A MemberExpression index reaches the helper and is not an Identifier,
      // so there is no binding to trace — the option cannot exempt it.
      {
        code: 'const byte = buffer[req.query.offset];',
        options: [{ trustedSanitizers: ['clampToLength'] }],
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
      // A computed callee names nothing statically, so it is not the sanitizer.
      {
        code: 'const userIndex = helpers[kind](raw); const byte = buffer[userIndex];',
        options: [{ trustedSanitizers: ['clampToLength'] }],
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
      // The binding resolves to something that is not a call at all.
      {
        code: 'const userIndex = raw; const byte = buffer[userIndex];',
        options: [{ trustedSanitizers: ['clampToLength'] }],
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
    ],
  });

  /**
   * `reportUnvalidatedIndices` opens a SECOND report path, for indices that
   * carry no user-controlled name. The sanitizer exemption has to hold there
   * too — a project that turns on the sweep and names its own bounds helper
   * should not then be told its helper is not a bounds check.
   */
  ruleTester.run('trustedSanitizers — under reportUnvalidatedIndices', noBufferOverread, {
    valid: [
      {
        code: 'const idx = clampToLength(n); const byte = buffer[idx];',
        options: [{ reportUnvalidatedIndices: true, trustedSanitizers: ['clampToLength'] }],
      },
    ],
    invalid: [
      // CONTROL: identical source and sweep, without the helper named.
      {
        code: 'const idx = clampToLength(n); const byte = buffer[idx];',
        options: [{ reportUnvalidatedIndices: true }],
        errors: [{ messageId: 'unsafeBufferAccess' }],
      },
    ],
  });

  ruleTester.run('trustedAnnotations', noBufferOverread, {
    valid: [
      // A project-specific review marker suppresses the finding.
      {
        code: '/** @audited-bounds */\nconst byte = buffer[offset];',
        options: [{ trustedAnnotations: ['@audited-bounds'] }],
      },
    ],
    invalid: [
      // CONTROL: identical source, default annotations — `@audited-bounds` is
      // not one of them.
      {
        code: '/** @audited-bounds */\nconst byte = buffer[offset];',
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
    ],
  });

  ruleTester.run('strictMode', noBufferOverread, {
    valid: [
      // `@sanitized` is a built-in safe annotation, so by DEFAULT this is
      // silent. This is the control for the strictMode case below.
      '/** @sanitized */\nconst byte = buffer[offset];',
    ],
    invalid: [
      // `strictMode: true` makes `isSafe` return false unconditionally, so the
      // annotation stops being believed and the identical source reports. The
      // setting exists for an audit pass where "someone wrote @sanitized" is
      // not evidence anyone checked.
      {
        code: '/** @sanitized */\nconst byte = buffer[offset];',
        options: [{ strictMode: true }],
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
    ],
  });
});
