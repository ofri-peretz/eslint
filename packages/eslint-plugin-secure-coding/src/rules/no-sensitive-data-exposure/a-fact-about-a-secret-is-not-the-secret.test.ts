/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Found linting open-source Node apps: structured log fields whose KEY names a
 * secret and whose VALUE is a fact about it, not the secret:
 *
 *   this.logger.log({ hasToken: Boolean(validateDTO?.token) }, 'POST /validate')
 *   logger.info('Changing user password', { previousPasswordRequired: isRequired })
 *   logger.info('Created replacement', { preservedSecretCount: secrets.length })
 *
 * (The fixtures below name the key `…Tally`: a key ending in `count` is a
 * descriptor on its own now, which would leave the value's shape untested.)
 *
 * The shape of the value decides, never the key. Every exemption has a
 * lookalike that logs the secret itself.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noSensitiveDataExposure } from './index';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const COMPARISONS = [
  '===',
  '!==',
  '==',
  '!=',
  '<',
  '<=',
  '>',
  '>=',
  'in',
  'instanceof',
];
const err = [{ messageId: 'sensitiveDataExposure' as const }];

ruleTester.run(
  'a fact about a secret is not the secret',
  noSensitiveDataExposure,
  {
    valid: [
      {
        name: 'Boolean() of an optional chain',
        code: `logger.log({ hasToken: Boolean(dto?.token) }, 'validate');`,
      },
      {
        name: 'the optional-chained length of a list of secrets',
        code: `logger.info('done', { secretTally: secrets?.length });`,
      },
      {
        name: 'double negation',
        code: `logger.log({ hasToken: !!dto.token });`,
      },
      { name: 'negation', code: `logger.log({ tokenMissing: !dto.token });` },
      {
        name: 'the length of a list of secrets',
        code: `logger.info('done', { preservedSecretCount: secrets.length });`,
      },
      {
        name: 'the size of a set of secrets',
        code: `logger.info('done', { secretTally: secrets.size });`,
      },
      {
        name: 'a boolean held in a variable, from a comparison',
        code: `function f(ctx, input) {
          const isPasswordRequired = ctx.user.id === input.userId;
          logger.info('Changing user password', { previousPasswordRequired: isPasswordRequired });
        }`,
      },
      ...COMPARISONS.map((operator) => ({
        name: `a ${operator} comparison`,
        code: `logger.info('x', { passwordChanged: a ${operator} b });`,
      })),
    ],
    invalid: [
      {
        name: 'the token itself',
        code: `logger.log({ token: dto.token });`,
        errors: err,
      },
      {
        name: 'a token under a fact-sounding key',
        code: `logger.log({ hasToken: dto.token });`,
        errors: err,
      },
      {
        name: 'a String() wrapper is not Boolean()',
        code: `logger.log({ hasToken: String(dto.token) });`,
        errors: err,
      },
      {
        name: 'a shadowed Boolean is not the global',
        code: `function f(Boolean, dto) { logger.log({ hasToken: Boolean(dto.token) }); }`,
        errors: err,
      },
      {
        name: 'a unary minus is not a negation',
        code: `logger.log({ hasToken: -dto.token });`,
        errors: err,
      },
      {
        name: 'an arithmetic operator is not a comparison',
        code: `logger.log({ tokenPlus: dto.token + suffix });`,
        errors: err,
      },
      {
        name: 'a plain property is not a size',
        code: `logger.log({ secretValue: secrets.value });`,
        errors: err,
      },
      {
        name: 'a call that is not Boolean',
        code: `logger.log({ hasToken: normalize(dto.token) });`,
        errors: err,
      },
      {
        name: 'a variable holding the secret',
        code: `function f(dto) { const held = dto.token; logger.log({ hasToken: held }); }`,
        errors: err,
      },
      {
        name: 'a conditional is not judged as a fact',
        code: `logger.log({ hasToken: flag ? dto.token : other });`,
        errors: err,
      },
      {
        name: 'two bindings initialised from each other terminate',
        code: `function f() { var a = b; var b = a; logger.log({ hasToken: a }); }`,
        errors: err,
      },
      {
        name: 'an unresolved variable',
        code: `logger.log({ hasToken: unknownValue });`,
        errors: err,
      },
      {
        name: 'a variable aliasing a call that is not Boolean',
        code: `function f(dto) { const x = normalize(dto.token); logger.log({ passwordX: x }); }`,
        errors: err,
      },
    ],
  },
);
