/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Back-channel provenance through Result wrappers and Response-typed
 * functions (`provenance.ts`), driven through no-decode-without-verify.
 *
 * A token is exempt only when every path that yields it is proven to come
 * from a response this code requested. Each case below is one way that proof
 * holds or breaks: how the wrapper is built, how it is unwrapped, how the
 * producing function returns, and how a fetch wrapper declares its type.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { noDecodeWithoutVerify } from '../rules/no-decode-without-verify';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jwt-provenance-'));
const write = (file: string, source: string): void =>
  fs.writeFileSync(path.join(dir, file), source);

write(
  'result.ts',
  `export const ok = <T,>(value: T) => new Ok(value);
export const err = <E,>(error: E) => new Err(error);
export const notAFactory = (value) => value;
export const mismatched = (value) => new Ok(other);
export const bareNew = (value) => new Ok();
export const noParam = () => new Ok(value);
export const toPlain = (value) => new Plain(value);
export const toMissing = (value) => new Missing(value);
export const toNonClass = (value) => new notAClass(value);
export const toNoCtor = (value) => new NoCtor(value);
export const notAClass = () => 1;
export function plainFactory(value) { return new Ok(value); }
export class Ok<T> {
  static {}
  label = 'ok';
  constructor(readonly value: T) {}
  valueOrBug(): T { return this.value; }
  mapError(_mapper: unknown) { return ok(this.value); }
  twice() { if (flag) return this.value; return this.value; }
  bare() { return; }
  other() { return somethingElse(); }
  chainLabel() { return this.label; }
}
export class Err<E> {
  constructor(readonly error: E) {}
  valueOrBug(): never { throw this.error; }
  mapError(mapper: (e: E) => unknown) { return err(mapper(this.error)); }
}
export class Plain { value; constructor(value) { this.value = value; } }
export class NoCtor {}
const hidden = 1;
export { hidden as aliased };
export { request as undiciRequest } from 'undici';
`,
);
write(
  'reexport.ts',
  `export { ok as reok, err as reerr } from './result';
export { missing as gone } from './nowhere';
export { loopA } from './cycle-b';
`,
);
write('cycle-b.ts', "export { loopA } from './cycle-a';\n");
write('cycle-a.ts', "export { loopA } from './cycle-b';\n");
write(
  'http.ts',
  `import { Response } from 'node-fetch';
import type { AxiosResponse } from 'axios';
export async function viaNodeFetch(url: string): Promise<Response> { return send(url); }
export function plainResponse(url: string): Response { return send(url); }
export async function platformResponse(url: string): Promise<Response> { return send(url); }
export async function axiosTyped(url: string): Promise<AxiosResponse> { return send(url); }
export async function untyped(url: string) { return send(url); }
export async function unknownType(url: string): Promise<Mystery> { return send(url); }
export async function bareFoo(url: string): Promise { return send(url); }
export async function qualified(url: string): Promise<ns.Response> { return send(url); }
`,
);
write(
  'http-platform.ts',
  'export async function platformFetch(url: string): Promise<Response> { return send(url); }\n',
);
write('http-reexport.ts', "export { Response } from 'node-fetch';\n");
write(
  'http-via-reexport.ts',
  "import { Response } from './http-reexport';\nexport async function viaReexport(url: string): Promise<Response> { return send(url); }\n",
);
write('default.ts', 'export default function () {}\n');

const FILE = path.join(dir, 'main.ts');

/** A producer that returns `wrap(<fetched body>)` and `err(…)`, then a decode of `unwrap`. */
const wrapped = (imports: string, wrap: string, unwrap: string): string =>
  `import { decodeJwt } from 'jose';
import { ${imports} } from './result.js';
async function produce() {
  const body = await (await fetch(tokenUrl)).json();
  if (body.ok) return ${wrap};
  return err('failed');
}
export async function f() {
  const r = await produce();
  return decodeJwt(${unwrap}).sub;
}`;

const decodeError = [{ messageId: 'decodeWithoutVerify' as const }];

