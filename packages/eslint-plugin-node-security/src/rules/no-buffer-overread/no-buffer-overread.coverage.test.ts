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
      // hasBoundsCheck: a return statement mentioning buf.length.
      { code: 'function f() { return buf.length && buf[cursor]; }', options: UNVALIDATED },
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
      // hasBoundsCheck: a declarator initialised from Math.min over buf.length.
      {
        code: 'function f() { const cap = Math.min(buf.length, n); return buf[cap]; }',
        options: UNVALIDATED,
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
      // Taint-root walk: root name containing a user keyword
      {
        code: 'buf[userData.pos];',
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
      // Definition trace: taint keyword in the property text
      {
        code: 'function h2() { const pos = settings.userLimit; return buf[pos]; }',
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
      // couldBeNegative: declarator ancestor with unary-negative init
      {
        code: 'const { [buf[k]]: a } = -5;',
        errors: [{ messageId: 'negativeBufferIndex' }],
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

    it('detects a declarator whose init is a negative Literal (parser-unreachable)', () => {
      const { listeners, reports } = createWithMockContext(noBufferOverread);
      const index: Record<string, unknown> = {
        type: 'Identifier',
        name: 'i',
      };
      const access: Record<string, unknown> = {
        type: 'MemberExpression',
        computed: true,
        object: { type: 'Identifier', name: 'buf' },
        property: index,
        parent: {
          type: 'VariableDeclarator',
          init: { type: 'Literal', value: -1 },
          parent: undefined,
        },
      };
      index.parent = access;
      (listeners.MemberExpression as Listener)(access);
      expect(reports).toHaveLength(1);
      expect(reports[0]).toMatchObject({ messageId: 'negativeBufferIndex' });
    });

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
