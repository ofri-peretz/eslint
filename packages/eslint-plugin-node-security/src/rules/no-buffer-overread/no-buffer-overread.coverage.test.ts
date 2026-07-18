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

describe('no-buffer-overread coverage gaps', () => {
  ruleTester.run('no-buffer-overread', noBufferOverread, {
    valid: [
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
        errors: [{ messageId: 'unsafeBufferAccess' }],
      },
      // Member index rooted at `this` (walker not an Identifier)
      {
        code: 'function m() { return buf[this.offset]; }',
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
        errors: [{ messageId: 'unsafeBufferAccess' }],
      },
      // Definition trace: non-conversion call init
      {
        code: 'const pos = compute(); buf[pos];',
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
        errors: [{ messageId: 'unsafeBufferAccess' }],
      },
      // Direct index call: member callee is not a conversion function
      {
        code: 'buf[obj.next()];',
        errors: [{ messageId: 'unsafeBufferAccess' }],
      },
      // Unvalidated slice with tainted args: slice + read-method reports
      {
        code: 'buf.slice(req.query.start);',
        errors: [
          { messageId: 'unsafeBufferSlice' },
          { messageId: 'missingBoundsCheck' },
        ],
      },
      // isIndexValidated declarator walk: non-validating identifier callee
      {
        code: 'const idx = pickIdx(buf[idx]);',
        errors: [{ messageId: 'unsafeBufferAccess' }],
      },
      // isIndexValidated declarator walk: member callee not Math.min/max
      {
        code: 'const idx = helper.clamp(buf[idx]);',
        errors: [{ messageId: 'unsafeBufferAccess' }],
      },
      // isIndexValidated declarator walk: Math method that is not min/max
      {
        code: 'const idx = Math.abs(buf[idx]);',
        errors: [{ messageId: 'unsafeBufferAccess' }],
      },
      // Return statement without a length reference is not a bounds check
      {
        code: 'function f4(buf) { return buf[q]; }',
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
        errors: [{ messageId: 'unsafeBufferAccess' }],
      },
      // Enclosing if referencing buffer length without comparison operators
      {
        code: 'if (checkLen(buf.length)) { use(buf[cursor]); }',
        errors: [{ messageId: 'unsafeBufferAccess' }],
      },
      // Declaration list with an init-less declarator ahead of the access
      {
        code: 'let hold, out = wrap(buf[cursor]);',
        errors: [{ messageId: 'unsafeBufferAccess' }],
      },
      // Declaration referencing buffer length without Math.min/max
      {
        code: 'const total = buf.length + extra, out2 = wrap2(buf[cursor]);',
        errors: [{ messageId: 'unsafeBufferAccess' }],
      },
    ],
  });

  describe('Layer 2: synthetic nodes via mock context', () => {
    type Listener = (n: unknown) => void;

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
      const { listeners, reports } = createWithMockContext(noBufferOverread);
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
      expect(reports).toHaveLength(2);
      expect(reports[0]).toMatchObject({
        messageId: 'unsafeBufferSlice',
        data: { line: '0' },
      });
      expect(reports[1]).toMatchObject({
        messageId: 'missingBoundsCheck',
        data: { line: '0' },
      });
    });
  });
});
