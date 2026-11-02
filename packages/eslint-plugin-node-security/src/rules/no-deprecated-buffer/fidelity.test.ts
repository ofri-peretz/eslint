/**
 * no-deprecated-buffer — divergence the Quint fidelity model found
 * (benchmarks/suites/fidelity/models/node-security/no_deprecated_buffer.qnt):
 * the doc's Known False Negatives say `const B = Buffer; new B(N)` is flagged
 * when the alias is in scope at the call site, and it was not.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDeprecatedBuffer } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-deprecated-buffer fidelity', () => {
  ruleTester.run('an in-scope alias of Buffer', noDeprecatedBuffer, {
    valid: [
      {
        name: 'an alias reassigned before use is not provably Buffer',
        code: `let B = Buffer;
B = class Other { constructor(n: number) {} } as any;
export function make() { return new B(64); }`,
      },
      {
        name: 'an alias of a local class named Buffer is not Node Buffer',
        code: `class Buffer { constructor(n: number) {} }
const B = Buffer;
export function make() { return new B(64); }`,
      },
      {
        name: 'a var alias cycle resolves to nothing and terminates',
        code: `var a = b, b = a;
export function make() { return new a(64); }`,
      },
      {
        name: 'a method destructured from Buffer is not the constructor',
        code: `const { isBuffer } = Buffer;
export const check = (x: unknown) => isBuffer(x);`,
      },
      {
        name: 'a Blob imported from node:buffer is not the Buffer constructor',
        code: `import { Blob } from 'node:buffer';
export const blob = (data: string) => new Blob([data]);`,
      },
      {
        name: 'a default import of the buffer module is the module object, not the constructor',
        code: `import Buffer from 'buffer';
export const make = () => new Buffer(8);`,
      },
      {
        name: 'TypeScript import-equals of buffer binds the module and is left unresolved',
        code: `import Buffer = require('buffer');
export const make = () => new Buffer(8);`,
      },
      {
        name: 'a Blob required from node:buffer is not the Buffer constructor',
        code: `const Blob = require('node:buffer').Blob;
export const blob = (data: string) => new Blob([data]);`,
      },
      {
        name: 'a Buffer member of some other object is not node Buffer',
        code: `const B = lib.Buffer;
export const make = () => new B(8);`,
      },
      {
        name: 'a Buffer destructured from a non-require member is not node Buffer',
        code: `const { Buffer } = lib.shim;
export const make = () => new Buffer(8);`,
      },
      {
        name: 'a Buffer destructured from a call that is not require is not node Buffer',
        code: `const { Buffer } = load('buffer');
export const make = () => new Buffer(8);`,
      },
      {
        name: 'an undeclared object other than global is not the buffer module',
        code: `export const make = () => new lib.Buffer(8);`,
      },
      {
        name: 'a namespace import of a local module is not the buffer module',
        code: `import * as lib from './lib';
export const make = () => new lib.Buffer(8);`,
      },
      {
        name: 'a parameter is not the buffer module',
        code: `export const make = (lib: any) => new lib.Buffer(8);`,
      },
      {
        name: 'an uninitialised binding is not the buffer module',
        code: `let lib: any;
export const make = () => new lib.Buffer(8);`,
      },
    ],
    invalid: [
      {
        // @found quint fidelity model
        name: 'FN: Buffer reached through a default import of node:buffer is the constructor',
        code: `import buffer from 'node:buffer';
export const make = (n: number) => new buffer.Buffer(n);`,
        errors: 1,
      },
      {
        name: 'new on an in-scope const alias of Buffer is reported',
        code: `const B = Buffer;
export function make(input: any) { return new B(64); }`,
        output: `const B = Buffer;
export function make(input: any) { return B.alloc(64); }`,
        errors: 1,
      },
      {
        name: 'an alias of an alias of Buffer is reported',
        code: `const A = Buffer;
const B = A;
export function make(input: any) { return new B(input); }`,
        errors: 1,
      },
    ],
  });
});
