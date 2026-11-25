/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `noAssert` is the last argument of `Buffer`'s numeric accessors, by their
 * names. A third argument `true` on any other `read*`/`write*` method is that
 * method's own flag (`writeFileTo(path, data, true)` is an `overwrite`).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noBufferOverread } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-buffer-overread — noAssert needs a Buffer accessor', () => {
  ruleTester.run('no-assert-accessor', noBufferOverread, {
    valid: [
      {
        // @source cthackers/adm-zip adm-zip.js:965
        // @found linting popular Node.js packages
        name: 'FP: writeFileTo(path, data, true) is an overwrite flag',
        code: 'filetools.writeFileTo(targetFileName, zipData, true);',
      },
      {
        // @found linting popular Node.js packages
        name: 'FP: readFileFrom(path, true) is not a numeric accessor',
        code: 'store.readFileFrom(name, true);',
      },
    ],
    invalid: [
      {
        name: 'readInt8 with noAssert true',
        code: 'buf.readInt8(0, true);',
        errors: [{ messageId: 'boundsCheckDisabled' }],
      },
      {
        name: 'writeUInt8 with noAssert true',
        code: 'buf.writeUInt8(0, true);',
        errors: [{ messageId: 'boundsCheckDisabled' }],
      },
      {
        name: 'readInt16LE with noAssert true',
        code: 'buf.readInt16LE(0, true);',
        errors: [{ messageId: 'boundsCheckDisabled' }],
      },
      {
        name: 'writeUInt16BE with noAssert true',
        code: 'buf.writeUInt16BE(0, true);',
        errors: [{ messageId: 'boundsCheckDisabled' }],
      },
      {
        name: 'readInt32BE with noAssert true',
        code: 'buf.readInt32BE(0, true);',
        errors: [{ messageId: 'boundsCheckDisabled' }],
      },
      {
        name: 'writeIntLE with noAssert true',
        code: 'buf.writeIntLE(0, true);',
        errors: [{ messageId: 'boundsCheckDisabled' }],
      },
      {
        name: 'readIntBE with noAssert true',
        code: 'buf.readIntBE(0, true);',
        errors: [{ messageId: 'boundsCheckDisabled' }],
      },
      {
        name: 'writeUIntBE with noAssert true',
        code: 'buf.writeUIntBE(0, true);',
        errors: [{ messageId: 'boundsCheckDisabled' }],
      },
      {
        name: 'readFloatLE with noAssert true',
        code: 'buf.readFloatLE(0, true);',
        errors: [{ messageId: 'boundsCheckDisabled' }],
      },
      {
        name: 'writeFloatBE with noAssert true',
        code: 'buf.writeFloatBE(0, true);',
        errors: [{ messageId: 'boundsCheckDisabled' }],
      },
      {
        name: 'writeDoubleLE with noAssert true',
        code: 'buf.writeDoubleLE(0, true);',
        errors: [{ messageId: 'boundsCheckDisabled' }],
      },
      {
        name: 'readBigInt64LE with noAssert true',
        code: 'buf.readBigInt64LE(0, true);',
        errors: [{ messageId: 'boundsCheckDisabled' }],
      },
      {
        name: 'writeBigInt64BE with noAssert true',
        code: 'buf.writeBigInt64BE(0, true);',
        errors: [{ messageId: 'boundsCheckDisabled' }],
      },
      {
        name: 'readBigUInt64LE with noAssert true',
        code: 'buf.readBigUInt64LE(0, true);',
        errors: [{ messageId: 'boundsCheckDisabled' }],
      },
      {
        name: 'writeBigUInt64BE with noAssert true',
        code: 'buf.writeBigUInt64BE(0, true);',
        errors: [{ messageId: 'boundsCheckDisabled' }],
      },
      {
        name: 'writeUInt32LE with noAssert true',
        code: 'buf.writeUInt32LE(value, 0, true);',
        errors: [{ messageId: 'boundsCheckDisabled' }],
      },
      {
        name: 'readUIntBE takes three arguments, the last is noAssert',
        code: 'buf.readUIntBE(0, 3, true);',
        errors: [{ messageId: 'boundsCheckDisabled' }],
      },
      {
        name: 'readDoubleLE with noAssert true',
        code: 'buf.readDoubleLE(0, true);',
        errors: [{ messageId: 'boundsCheckDisabled' }],
      },
      {
        name: 'a computed spelling of a numeric accessor',
        code: "buf['readUInt8'](0, true);",
        errors: [{ messageId: 'boundsCheckDisabled' }],
      },
    ],
  });
});