describe('provenance through Result wrappers', () => {
  ruleTester.run('wrappers', noDecodeWithoutVerify, {
    valid: [
      {
        name: 'a direct `new Ok(body)` unwrapped by its field',
        filename: FILE,
        code: wrapped('Ok, err', 'new Ok(body)', 'r.value.id_token'),
      },
      {
        name: 'a function-declaration factory',
        filename: FILE,
        code: wrapped(
          'plainFactory, err',
          'plainFactory(body)',
          'r.value.id_token',
        ),
      },
      {
        name: 'a re-exported factory',
        filename: FILE,
        code: `import { decodeJwt } from 'jose';
import { reok, reerr } from './reexport.js';
async function produce() {
  const body = await (await fetch(tokenUrl)).json();
  if (body.ok) return reok(body);
  return reerr('failed');
}
export async function f() {
  const r = await produce();
  return decodeJwt(r.valueOrBug().id_token).sub;
}`,
      },
      {
        name: 'an arrow producer with an expression body',
        filename: FILE,
        code: `import { decodeJwt } from 'jose';
import { ok } from './result.js';
const produce = async () => ok(await (await fetch(tokenUrl)).json());
export async function f() {
  const r = await produce();
  return decodeJwt(r.value.id_token).sub;
}`,
      },
      {
        name: 'a wrapper built in place around a fetched body',
        filename: FILE,
        code: `import { decodeJwt } from 'jose';
import { Ok } from './result.js';
export async function f() {
  const r = new Ok(await (await fetch(tokenUrl)).json());
  return decodeJwt(r.value.id_token).sub;
}`,
      },
      {
        name: 'a bare return yields nothing to follow',
        filename: FILE,
        code: `import { decodeJwt } from 'jose';
import { ok } from './result.js';
async function produce() {
  const body = await (await fetch(tokenUrl)).json();
  if (!body) return;
  return ok(body);
}
export async function f() {
  const r = await produce();
  return decodeJwt(r.value.id_token).sub;
}`,
      },
    ],
    invalid: [
      ...[
        [
          'a property that is not the stored field',
          'ok, err',
          'ok(body)',
          'r.label',
        ],
        ['a method with two returns', 'ok, err', 'ok(body)', 'r.twice()'],
        ['a method with a bare return', 'ok, err', 'ok(body)', 'r.bare()'],
        [
          'a method returning something unrelated',
          'ok, err',
          'ok(body)',
          'r.other().value',
        ],
        [
          'a method returning another field',
          'ok, err',
          'ok(body)',
          'r.chainLabel().value',
        ],
        [
          'a method the class does not have',
          'ok, err',
          'ok(body)',
          'r.missing()',
        ],
        ['a property called as a method', 'ok, err', 'ok(body)', 'r.label()'],
        [
          'a result that is still wrapped',
          'ok, err',
          'ok(body)',
          'r.mapError(h)',
        ],
        ['a factory given no argument', 'ok, err', 'ok()', 'r.value'],
        [
          'an unwrapping method on a factory given no argument',
          'ok, err',
          'ok()',
          'r.valueOrBug()',
        ],
        [
          'a call on the unwrapped value',
          'ok, err',
          'ok(body)',
          'r.valueOrBug().trim()',
        ],
        [
          'a factory that builds nothing',
          'notAFactory, err',
          'notAFactory(body)',
          'r.value',
        ],
        [
          'a factory that wraps a different name',
          'mismatched, err',
          'mismatched(body)',
          'r.value',
        ],
        [
          'a factory that constructs with no argument',
          'bareNew, err',
          'bareNew(body)',
          'r.value',
        ],
        [
          'a class that assigns rather than declares the field',
          'toPlain, err',
          'toPlain(body)',
          'r.value',
        ],
        [
          'a class that cannot be found',
          'toMissing, err',
          'toMissing(body)',
          'r.value',
        ],
        [
          'a constructed name that is not a class',
          'toNonClass, err',
          'toNonClass(body)',
          'r.value',
        ],
        [
          'a class with no constructor',
          'toNoCtor, err',
          'toNoCtor(body)',
          'r.value',
        ],
        [
          'a factory reached through a member',
          'ok, err',
          'Result.ok(body)',
          'r.value',
        ],
        [
          'a factory that cannot be resolved',
          'err',
          'unknownFactory(body)',
          'r.value',
        ],
      ].map(([name, imports, wrap, unwrap]) => ({
        name: `${name} proves nothing`,
        filename: FILE,
        code: wrapped(imports!, wrap!, unwrap!),
        errors: decodeError,
      })),
      {
        name: 'a producer that only ever returns errors yields no value',
        filename: FILE,
        code: `import { decodeJwt } from 'jose';
import { err } from './result.js';
async function produce() { return err('failed'); }
export async function f() {
  const r = await produce();
  return decodeJwt(r.value).sub;
}`,
        errors: decodeError,
      },
    ],
  });
});

const responseOf = (fnName: string, module: string): string =>
  `import { decodeJwt } from 'jose';
import { ${fnName} } from '${module}';
export async function f() {
  const res = await ${fnName}(tokenUrl);
  const tokens = await res.json();
  return decodeJwt(tokens.id_token).sub;
}`;

