/**
 * Coverage-gap tests for no-buffer-overread.
 * Layer 1: bufferVars tracking (new Uint8Array / Buffer.from / name
 * pattern), taint-root MemberExpression walking, definition tracing
 * (member / type-conversion / identifier-chain inits), isIndexValidated
 * declarator walks (bounds fn, Math.min, non-validating inits),
 * hasBoundsCheck via Math.min declarations and return statements,
 * couldBeNegative unary-init destructuring, and @safe annotation skips for
 * all three report paths.
 * Layer 2: synthetic loc-less nodes for every `node.loc?.start.line ?? 0`
 * fallback plus the parser-unreachable "declarator init is a negative
 * Literal" branch (ESTree represents -1 as UnaryExpression, so only a
 * synthetic AST can produce it). Uses createWithMockContext from
 * @interlace/eslint-devkit.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { noBufferOverread } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

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

describe('no-buffer-overread coverage gaps', () => {
  ruleTester.run('no-buffer-overread', noBufferOverread, {
    valid: [
      // isIndexValidated: an index assigned from a declared bounds-check
      // function, and one assigned from Math.min — both validated, so the
      // branch is exercised in its suppressing direction.
      {
        code: 'const idx = validateIndex(buf[idx]);',
        options: [{ reportUnvalidatedIndices: true, boundsCheckFunctions: ['validateIndex'] }],
      },
      { code: 'const idx = Math.min(buf[idx], 3);', options: UNVALIDATED },
      // safetyChecker: an @safe block comment suppresses both report sites.
      { code: '/** @safe */\nbuf[cursor];', options: UNVALIDATED },
      { code: '/** @safe */\nbuf.readUInt8(req.query.off);' },
      // addBufferVar: a declarator whose binding cannot be resolved because the
      // name is redeclared, so no variable is registered.
      { code: 'var bufferData = Buffer.alloc(8); var bufferData = 1;' },
      // hasBoundsCheck: the index expression sits inside a declarator whose
      // initializer mentions both `buf.length` and Math.min.
      { code: 'const v = buf[Math.min(buf.length, n)];', options: UNVALIDATED },
      // isLoopBounded: an inclusive `<=` bound counts too.
      { code: 'for (let i = 0; i <= last; i++) { use(bytes[i]); }', options: [{}] },
      // isLoopBounded: a `for(;;)` has no test at all.
      { code: 'for (;;) { use(bytes[i]); }', options: [{}] },
      // isLoopBounded: a for-loop whose test is not a comparison at all, and
      // one whose comparison is on a different identifier.
      { code: 'for (let i = 0; flag; i++) { use(chunkBytes[i]); }', options: [{}] },
      { code: 'for (let i = 0; j < 4; i++) { use(bytes[i]); }', options: [{}] },
      // new Uint8Array tracked into bufferVars; literal index is validated
      { code: 'const data = new Uint8Array(4); const x = data[0];' },
      // Buffer.from tracked into bufferVars; literal index is validated
      { code: "const raw = Buffer.from('abc'); const y = raw[1];" },
      // Variable name containing a buffer type is tracked
      { code: 'const chunkBuffer = load();' },
      // Literal index on a conventional buffer parameter name
      { code: 'const v = buf[3];' },
      // Math.min declaration referencing buffer length is a bounds check
      { code: 'const safeVal = Math.min(buf.length, buf[cursor]);' },
      // Return statement referencing buffer length is a bounds check
      { code: 'function f3(buf, k) { return buf[k] + buf.length; }' },
      // Index assigned from a bounds-check function
      { code: 'const idx = validateIndex(buf[idx]);' },
      // Index assigned from Math.min
      { code: 'const off = Math.min(buf[off], 10);' },
      // @safe annotation skips the unsafe-access report
      { code: '// @safe\nbuf[cursor];' },
      // @safe annotation skips both slice and read-method reports
      { code: '// @safe\nbuf.slice(req.query.start);' },

      // ── Structural bounds checking and provenance (post-fix contract) ───
      // A `Math.min` binding IS resolved now, so the index is validated. This
      // was asserted as `unsafeBufferAccess` — a "known limitation" produced by
      // an `isIndexValidated` that walked the index's ancestors looking for a
      // declarator it can never be inside.
      {
        code: 'function f() { const cap = Math.min(buf.length, n); return buf[cap]; }',
        options: UNVALIDATED,
      },
      // A ROOT whose only claim to being input is its spelling. Both of these
      // were `invalid` fixtures; neither file contains a request.
      { code: 'const b = buf[userData.pos];' },
      { code: 'function h2() { const pos = settings.userLimit; return buf[pos]; }' },
      // `couldBeNegative` used to walk the index's ANCESTORS and attribute the
      // enclosing declarator's initializer to it: here `-5` initializes `a`,
      // and has nothing whatever to do with `k`.
      { code: 'const { [buf[k]]: a } = -5;' },

      // isIndexValidated: a PARAMETER's value is decided by a caller this rule
      // does not follow, so it is not reported — here the index is a request
      // root, which is as tainted as an identifier gets.
      { code: 'function f(req) { return buf[req]; }' },
      { code: 'function f(buf, i) { return buf[i]; }', options: UNVALIDATED },

      // hasBoundsCheck: the length may sit on EITHER side of the comparison…
      {
        code: 'function f(req) { const at = Number(req.query.at); if (buf.length > at) { return buf[at]; } }',
      },
      // …and the index may be wrapped in arithmetic or a coercion.
      {
        code: 'function f(req) { const at = Number(req.query.at); if (at + 4 <= buf.length) { return buf[at]; } }',
      },
      {
        code: 'function f(req) { const at = req.query.at; if (Number(at) < buf.length) { return buf[at]; } }',
      },

      // constantNumber: a unary `+`, a `const` folded addition, an operator it
      // does not model, and an operand it cannot resolve. None is negative.
      { code: 'const p = +1; const v = buf[p];' },
      { code: 'const s = 1 + 2; const v = buf[s];' },
      { code: 'const t = 4 * 2; const v = buf[t];' },
      { code: 'const u = ~1; const v = buf[u];' },
      { code: 'let z = -1; const v = buf[z];' },
      { code: 'const w = unknownThing; const v = buf[w];' },
      // A unary over something unresolvable resolves to nothing.
      { code: 'const p2 = -unknownThing; const v = buf[p2];' },
      // …and a `const` chain deeper than the cap terminates instead of looping.
      {
        code: 'const a1 = -a2, a2 = -a3, a3 = -a4, a4 = -a5, a5 = -1; const v = buf[a1];',
      },
      // hasBoundsCheck: the index sits on the RIGHT of the guard's arithmetic.
      {
        code: 'function f(req) { const at = Number(req.query.at); if (buf.length >= 4 + at) { return buf[at]; } }',
      },
    ],
    invalid: [
      // ── isIndexValidated / hasBoundsCheck arms ─────────────────────────
      // These live behind `reportUnvalidatedIndices` now, so each is driven
      // through the restoring option.
      //
      // A non-negative numeric literal index is validated by inspection.
      { code: 'buf[5]; buf[req.query.i];', options: UNVALIDATED, errors: [{ messageId: 'userControlledBufferIndex' }] },
      // The index expression IS a direct call to a bounds-check function.
      {
        code: 'buf[validateIndex(n)]; buf[other];',
        options: [{ reportUnvalidatedIndices: true, boundsCheckFunctions: ['validateIndex'] }],
        errors: [{ messageId: 'unsafeBufferAccess' }],
      },
      // safetyChecker short-circuits on an @safe annotation, so the guarded
      // report path is exercised in both directions.
      {
        code: 'buf[cursor];',
        options: UNVALIDATED,
        errors: [{ messageId: 'unsafeBufferAccess' }],
      },
      // Taint-root walk: req.* member index
      {
        code: 'buf[req.query.idx];',
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
      // Member index text containing a taint keyword segment
      {
        code: 'buf[obj.query.pos];',
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
      // Member index with no taint markers → generic unsafe access
      {
        code: 'buf[cfg.data.pos];',
        options: UNVALIDATED,
        errors: [{ messageId: 'unsafeBufferAccess' }],
      },
      // Member index rooted at `this` (walker not an Identifier)
      {
        code: 'function m() { return buf[this.offset]; }',
        options: UNVALIDATED,
        errors: [{ messageId: 'unsafeBufferAccess' }],
      },
      // Definition trace: init MemberExpression with taint object text
      {
        code: 'function h(req) { const pos = req.body.index; return buf[pos]; }',
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
      // Definition trace: member init without taint markers
      {
        code: 'function h3() { const pos = cfg.max; return buf[pos]; }',
        options: UNVALIDATED,
        errors: [{ messageId: 'unsafeBufferAccess' }],
      },
      // Definition trace: type conversion of a tainted argument
      {
        code: 'const pos = Number(req.query.i); buf[pos];',
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
      // Definition trace: type conversion with no arguments
      {
        code: 'const pos = parseInt(); buf[pos];',
        options: UNVALIDATED,
        errors: [{ messageId: 'unsafeBufferAccess' }],
      },
      // Definition trace: non-conversion call init
      {
        code: 'const pos = compute(); buf[pos];',
        options: UNVALIDATED,
        errors: [{ messageId: 'unsafeBufferAccess' }],
      },
      // Definition trace: identifier chain back to a tainted member
      {
        code: 'const rawIdx = req.body.i; const pos = rawIdx; buf[pos];',
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
      // Definition trace: self-referential init identifier is not recursed
      {
        code: 'var pos = pos; buf[pos];',
        options: UNVALIDATED,
        errors: [{ messageId: 'unsafeBufferAccess' }],
      },
      // Direct index call: type conversion of tainted argument
      {
        code: 'buf[Number(req.query.i)];',
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
      // Direct index call: type conversion of untainted argument
      {
        code: 'buf[Number(five)];',
        options: UNVALIDATED,
        errors: [{ messageId: 'unsafeBufferAccess' }],
      },
      // Direct index call: member callee is not a conversion function
      {
        code: 'buf[obj.next()];',
        options: UNVALIDATED,
        errors: [{ messageId: 'unsafeBufferAccess' }],
      },
      // Unvalidated slice with tainted args: slice + read-method reports
      {
        // One site, one finding: the slice handler owns the view methods, so
        // `missingBoundsCheck` no longer fires alongside `unsafeBufferSlice`.
        code: 'buf.slice(req.query.start);',
        errors: [{ messageId: 'unsafeBufferSlice' }],
      },
      // isIndexValidated declarator walk: non-validating identifier callee
      {
        code: 'const idx = pickIdx(buf[idx]);',
        options: UNVALIDATED,
        errors: [{ messageId: 'unsafeBufferAccess' }],
      },
      // isIndexValidated declarator walk: member callee not Math.min/max
      {
        code: 'const idx = helper.clamp(buf[idx]);',
        options: UNVALIDATED,
        errors: [{ messageId: 'unsafeBufferAccess' }],
      },
      // isIndexValidated declarator walk: Math method that is not min/max
      {
        code: 'const idx = Math.abs(buf[idx]);',
        options: UNVALIDATED,
        errors: [{ messageId: 'unsafeBufferAccess' }],
      },
      // Return statement without a length reference is not a bounds check
      {
        code: 'function f4(buf) { return buf[q]; }',
        options: UNVALIDATED,
        errors: [{ messageId: 'unsafeBufferAccess' }],
      },
      // Enclosing if without any buffer-length reference
      {
        code: 'if (ready) { use(buf[cursor]); }',
        options: UNVALIDATED,
        errors: [{ messageId: 'unsafeBufferAccess' }],
      },
      // Enclosing if referencing buffer length without comparison operators
      {
        code: 'if (checkLen(buf.length)) { use(buf[cursor]); }',
        options: UNVALIDATED,
        errors: [{ messageId: 'unsafeBufferAccess' }],
      },
      // Declaration list with an init-less declarator ahead of the access
      {
        code: 'let hold, out = wrap(buf[cursor]);',
        options: UNVALIDATED,
        errors: [{ messageId: 'unsafeBufferAccess' }],
      },
      // Declaration referencing buffer length without Math.min/max
      {
        code: 'const total = buf.length + extra, out2 = wrap2(buf[cursor]);',
        options: UNVALIDATED,
        errors: [{ messageId: 'unsafeBufferAccess' }],
      },
      // A MENTION of `buf.length` is not a bounds check. The old test rendered
      // the enclosing return statement with `sourceCode.getText` and asked
      // whether the string contained "buf.length" — which a comment, a string
      // literal or an `&&` guard all satisfy.
      {
        code: 'function f() { return buf.length && buf[cursor]; }',
        options: UNVALIDATED,
        errors: [{ messageId: 'unsafeBufferAccess' }],
      },
      // A comparison against a DIFFERENT buffer's length is not a check on this
      // one, however the text prints.
      {
        code: 'function f(req) { const at = Number(req.query.at); if (at < other.length) { return buf[at]; } }',
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
      // A guard on a DIFFERENT index is not a guard on this one.
      {
        code: 'function f(req) { const at = Number(req.query.at); if (other < buf.length) { return buf[at]; } }',
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
      // The index is a MemberExpression, so there is no binding to look for in
      // the guard at all.
      {
        code: 'function f(req) { if (n < buf.length) { return buf[req.query.i]; } }',
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
    ],
  });

  describe('Layer 2: synthetic nodes via mock context', () => {
    type Listener = (n: unknown) => void;

    it('registers no buffer variable when the binding cannot be resolved', () => {
      // The mock sourceCode has no real scope analysis, so `findVariable`
      // returns null and `addBufferVar` must decline rather than throw.
      const { listeners, reports } = createWithMockContext(noBufferOverread);
      (listeners.VariableDeclarator as Listener)({
        type: 'VariableDeclarator',
        id: { type: 'Identifier', name: 'payloadBuffer' },
        init: {
          type: 'CallExpression',
          callee: {
            type: 'MemberExpression',
            object: { type: 'Identifier', name: 'Buffer' },
            property: { type: 'Identifier', name: 'alloc' },
          },
          arguments: [],
        },
      });
      expect(reports).toHaveLength(0);
    });

    it('reports a negative literal index with line 0 when loc is absent', () => {
      const { listeners, reports } = createWithMockContext(noBufferOverread);
      (listeners.MemberExpression as Listener)({
        type: 'MemberExpression',
        computed: true,
        object: { type: 'Identifier', name: 'buf' },
        property: { type: 'Literal', value: -1 },
      });
      expect(reports).toHaveLength(1);
      expect(reports[0]).toMatchObject({
        messageId: 'negativeBufferIndex',
        data: { line: '0' },
      });
    });

    // A test asserting that a declarator ANCESTOR's negative initializer makes
    // the index negative used to sit here. It pinned a real defect —
    // `const { [buf[k]]: a } = -5` has nothing negative about `k` — and the
    // branch it covered no longer exists.

    it('reports a user-controlled member index with line 0 when loc is absent', () => {
      const { listeners, reports } = createWithMockContext(noBufferOverread);
      const index: Record<string, unknown> = {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: 'req' },
        property: { type: 'Identifier', name: 'idx' },
      };
      const access: Record<string, unknown> = {
        type: 'MemberExpression',
        computed: true,
        object: { type: 'Identifier', name: 'buf' },
        property: index,
        parent: undefined,
      };
      index.parent = access;
      (listeners.MemberExpression as Listener)(access);
      expect(reports).toHaveLength(1);
      expect(reports[0]).toMatchObject({
        messageId: 'userControlledBufferIndex',
        data: { line: '0' },
      });
    });

    it('reports an unsafe plain-identifier index with line 0 when loc is absent', () => {
      // The synthetic node has no scope, so nothing traces the index to input;
      // this case is about the loc fallback, not the classification.
      const { listeners, reports } = createWithMockContext(noBufferOverread, {
        options: [{ reportUnvalidatedIndices: true }],
      } as never);
      (listeners.MemberExpression as Listener)({
        type: 'MemberExpression',
        computed: true,
        object: { type: 'Identifier', name: 'buf' },
        property: { type: 'Identifier', name: 'i' },
      });
      expect(reports).toHaveLength(1);
      expect(reports[0]).toMatchObject({
        messageId: 'unsafeBufferAccess',
        data: { line: '0' },
      });
    });

    it('reports slice and read-method taint with line 0 when loc is absent', () => {
      const { listeners, reports } = createWithMockContext(noBufferOverread);
      const arg: Record<string, unknown> = {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: 'req' },
        property: { type: 'Identifier', name: 'start' },
        parent: undefined,
      };
      (listeners.CallExpression as Listener)({
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          object: { type: 'Identifier', name: 'buf' },
          property: { type: 'Identifier', name: 'slice' },
        },
        arguments: [arg],
      });
      expect(reports).toHaveLength(1);
      expect(reports[0]).toMatchObject({
        messageId: 'unsafeBufferSlice',
        data: { line: '0' },
      });

      // A non-view read method still reaches the generic handler.
      (listeners.CallExpression as Listener)({
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          object: { type: 'Identifier', name: 'buf' },
          property: { type: 'Identifier', name: 'readUInt8' },
        },
        arguments: [arg],
      });
      expect(reports).toHaveLength(2);
      expect(reports[1]).toMatchObject({
        messageId: 'missingBoundsCheck',
        data: { line: '0' },
      });
    });
  });
});
