/**
 * no-buffer-overread — divergences the Quint fidelity model found
 * (benchmarks/suites/fidelity/models/node-security/no_buffer_overread.qnt).
 *
 *   - an early-exit `boundsCheckFunctions` guard was not recognised;
 *   - a range guard on `index` did not clear `slice(index, index + 4)`;
 *   - `reportUnvalidatedIndices` ignored an unresolved (parameter) index and
 *     every method-call access.
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

const STRICT = [{ reportUnvalidatedIndices: true }];

describe('no-buffer-overread fidelity', () => {
  ruleTester.run('guards and the unvalidated sweep', noBufferOverread, {
    valid: [
      {
        name: 'an early-exit checkBounds guard validates readUInt32LE',
        code: `declare function checkBounds(b: unknown, i: number): boolean;
export function handler(req: any) {
  const packet = Buffer.alloc(64);
  const index = parseInt(req.query.index);
  if (!checkBounds(packet, index)) return;
  const v = packet.readUInt32LE(index);
  return v;
}`,
      },
      {
        name: 'an early-exit checkBounds guard validates a computed index',
        code: `declare function checkBounds(b: unknown, i: number): boolean;
export function handler(req: any) {
  const packet = Buffer.alloc(64);
  const index = parseInt(req.query.index);
  if (!checkBounds(packet, index)) return;
  return packet[index];
}`,
      },
      {
        name: 'a range guard on index clears slice(index, index + 4)',
        code: `export function handler(req: any) {
  const packet = Buffer.alloc(64);
  const index = parseInt(req.query.index);
  if (index >= 0 && index + 4 <= packet.length) {
    return packet.slice(index, index + 4);
  }
}`,
      },
      {
        name: 'a literal offset stays silent under reportUnvalidatedIndices',
        code: `export function handler(buf: any) { return buf.readUInt32LE(0); }`,
        options: STRICT,
      },
      {
        name: 'a bounds helper inside a logical guard validates the index',
        code: `declare function checkBounds(b: unknown, i: number): boolean;
export function handler(req: any) {
  const packet = Buffer.alloc(64);
  const index = parseInt(req.query.index);
  if (index < 0 || !checkBounds(packet, index)) return;
  return packet.readUInt32LE(index);
}`,
      },
      {
        name: 'a range guard on index clears index minus a constant',
        code: `export function handler(req: any) {
  const packet = Buffer.alloc(64);
  const index = parseInt(req.query.index);
  if (index >= 1 && index < packet.length) {
    return packet.readUInt8(index - 1);
  }
}`,
      },
    ],
    invalid: [
      {
        name: 'reportUnvalidatedIndices reports a parameter index into a buffer',
        code: `export function handler(buf: any, offset: number) { return buf[offset]; }`,
        options: STRICT,
        errors: [{ messageId: 'unsafeBufferAccess' }],
      },
      {
        name: 'reportUnvalidatedIndices reports a parameter offset to readUInt32LE',
        code: `export function handler(buf: any, offset: number) { return buf.readUInt32LE(offset); }`,
        options: STRICT,
        errors: [{ messageId: 'missingBoundsCheck' }],
      },
      {
        name: 'reportUnvalidatedIndices reports a parameter offset to slice',
        code: `export function handler(buf: any, offset: number) { return buf.slice(offset, offset + 4); }`,
        options: STRICT,
        errors: [
          { messageId: 'unsafeBufferSlice' },
          { messageId: 'unsafeBufferSlice' },
        ],
      },
      {
        name: 'a bounds helper on a different index does not validate this one',
        code: `declare function checkBounds(b: unknown, i: number): boolean;
export function handler(req: any) {
  const packet = Buffer.alloc(64);
  const index = parseInt(req.query.index);
  const other = parseInt(req.query.other);
  if (!checkBounds(packet, other)) return;
  return packet.readUInt32LE(index);
}`,
        errors: [{ messageId: 'missingBoundsCheck' }],
      },
      {
        name: 'a range guard on index does not clear index times a constant',
        code: `export function handler(req: any) {
  const packet = Buffer.alloc(64);
  const index = parseInt(req.query.index);
  if (index >= 0 && index < packet.length) {
    return packet.readUInt8(index * 4);
  }
}`,
        errors: [{ messageId: 'missingBoundsCheck' }],
      },
      {
        name: 'a range guard on index does not clear index plus another request value',
        code: `export function handler(req: any) {
  const packet = Buffer.alloc(64);
  const index = parseInt(req.query.index);
  const skew = parseInt(req.query.skew);
  if (index >= 0 && index < packet.length) {
    return packet.readUInt8(index + skew);
  }
}`,
        errors: [{ messageId: 'missingBoundsCheck' }],
      },
    ],
  });
});
