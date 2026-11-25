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
      {
        name: 'an imported InjectionToken is the DI API',
        code: [
          "import { InjectionToken } from '@angular/core'",
          "const token = new InjectionToken('DB')",
          'logger.debug(`resolving ${String(token)}`)',
        ].join('\n'),
      },
      {
        name: 'a typeof test of the declared key is a read, not a delete',
        code: [
          'const tokenBag = { value: 0 }',
          'const kind = typeof tokenBag.value',
          'logger.warn(`using ${tokenBag.value}`)',
        ].join('\n'),
      },
      {
        name: 'reading the declared key into another variable is not a write through the binding',
        code: [
          'const tokenBag = { value: 0 }',
          'let copy',
          'copy = tokenBag.value',
          'logger.warn(`using ${tokenBag.value}`)',
        ].join('\n'),
      },
      {
        name: 'a hand-off through a member call is not a function this file defines',
        code: [
          'const tokenBag = { value: 0 }',
          'helpers.hash(tokenBag)',
          'logger.warn(`using ${tokenBag.value}`)',
        ].join('\n'),
      },
      {
        name: 'a hand-off to a function this file does NOT define may not change the object',
        code: [
          'const tokenBag = { value: 0 }',
          'hash(tokenBag)',
          'logger.warn(`using ${tokenBag.value}`)',
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
      {
        name: '`.name` of an object literal is whatever the literal holds, not a class name',
        code: [
          'const credential = { name: accessToken }',
          'const token = credential.name',
          'logger.error(`bad ${token}`)',
        ].join('\n'),
        errors: exposure,
      },
      {
        name: 'a constructor this file defines itself is not the DI InjectionToken',
        code: [
          'class InjectionToken { constructor(v) { this.v = v } toString() { return this.v } }',
          'const token = new InjectionToken(password)',
          'logger.error(`bad ${String(token)}`)',
        ].join('\n'),
        errors: exposure,
      },
      {
        name: 'a Symbol built from a credential prints it through its description',
        code: [
          'const token = Symbol(accessToken)',
          'logger.error(`bad ${String(token)}`)',
        ].join('\n'),
        errors: exposure,
      },
      {
        name: 'Symbol.for with a credential as its key prints it too',
        code: [
          'const token = Symbol.for(accessToken)',
          'logger.error(`bad ${String(token)}`)',
        ].join('\n'),
        errors: exposure,
      },
      {
        name: 'a typeof-function ternary over a credential-named subject passes the credential through',
        code: [
          "const token = typeof accessToken === 'function' ? accessToken.name : accessToken",
          'logger.error(`bad ${token}`)',
        ].join('\n'),
        errors: exposure,
      },
      {
        name: 'an alias of the literal must not hide the credential its declared key holds',
        code: [
          'const tokenBag = { value: accessToken }',
          'const alias = tokenBag',
          'logger.warn(`using ${tokenBag.value}`)',
        ].join('\n'),
        errors: exposure,
      },
      {
        name: 'an InjectionToken reached through a namespace is not resolved as the DI API',
        code: [
          'const token = new di.InjectionToken(password)',
          'logger.error(`bad ${String(token)}`)',
        ].join('\n'),
        errors: exposure,
      },
      {
        name: 'an object handed to a function this file defines may be written by it',
        code: [
          'function fill(target) { target.value = accessToken }',
          'const tokenBag = { value: 0 }',
          'fill(tokenBag)',
          'logger.warn(`using ${tokenBag.value}`)',
        ].join('\n'),
        errors: exposure,
      },
      {
        name: 'the same through an arrow function bound to a variable',
        code: [
          'const fill = (target) => { target.value = accessToken }',
          'const tokenBag = { value: 0 }',
          'fill(tokenBag)',
          'logger.warn(`using ${tokenBag.value}`)',
        ].join('\n'),
        errors: exposure,
      },
      {
        name: 'a duplicate key: the LAST definition is the one the object holds',
        code: [
          'const tokenBag = { value: 0, value: accessToken }',
          'void tokenBag',
          'logger.warn(`using ${tokenBag.value}`)',
        ].join('\n'),
        errors: exposure,
      },
      {
        name: 'a value that reads itself is not known to be safe, and must not recurse forever',
        code: [
          'var tokenRecord = { value: tokenRecord?.value }',
          'logger.warn(`using ${tokenRecord.value}`)',
        ].join('\n'),
        errors: exposure,
      },
    ],
  });
});
