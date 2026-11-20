/**
 * A dependency-injection token is a reference to a class, not a credential.
 *
 * Found by linting nestjs/nest at e0600bb (`packages/core/injector/opaque-key-factory`
 * and `packages/core/repl/native-functions/debug-repl-fn.ts`). Two shapes:
 *
 *   const opaqueToken = { id, module: moduleName, dynamic }
 *   logger.warn(`The module "${opaqueToken.module}" is slow`)
 *
 * The author spelled the field `module`; the rule read the receiver's name
 * (`opaqueToken`) and ignored what is taken from it.
 *
 *   const token = typeof moduleCls === 'function' ? moduleCls.name : moduleCls
 *   logger.error(`"${token}" has not been found`)
 *
 * A class name normalized from "class or string". `Function.prototype.name` is
 * platform-defined text (the same reasoning as `DIAGNOSTIC_ACCESSORS`), and a
 * `Symbol()` is an identity, not a string anyone can replay.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noSensitiveDataExposure } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const exposure = [{ messageId: 'sensitiveDataExposure' as const }];

describe('no-sensitive-data-exposure - a DI token is not a credential', () => {
  ruleTester.run('class-reference tokens', noSensitiveDataExposure, {
    valid: [
      {
        // nest deep-hashed-module-opaque-key-factory.ts:73
        name: 'a field the local object literal declares as `module` is judged by that key, not by the receiver name',
        code: [
          'const moduleName = getName(cls)',
          'const opaqueToken = { id: moduleId, module: moduleName, dynamic: meta }',
          'const s = stringify(opaqueToken)',
          'logger.warn(`The module "${opaqueToken.module}" is slow`)',
        ].join('\n'),
      },
      {
        // nest debug-repl-fn.ts:24
        name: 'a token that is a class name normalized from class-or-string',
        code: [
          "const token = typeof moduleCls === 'function' ? moduleCls.name : moduleCls",
          'logger.error(`"${token}" has not been found in the modules registry`)',
        ].join('\n'),
      },
      {
        name: 'a token bound to a plain `.name` read',
        code: [
          'const token = moduleCls.name',
          'logger.error(`no provider for ${token}`)',
        ].join('\n'),
      },
      {
        name: 'a token that is a Symbol is an identity, not a string',
        code: [
          "const token = Symbol('DB_CONNECTION')",
          'logger.debug(`resolving ${String(token)}`)',
        ].join('\n'),
      },
      {
        name: 'a token that is an InjectionToken instance is an identity',
        code: [
          "const token = new InjectionToken('DB')",
          'logger.debug(`resolving ${String(token)}`)',
        ].join('\n'),
      },
      {
        name: 'a token from Symbol.for is an identity',
        code: [
          "const token = Symbol.for('DB')",
          'logger.debug(`resolving ${String(token)}`)',
        ].join('\n'),
      },
      {
        name: 'the loose == spelling of the typeof-function idiom',
        code: [
          "const token = typeof moduleCls == 'function' ? moduleCls.name : moduleCls",
          'logger.error(`"${token}" has not been found`)',
        ].join('\n'),
      },
      {
        name: 'a literal handed to other code (hashed, serialized) is still judged by its declared key',
        code: [
          'const tokenBag = { value: 0 }',
          'mutate(tokenBag)',
          'logger.warn(`using ${tokenBag.value}`)',
        ].join('\n'),
      },
      {
        name: 'a field redacted after the literal is not judged by its initializer',
        code: [
          'const entry = { message: accessToken }',
          "entry.message = '[redacted]'",
          'logger.error(`failed ${entry.message}`)',
        ].join('\n'),
      },
      {
        name: 'a field a spread may have replaced is not judged by its initializer',
        code: [
          'const entry = { message: accessToken, ...extra }',
          'logger.error(`failed ${entry.message}`)',
        ].join('\n'),
      },
    ],
    invalid: [
      {
        name: 'a receiver literal that declares a secret key still reports through the key',
        code: [
          'const opaqueToken = { id: 1, token: readToken() }',
          'logger.warn(`using ${opaqueToken.token}`)',
        ].join('\n'),
        errors: exposure,
      },
      {
        name: 'a key the literal does NOT declare still falls back to the receiver name',
        code: [
          'const tokenBag = { id: 1 }',
          'logger.warn(`using ${tokenBag.value}`)',
        ].join('\n'),
        errors: exposure,
      },
      {
        name: 'a literal field that is written through afterwards no longer proves the key',
        code: [
          'const tokenBag = { value: 0 }',
          'tokenBag.value = readSecret()',
          'logger.warn(`using ${tokenBag.value}`)',
        ].join('\n'),
        errors: exposure,
      },
      {
        name: 'a spread after the key may overwrite it',
        code: [
          'const tokenBag = { value: 0, ...extra }',
          'logger.warn(`using ${tokenBag.value}`)',
        ].join('\n'),
        errors: exposure,
      },
      {
        name: 'a computed key after the key may overwrite it',
        code: [
          'const tokenBag = { value: 0, [dyn]: 1 }',
          'logger.warn(`using ${tokenBag.value}`)',
        ].join('\n'),
        errors: exposure,
      },
      {
        name: 'a token bound to an arbitrary call is still a token',
        code: [
          'const token = await fetchAccessToken()',
          'logger.error(`bad ${token}`)',
        ].join('\n'),
        errors: exposure,
      },
      {
        name: 'a typeof-function normalization of something that is not a class name is still judged by its name',
        code: [
          "const token = typeof raw === 'function' ? raw() : raw",
          'logger.error(`bad ${token}`)',
        ].join('\n'),
        errors: exposure,
      },
      {
        name: 'a token built with some other constructor is still a token',
        code: [
          'const token = new Credential()',
          'logger.error(`bad ${token}`)',
        ].join('\n'),
        errors: exposure,
      },
      {
        name: 'a token from a member call that is not Symbol.for is still a token',
        code: [
          'const token = Vault.read()',
          'logger.error(`bad ${token}`)',
        ].join('\n'),
        errors: exposure,
      },
      {
        name: 'a locally shadowed Symbol is not the global one',
        code: [
          'function f(Symbol) {',
          "  const token = Symbol('x')",
          '  logger.error(`bad ${token}`)',
          '}',
        ].join('\n'),
        errors: exposure,
      },
      {
        name: 'a locally shadowed Symbol.for is not the global one',
        code: [
          'function f(Symbol) {',
          "  const token = Symbol.for('x')",
          '  logger.error(`bad ${token}`)',
          '}',
        ].join('\n'),
        errors: exposure,
      },
      {
        name: 'another Symbol method is not Symbol.for',
        code: [
          'const token = Symbol.keyFor(registered)',
          'logger.error(`bad ${token}`)',
        ].join('\n'),
        errors: exposure,
      },
      {
        name: 'a key read off a call result is not a local literal declaration',
        code: 'logger.warn(`using ${getBag().token}`)',
        errors: exposure,
      },
      {
        name: 'a ternary that does not test typeof is not the class-name idiom',
        code: [
          'const token = ok ? raw.name : raw',
          'logger.error(`bad ${token}`)',
        ].join('\n'),
        errors: exposure,
      },
      {
        name: 'a typeof test against another type is not the class-name idiom',
        code: [
          "const token = typeof raw === 'string' ? raw.name : raw",
          'logger.error(`bad ${token}`)',
        ].join('\n'),
        errors: exposure,
      },
      {
        name: 'a typeof test whose operand is not an identifier is not the idiom',
        code: [
          "const token = typeof box.raw === 'function' ? box.raw.name : box.raw",
          'logger.error(`bad ${token}`)',
        ].join('\n'),
        errors: exposure,
      },
      {
        name: 'a typeof-function ternary reading the name of a different value',
        code: [
          "const token = typeof raw === 'function' ? other.name : raw",
          'logger.error(`bad ${token}`)',
        ].join('\n'),
        errors: exposure,
      },
      {
        name: 'a typeof-function ternary that passes a different value through',
        code: [
          "const token = typeof raw === 'function' ? raw.name : other",
          'logger.error(`bad ${token}`)',
        ].join('\n'),
        errors: exposure,
      },
    ],
  });
});
