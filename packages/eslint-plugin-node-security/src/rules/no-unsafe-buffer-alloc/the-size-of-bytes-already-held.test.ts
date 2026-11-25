/**
 * no-unsafe-buffer-alloc: `.length` of a value declared as bytes or text is the
 * size of something already in memory, not a length the peer wrote.
 *
 * nestjs/mail `smtp-connection.ts:598` dot-stuffs an outgoing message into
 * `Buffer.allocUnsafe(message.length * 2 + 5)`. That is at most twice what is
 * already held; the hazard this arm exists for is a 12-byte length prefix that
 * commits 229MB. The word `message` decided it. The invalid half keeps the
 * declared type as the evidence: an untyped `msg` may be `JSON.parse(data)`,
 * where `msg.length` is any number the peer put in the field.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { noUnsafeBufferAlloc } from './index';

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const unbounded = [{ messageId: 'unboundedAllocation' as const }];

ruleTester.run('the size of bytes already held', noUnsafeBufferAlloc, {
  valid: [
    {
      // @source nestjs/mail lib/smtp/smtp-connection.ts:598
      // @found real-source scan
      name: 'FP: twice the length of a Buffer parameter',
      code: `export function toSmtpData(message: Buffer): Buffer {
        const out = Buffer.alloc(message.length * 2 + 5);
        return out;
      }`,
    },
    {
      // @found synthetic
      name: 'FP: byteLength of a Uint8Array, and length of a string',
      code: `export function f(chunk: Uint8Array, msg: string) {
        return [Buffer.alloc(chunk.byteLength), Buffer.alloc(msg.length)];
      }`,
    },
    {
      // @found synthetic
      name: 'FP: the length read through a string key is the same property',
      code: `export function f(chunk: Buffer) { return Buffer.alloc(chunk['length']); }`,
    },
  ],
  invalid: [
    {
      name: 'a string has no byteLength',
      code: `export function f(msg: string) { return Buffer.alloc(msg.byteLength); }`,
      errors: unbounded,
    },
    {
      name: 'another property of a typed Buffer still reports',
      code: `export function f(chunk: Buffer) { return Buffer.alloc(chunk.declaredSize); }`,
      errors: unbounded,
    },
    {
      name: 'every declaration must be typed as bytes',
      code: `export function f(raw) { var chunk: Buffer = Buffer.from('x'); var chunk = raw; return Buffer.alloc(chunk.length); }`,
      errors: unbounded,
    },
    {
      name: 'a number-typed value has no byte length',
      code: `export function f(chunk: number) { return Buffer.alloc(chunk.length); }`,
      errors: unbounded,
    },
    {
      name: 'an untyped wire-named value still reports',
      code: `export function f(msg) { return Buffer.alloc(msg.length); }`,
      errors: unbounded,
    },
    {
      name: 'an undeclared wire-named global still reports',
      code: `export function f() { return Buffer.alloc(message.length); }`,
      errors: unbounded,
    },
    {
      name: 'a parsed object typed any still reports',
      code: `export function f(msg: any) { return Buffer.alloc(msg.length); }`,
      errors: unbounded,
    },
    {
      name: 'a qualified type name is not one of the byte types',
      code: `export function f(chunk: node.Buffer) { return Buffer.alloc(chunk.length); }`,
      errors: unbounded,
    },
    {
      name: 'a length field read through a Buffer is not its size',
      code: `export function f(chunk: Buffer) { return Buffer.alloc(chunk[k]); }`,
      errors: unbounded,
    },
    {
      name: 'another property of a Buffer still reports',
      code: `export function f(chunk: Buffer) { return Buffer.alloc(chunk.readUInt32BE(0)); }`,
      errors: unbounded,
    },
    {
      name: 'the length of a nested member is not covered',
      code: `export function f(frame: Buffer) { return Buffer.alloc(frame.header.length); }`,
      errors: unbounded,
    },
  ],
});