describe('provenance through Response-typed functions', () => {
  ruleTester.run('fetch wrappers', noDecodeWithoutVerify, {
    valid: [
      {
        name: 'Promise<Response> from node-fetch',
        filename: FILE,
        code: responseOf('viaNodeFetch', './http.js'),
      },
      {
        name: 'Response from node-fetch, unwrapped',
        filename: FILE,
        code: responseOf('plainResponse', './http.js'),
      },
      {
        name: 'the platform Response',
        filename: FILE,
        code: responseOf('platformFetch', './http-platform.js'),
      },
      {
        name: 'a Response re-exported from node-fetch',
        filename: FILE,
        code: responseOf('viaReexport', './http-via-reexport.js'),
      },
      {
        name: 'an undici request re-exported through a relative module',
        filename: FILE,
        code: responseOf('undiciRequest', './result.js'),
      },
      {
        name: 'JSON.parse of a fetched body',
        filename: FILE,
        code: `import { decodeJwt } from 'jose';
export async function f() {
  const text = await (await fetch(tokenUrl)).text();
  return decodeJwt(JSON.parse(text).id_token).sub;
}`,
      },
    ],
    invalid: [
      ...[
        ['axiosTyped', 'an axios response type is not a fetch Response'],
        ['untyped', 'a function with no declared return type'],
        ['unknownType', 'a return type that resolves to nothing'],
        ['bareFoo', 'a Promise with no type argument'],
        ['qualified', 'a qualified return type'],
      ].map(([fnName, name]) => ({
        name: `${name} proves nothing`,
        filename: FILE,
        code: responseOf(fnName!, './http.js'),
        errors: decodeError,
      })),
      {
        // @found PR #1195 review (CodeRabbit, utils/provenance.ts:293)
        name: 'FN: a local interface named Response is not the platform Response',
        filename: FILE,
        code: `import { decodeJwt } from 'jose';
interface Response { token: string }
async function getReq(): Promise<Response> {
  if (cached) return cached;
  return readIncoming();
}
export async function f() {
  return decodeJwt((await getReq()).token).sub;
}`,
        errors: decodeError,
      },
      {
        name: 'a local type alias named Response is not the platform Response',
        filename: FILE,
        code: `import { decodeJwt } from 'jose';
export type Response = { token: string };
async function getReq(): Promise<Response> {
  if (cached) return cached;
  return readIncoming();
}
export async function f() {
  return decodeJwt((await getReq()).token).sub;
}`,
        errors: decodeError,
      },
      {
        name: 'a Response imported from a module that cannot be read is not the platform Response',
        filename: FILE,
        code: `import { decodeJwt } from 'jose';
import type { Response } from './no-such-types';
async function getReq(): Promise<Response> {
  if (cached) return cached;
  return readIncoming();
}
export async function f() {
  return decodeJwt((await getReq()).token).sub;
}`,
        errors: decodeError,
      },
      {
        name: 'JSON.parse with nothing to parse proves nothing',
        filename: FILE,
        code: `import { decodeJwt } from 'jose';
export const f = () => decodeJwt(JSON.parse().id_token).sub;`,
        errors: decodeError,
      },
      {
        name: 'a local JSON binding is not the platform JSON',
        filename: FILE,
        code: `import { decodeJwt } from 'jose';
export async function f(JSON) {
  const text = await (await fetch(tokenUrl)).text();
  return decodeJwt(JSON.parse(text).id_token).sub;
}`,
        errors: decodeError,
      },
      {
        name: 'a Response-typed function declared inside another is not read',
        filename: FILE,
        code: `import { decodeJwt } from 'jose';
export async function f() {
  async function local(url): Promise<Response> { return send(url); }
  const tokens = await (await local(tokenUrl)).json();
  return decodeJwt(tokens.id_token).sub;
}`,
        errors: decodeError,
      },
      ...[
        [
          'gone',
          './reexport.js',
          'a re-export of a module that does not exist',
        ],
        ['loopA', './reexport.js', 'a re-export cycle'],
        ['notExported', './result.js', 'a name the module does not export'],
        ['aliased', './result.js', 'an aliased local that is not a function'],
      ].map(([fnName, module, name]) => ({
        name: `${name} proves nothing`,
        filename: FILE,
        code: responseOf(fnName!, module!),
        errors: decodeError,
      })),
      {
        name: 'a default import from a relative module names no export',
        filename: FILE,
        code: `import { decodeJwt } from 'jose';
import send from './default.js';
export async function f() {
  const tokens = await (await send(tokenUrl)).json();
  return decodeJwt(tokens.id_token).sub;
}`,
        errors: decodeError,
      },
    ],
  });
});
