/**
 * Comprehensive tests for no-buffer-overread rule
 * Security: CWE-126 (Buffer Access with Incorrect Length Value)
 *
 * ── A NOTE ON WHAT CHANGED HERE ──────────────────────────────────────────
 *
 * Most of the `invalid` cases in this file used to read like this:
 *
 * ```ts
 * // buffer[userInput] — 'userInput' contains 'user' and 'input' which are
 * // user-controlled keywords
 * { code: 'const byte = buffer[userInput];', errors: [{ messageId: 'userControlledBufferIndex' }] }
 * { code: 'const value = buffer[offset];',   errors: [{ messageId: 'userControlledBufferIndex' }] }
 * ```
 *
 * `userInput` and `offset` are undeclared globals. Nothing in either file is a
 * request, a socket or a parameter — the finding was produced entirely by the
 * SPELLING of the index, and the comments said so. Those were lock tests
 * pinning the rule's largest false-positive class, and the corpus at
 * `benchmarks/rule-corpus/node-security__no-buffer-overread/safe/05,06,07`
 * demonstrates the cost: `const offset = 4; MAGIC[offset - 1]` was reported.
 *
 * Every one of them is now written with the value it was pretending to be —
 * something that actually traces to a request — so the same structural point
 * is made by evidence instead of by a word list. The name-only shapes have
 * moved to `valid`, where they belong.
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
          name: 'the index is range-checked first',
          code: 'function f(req) { const index = Number(req.query.i); if (index >= 0 && index < buffer.length) { const byte = buffer[index]; } }',
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

  // ── A NAME IS NOT EVIDENCE ─────────────────────────────────────────────
  //
  // Every case here was an `invalid` fixture in this file, reported because an
  // identifier was SPELLED like input. There is no request, no socket and no
  // parameter in any of them.
  describe('Name Is Not Evidence', () => {
    ruleTester.run('spelling alone is not user control', noBufferOverread, {
      valid: [
        'const byte = buffer[userInput];',
        'const value = buffer[offset];',
        'buffer.readUInt32LE(userOffset);',
        'buffer.writeUInt16LE(value, userOffset);',
        'buffer.copy(targetBuffer, userOffset);',
        'buffer.slice(userOffset);',
        'const byte = buffer[userIndex];',
        // …including through a local alias and an unresolvable helper.
        'const userIndex = raw; const byte = buffer[userIndex];',
        'const userIndex = coerce(raw); const byte = buffer[userIndex];',
        // benchmarks/rule-corpus/…/safe/05 — a `const` bound to a literal.
        'const MAGIC = Buffer.from("7f454c46", "hex"); const offset = 4; const b = MAGIC[offset - 1];',
        // benchmarks/rule-corpus/…/safe/06 — named protocol offsets.
        'const LAYOUT = Buffer.from([1, 0]); const VERSION_INDEX = 0; const v = LAYOUT[VERSION_INDEX];',
        // benchmarks/rule-corpus/…/safe/07 and /13 — an ARRAY whose name
        // contains "buffer". An out-of-range array read is `undefined`, not a
        // disclosure of adjacent memory, so CWE-126 does not apply.
        'function page(req, rows) { const rowBuffer = rows.map((r) => r.id); return rowBuffer[Number(req.query.page)]; }',
        'function j(lines) { const lineBuffer = lines.map(String); return lineBuffer[lineBuffer.length - 1]; }',
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Unsafe Buffer Access', () => {
    ruleTester.run('invalid - unsafe buffer access patterns', noBufferOverread, {
      valid: [],
      invalid: [
        // The index traces to the request body.
        {
          name: 'a buffer index taken from the request body with no bounds check',
          code: 'function h(req) { return buffer[req.body.slot]; }',
          errors: [{ messageId: 'userControlledBufferIndex' }],
        },
        // …and through one intermediate `const`.
        {
          code: 'function h(req) { const at = Number(req.query.at); return buffer[at]; }',
          errors: [{ messageId: 'userControlledBufferIndex' }],
        },
      ],
    });
  });

  describe('Invalid Code - Negative Indices', () => {
    ruleTester.run('invalid - negative buffer indices', noBufferOverread, {
      valid: [
        // A subtraction whose value cannot be resolved is NOT proof of a
        // negative index. "Conservative: assume it could be negative" is proof
        // by ignorance on a reporting path.
        'const value = buffer[n - 10];',
      ],
      invalid: [
        // Literal negative index
        {
          code: 'const byte = buffer[-1];',
          errors: [{ messageId: 'negativeBufferIndex' }],
        },
        // A `const` that resolves to a negative number.
        {
          code: 'const back = -5; const byte = buffer[back];',
          errors: [{ messageId: 'negativeBufferIndex' }],
        },
        // A subtraction whose operands both resolve, and which is negative.
        {
          code: 'const base = 2; const byte = buffer[base - 10];',
          errors: [{ messageId: 'negativeBufferIndex' }],
        },
      ],
    });
  });

  describe('Invalid Code - Missing Bounds Checks', () => {
    ruleTester.run('invalid - missing bounds validation', noBufferOverread, {
      valid: [],
      invalid: [
        {
          code: 'function h(req) { buffer.readUInt32LE(Number(req.query.at)); }',
          errors: [{ messageId: 'missingBoundsCheck' }],
        },
        {
          code: 'function h(req) { buffer.writeUInt16LE(value, Number(req.query.at)); }',
          errors: [{ messageId: 'missingBoundsCheck' }],
        },
        // FALSE NEGATIVE CLOSED: network byte order is BIG-endian, and every
        // `*BE` reader was absent from the method list.
        // benchmarks/rule-corpus/…/vulnerable/11-big-endian-64-read.js
        {
          code: 'function h(req) { return buffer.readBigUInt64BE(Number(req.params.entry)); }',
          errors: [{ messageId: 'missingBoundsCheck' }],
        },
        {
          code: 'function h(req) { return buffer.readUInt16BE(Number(req.query.at)); }',
          errors: [{ messageId: 'missingBoundsCheck' }],
        },
      ],
    });
  });

  describe('Invalid Code - Buffer Operations', () => {
    ruleTester.run('invalid - unsafe buffer operations', noBufferOverread, {
      valid: [],
      invalid: [
        // copy with a request-controlled offset
        {
          code: 'function h(req) { buffer.copy(targetBuffer, Number(req.query.at)); }',
          errors: [{ messageId: 'missingBoundsCheck' }],
        },
        {
          // One site, one finding — the slice handler owns the view methods.
          code: 'function h(req) { buffer.slice(Number(req.query.at)); }',
          errors: [{ messageId: 'unsafeBufferSlice' }],
        },
      ],
    });
  });

  describe('Valid Code - False Positives Reduced', () => {
    ruleTester.run('valid - false positives reduced', noBufferOverread, {
      valid: [
        // Safe annotations, on a genuinely tainted index — so the annotation is
        // doing the suppressing rather than the absence of evidence.
        {
          code: `
            function h(req) {
              /** @safe */
              const byte = buffer[req.query.i];
              return byte;
            }
          `,
        },
        // Safe Math.max/min patterns
        {
          code: `
            function h(req) {
              const start = Math.max(0, Number(req.query.start));
              const end = Math.min(buffer.length, Number(req.query.end));
              return buffer.slice(start, end);
            }
          `,
        },
        // Literal indices for slice
        {
          code: 'const header = buffer.slice(0, 4);',
        },
        // Non-buffer variable name (doesn't match buffer pattern)
        {
          code: 'function h(req) { return data[req.query.i]; }',
        },
        // The remediation: a guard comparing THIS offset against the buffer's
        // own length. benchmarks/rule-corpus/…/safe/02
        {
          code: `
            const index = Buffer.alloc(1024);
            function readSlot(req) {
              const at = Number(req.headers['x-slot-offset']);
              if (!Number.isInteger(at) || at < 0 || at + 4 > index.length) return null;
              return index.readUInt32BE(at);
            }
          `,
        },
      ],
      invalid: [
        // …and the guard has to be on the RIGHT variable. Here `end` is checked
        // and `start` is the one that indexes.
        // benchmarks/rule-corpus/…/vulnerable/05-guard-on-the-wrong-variable.js
        {
          code: `
            const record = Buffer.alloc(512);
            function slice(req) {
              const start = Number(req.query.start);
              const end = Number(req.query.end);
              if (end > record.length) throw new RangeError('end');
              return record.slice(start, end);
            }
          `,
          errors: [{ messageId: 'unsafeBufferSlice' }],
        },
      ],
    });
  });

  describe('Configuration Options', () => {
    ruleTester.run('config - custom buffer methods', noBufferOverread, {
      valid: [
        // Non-default method name - won't trigger
        {
          code: 'function h(req) { buffer.customRead(Number(req.query.at)); }',
        },
      ],
      invalid: [
        // Custom method in config - now triggers
        {
          code: 'function h(req) { buffer.customRead(Number(req.query.at)); }',
          options: [{ bufferMethods: ['customRead'] }],
          errors: [{ messageId: 'missingBoundsCheck' }],
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
          code: 'function h(req) { return buffer[checkBounds(req.query.i)]; }',
          options: [{ boundsCheckFunctions: ['checkBounds'] }],
        },
        // FIXED, was asserted as a "Known Limitation": the index is bound to a
        // declared bounds-check function. The old `isIndexValidated` walked the
        // index's ANCESTORS looking for its own declarator, which a use site is
        // never inside, so the binding was never read.
        {
          code: 'const idx = validateIndex(userIndex); const val = buffer[idx];',
          options: [{ reportUnvalidatedIndices: true, boundsCheckFunctions: ['validateIndex'] }],
        },
        // The same, through `Math.min` — the clamp idiom.
        {
          code: 'const safeIdx = Math.min(buffer.length - 1, userIndex); const val = buffer[safeIdx];',
          options: UNVALIDATED,
        },
        // A clamp against the buffer's own length, request-derived input.
        // benchmarks/rule-corpus/…/safe/04
        {
          code: `
            const archive = Buffer.alloc(8192);
            function preview(req) {
              const safeEnd = Math.min(Number(req.query.bytes), archive.length);
              return archive.subarray(0, safeEnd);
            }
          `,
        },
      ],
      invalid: [
        // The sweep still reports an index it cannot resolve at all.
        {
          code: 'const idx = pickIndex(); const val = buffer[idx];',
          options: UNVALIDATED,
          errors: [{ messageId: 'unsafeBufferAccess' }],
        },
      ],
    });

    ruleTester.run('bounds checks are read structurally', noBufferOverread, {
      valid: [],
      invalid: [
        // A `Math.min` STATEMENT elsewhere in the function bounds `limit`, not
        // `index`. The old check rendered the surrounding text and looked for
        // the substring "buffer.length", so any nearby mention satisfied it.
        {
          code: `
            function h(req) {
              const index = Number(req.query.i);
              const limit = Math.min(index, buffer.length);
              return buffer[index];
            }
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
        // A variable assigned a negative literal now resolves, so the finding
        // names the weakness instead of falling through to the sweep.
        {
          code: 'const neg = -5; buffer[neg];',
          options: UNVALIDATED,
          errors: [{ messageId: 'negativeBufferIndex' }],
        },
        {
          code: 'const n = -1; buffer[n];',
          options: UNVALIDATED,
          errors: [{ messageId: 'negativeBufferIndex' }],
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
        // One tainted offset, two sites: the computed read and the method read.
        {
          code: 'function h(req) { const at = Number(req.query.at); const byte = buffer[at]; return buffer.readUInt32LE(at); }',
          errors: [
            { messageId: 'userControlledBufferIndex' },
            { messageId: 'missingBoundsCheck' },
          ],
        },
        // Multiple unsafe accesses
        {
          code: 'function h(req) { buffer.readUInt16LE(Number(req.query.a)); buffer.readUInt32LE(Number(req.query.b)); }',
          errors: [
            { messageId: 'missingBoundsCheck' },
            { messageId: 'missingBoundsCheck' },
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
        // The loop-bound guard, isolated.
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
        // `readFileSync` WITH an encoding returns a string, not a Buffer, so
        // the argument shape decides rather than the callee's name.
        `const text = readFileSync('/x', 'utf8');
         function h(req) { return text.slice(Number(req.query.start)); }`,
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
        // unvalidated offset reads exactly as far past the end.
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
        // FALSE NEGATIVE CLOSED: `fs.readFileSync(path)` with no encoding
        // returns a Buffer, and it is the commonest way one enters a program.
        // benchmarks/rule-corpus/…/vulnerable/01-express-slice-from-query.js
        {
          code: `const blob = readFileSync('/var/lib/app/blob.bin');
                 function h(req) { return blob.slice(Number(req.query.start)); }`,
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
  /**
   * `untrustedSources` — the request-root vocabulary, made overridable.
   *
   * The list `['req', 'request', 'event', 'ctx', 'context']` is not a protocol
   * surface: `event`, `ctx` and `context` are ordinary words, and the list sits
   * on the REPORTING path — it is what makes an index attacker-steerable. A Koa
   * app that spells the request `koaCtx` had no way to be seen, and a program
   * whose `context` is a canvas context had no way to be left alone.
   */
  ruleTester.run('untrustedSources', noBufferOverread, {
    valid: [
      // CONTROL: `koaCtx` is not a default root, so the identical shape below
      // is silent out of the box. This pins the DEFAULT.
      'function h(koaCtx, bytes) { const i = koaCtx; return bytes[i]; }',
      // NARROWING: emptying the list stops root-based taint entirely, so the
      // `req` case that reports by default (see `invalid`) goes quiet.
      {
        code: 'function h(req, bytes) { const i = req; return bytes[i]; }',
        options: [{ untrustedSources: [] }],
      },
    ],
    invalid: [
      // WIDENING: naming the Koa spelling makes the first valid case report.
      {
        code: 'function h(koaCtx, bytes) { const i = koaCtx; return bytes[i]; }',
        options: [{ untrustedSources: ['koaCtx'] }],
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
      // CONTROL for narrowing: identical source, default roots.
      {
        code: 'function h(req, bytes) { const i = req; return bytes[i]; }',
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
    ],
  });

  /**
   * `bufferParameterNames` — the "this parameter is a Buffer" convention.
   *
   * A parameter's type is invisible to this file, so the rule falls back to the
   * spelling. That fallback decides a HIGH finding, and `bytes` is a word a
   * codebase may perfectly well use for a count.
   */
  ruleTester.run('bufferParameterNames', noBufferOverread, {
    valid: [
      // CONTROL: `payload` is not a conventional buffer name, so the identical
      // shape below is silent out of the box. This pins the DEFAULT.
      'function h(req, payload) { return payload[req.query.i]; }',
      // NARROWING: emptying the list drops the convention, so the `bytes` case
      // that reports by default (see `invalid`) goes quiet.
      {
        code: 'function h(req, bytes) { return bytes[req.query.i]; }',
        options: [{ bufferParameterNames: [] }],
      },
    ],
    invalid: [
      // WIDENING: an in-house spelling makes the first valid case report.
      {
        code: 'function h(req, payload) { return payload[req.query.i]; }',
        options: [{ bufferParameterNames: ['payload'] }],
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
      // CONTROL for narrowing: identical source, default convention list.
      {
        code: 'function h(req, bytes) { return bytes[req.query.i]; }',
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
    ],
  });

  ruleTester.run('bufferTypes', noBufferOverread, {
    valid: [
      // CONTROL: `MyBuf` is not a known buffer constructor, so `b` is never
      // registered as a buffer and the indexed read is not judged.
      'function h(req) { const b = new MyBuf(8); return b[req.query.i]; }',
      // NARROWING: dropping `DataView` from the list stops the rule tracking
      // it — proof the option REPLACES the built-in constructor names.
      {
        code: 'function h(req) { const b = new DataView(x); return b[req.query.i]; }',
        options: [{ bufferTypes: ['Buffer'] }],
      },
    ],
    invalid: [
      // WIDENING: an in-house buffer wrapper, declared, makes the identical
      // first valid case report.
      {
        code: 'function h(req) { const b = new MyBuf(8); return b[req.query.i]; }',
        options: [{ bufferTypes: ['Buffer', 'Uint8Array', 'ArrayBuffer', 'DataView', 'MyBuf'] }],
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
      // CONTROL for narrowing: identical source, default constructor list.
      {
        code: 'function h(req) { const b = new DataView(x); return b[req.query.i]; }',
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
    ],
  });

  ruleTester.run('trustedSanitizers', noBufferOverread, {
    valid: [
      // The project's own clamp, named through the option, is accepted as a
      // bounds check.
      {
        code: 'function h(req) { const idx = clampToLength(req.query.i); return buffer[idx]; }',
        options: [{ trustedSanitizers: ['clampToLength'] }],
      },
    ],
    invalid: [
      // CONTROL: identical source, default list — `clampToLength` is not a
      // sanitizer the devkit knows, so the index is unvalidated.
      {
        code: 'function h(req) { const idx = clampToLength(req.query.i); return buffer[idx]; }',
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
      // A DIFFERENT helper is still unvalidated: the option names one function,
      // not a shape.
      {
        code: 'function h(req) { const idx = coerce(req.query.i); return buffer[idx]; }',
        options: [{ trustedSanitizers: ['clampToLength'] }],
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
      // A bare identifier bound straight to the request — nothing sanitized it.
      {
        code: 'function h(req) { const idx = req.query.i; return buffer[idx]; }',
        options: [{ trustedSanitizers: ['clampToLength'] }],
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
    ],
  });

  ruleTester.run('trustedSanitizers — shapes', noBufferOverread, {
    valid: [
      // A method call names the sanitizer through its property.
      {
        code: 'function h(req) { const idx = bounds.clampToLength(req.query.i); return buffer[idx]; }',
        options: [{ trustedSanitizers: ['clampToLength'] }],
      },
      // An offset argument to a buffer method, not an index expression.
      {
        code: 'function h(req) { const off = bounds.clampToLength(req.query.i); buffer.readUInt32LE(off); }',
        options: [{ trustedSanitizers: ['clampToLength'] }],
      },
      // A slice bound.
      {
        code: 'function h(req) { const buf = Buffer.alloc(8); const off = clampToLength(req.query.i); return buf.subarray(off); }',
        options: [{ trustedSanitizers: ['clampToLength'] }],
      },
    ],
    invalid: [
      // A MemberExpression index reaches the helper and is not an Identifier,
      // so there is no binding to trace — the option cannot exempt it.
      {
        code: 'function h(req) { return buffer[req.query.offset]; }',
        options: [{ trustedSanitizers: ['clampToLength'] }],
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
      // A computed callee names nothing statically, so it is not the sanitizer.
      {
        code: 'function h(req) { const idx = helpers[kind](req.query.i); return buffer[idx]; }',
        options: [{ trustedSanitizers: ['clampToLength'] }],
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
      // The binding resolves to something that is not a call at all.
      {
        code: 'function h(req) { const raw = req.query.i; const idx = raw; return buffer[idx]; }',
        options: [{ trustedSanitizers: ['clampToLength'] }],
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
    ],
  });

  /**
   * `reportUnvalidatedIndices` opens a SECOND report path, for indices that
   * carry no evidence of user control at all. The sanitizer exemption has to
   * hold there too — a project that turns on the sweep and names its own bounds
   * helper should not then be told its helper is not a bounds check.
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
        code: 'function h(req) {\n/** @audited-bounds */\nreturn buffer[req.query.i];\n}',
        options: [{ trustedAnnotations: ['@audited-bounds'] }],
      },
    ],
    invalid: [
      // CONTROL: identical source, default annotations — `@audited-bounds` is
      // not one of them.
      {
        code: 'function h(req) {\n/** @audited-bounds */\nreturn buffer[req.query.i];\n}',
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
    ],
  });

  ruleTester.run('strictMode', noBufferOverread, {
    valid: [
      // `@sanitized` is a built-in safe annotation, so by DEFAULT this is
      // silent. This is the control for the strictMode case below.
      'function h(req) {\n/** @sanitized */\nreturn buffer[req.query.i];\n}',
    ],
    invalid: [
      // `strictMode: true` makes `isSafe` return false unconditionally, so the
      // annotation stops being believed and the identical source reports. The
      // setting exists for an audit pass where "someone wrote @sanitized" is
      // not evidence anyone checked.
      {
        code: 'function h(req) {\n/** @sanitized */\nreturn buffer[req.query.i];\n}',
        options: [{ strictMode: true }],
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
    ],
  });
});
