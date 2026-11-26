/**
 * An enum whose members are string literals is the allowlist written as a
 * declaration: a read of one of its members can only produce an algorithm the
 * author wrote down. Seen on Infisical, `createCipheriv(SecretEncryptionAlgo.AES_256_GCM, key, iv)`.
 *
 * Reading a member by a value the caller picks, an enum with a computed or
 * numeric member, and an enum this file only imports still report: the set of
 * values is not all visible, or not all literals.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDynamicAlgorithmSelection } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const report = [
  {
    messageId: 'dynamicAlgorithm' as const,
    data: { method: 'createCipheriv' },
  },
];

describe('no-dynamic-algorithm-selection: a string enum is an allowlist', () => {
  ruleTester.run('enum member', noDynamicAlgorithmSelection, {
    valid: [
      {
        name: 'Infisical: a member of a single-value string enum',
        code: `import crypto from 'node:crypto';
enum SecretEncryptionAlgo { AES_256_GCM = 'aes-256-gcm' }
export const enc = (key, iv) => crypto.createCipheriv(SecretEncryptionAlgo.AES_256_GCM, key, iv);`,
      },
      {
        name: 'an exported const enum',
        code: `import crypto from 'node:crypto';
export const enum Algo { Sha = 'sha256', Big = 'sha512' }
crypto.createHash(Algo.Big);`,
      },
      {
        name: 'a const that holds an enum member',
        code: `import crypto from 'node:crypto';
enum Algo { Sha = 'sha256' }
const ALGORITHM = Algo.Sha;
crypto.createHash(ALGORITHM);`,
      },
      {
        name: 'four const hops to the member are still followed',
        code: `import crypto from 'node:crypto';
enum Algo { Sha = 'sha256' }
const a = b;
const b = c;
const c = d;
const d = Algo.Sha;
crypto.createHash(a);`,
      },
      {
        name: 'a quoted member name',
        code: `import crypto from 'node:crypto';
enum Algo { 'sha-256' = 'sha256' }
crypto.createHash(Algo['sha-256']);`,
      },
    ],
    invalid: [
      {
        name: 'a chain of consts longer than the walk allows is not followed',
        code: `import crypto from 'node:crypto';
enum Algo { Sha = 'sha256' }
const a = b;
const b = c;
const c = d;
const d = e;
const e = Algo.Sha;
crypto.createHash(a);`,
        errors: [
          { messageId: 'dynamicAlgorithm', data: { method: 'createHash' } },
        ],
      },
      {
        name: 'a member chosen by a caller-supplied key',
        code: `import crypto from 'node:crypto';
enum Algo { Sha = 'sha256' }
export const h = (name) => crypto.createHash(Algo[name]);`,
        errors: [
          { messageId: 'dynamicAlgorithm', data: { method: 'createHash' } },
        ],
      },
      {
        name: 'a numeric member is not an algorithm name',
        code: `import crypto from 'node:crypto';
enum Algo { Sha }
crypto.createHash(Algo.Sha);`,
        errors: [
          { messageId: 'dynamicAlgorithm', data: { method: 'createHash' } },
        ],
      },
      {
        name: 'a computed member initializer is not a literal',
        code: `import crypto from 'node:crypto';
enum Algo { Sha = pick() }
crypto.createHash(Algo.Sha);`,
        errors: [
          { messageId: 'dynamicAlgorithm', data: { method: 'createHash' } },
        ],
      },
      {
        name: 'a member the enum does not declare',
        code: `import crypto from 'node:crypto';
enum Algo { Sha = 'sha256' }
crypto.createHash(Algo.Other);`,
        errors: [
          { messageId: 'dynamicAlgorithm', data: { method: 'createHash' } },
        ],
      },
      {
        name: 'an enum merged across two declarations is not fully visible',
        code: `import crypto from 'node:crypto';
enum Algo { Sha = 'sha256' }
enum Algo { Md = 'md5' }
crypto.createHash(Algo.Sha);`,
        errors: [
          { messageId: 'dynamicAlgorithm', data: { method: 'createHash' } },
        ],
      },
      {
        name: 'an enum only imported cannot be read',
        code: `import crypto from 'node:crypto';
import { Algo } from './algo';
crypto.createHash(Algo.Sha);`,
        errors: [
          { messageId: 'dynamicAlgorithm', data: { method: 'createHash' } },
        ],
      },
      {
        name: 'consts that name each other in a cycle resolve to nothing',
        code: `import crypto from 'node:crypto';
const a = b;
const b = a;
crypto.createHash(a);`,
        errors: [
          { messageId: 'dynamicAlgorithm', data: { method: 'createHash' } },
        ],
      },
      {
        name: 'a member of a plain object that is not an enum',
        code: `import crypto from 'node:crypto';
export const h = (cfg, key, iv) => crypto.createCipheriv(cfg.algorithm, key, iv);`,
        errors: report,
      },
      {
        name: 'a const alias of a request value',
        code: `import crypto from 'node:crypto';
const ALGORITHM = req.query.algo;
crypto.createHash(ALGORITHM);`,
        errors: [
          { messageId: 'dynamicAlgorithm', data: { method: 'createHash' } },
        ],
      },
      {
        name: 'an enum read through a non-identifier object',
        code: `import crypto from 'node:crypto';
crypto.createHash(a.b.c);`,
        errors: [
          { messageId: 'dynamicAlgorithm', data: { method: 'createHash' } },
        ],
      },
      {
        name: 'a computed read with a non-string key',
        code: `import crypto from 'node:crypto';
enum Algo { Sha = 'sha256' }
crypto.createHash(Algo[0]);`,
        errors: [
          { messageId: 'dynamicAlgorithm', data: { method: 'createHash' } },
        ],
      },
    ],
  });
});
