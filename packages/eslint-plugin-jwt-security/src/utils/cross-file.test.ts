/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Cross-file export resolution (`cross-file.ts`).
 *
 * One throwaway project on disk holds every export spelling the resolver
 * reads — CommonJS `exports.x`, `module.exports = { … }`, ESM `export const`,
 * `export { … }` and `export { … } from` — and every way a step can fail. Each
 * case asks which package an export of a relative module comes from.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as tsParser from '@typescript-eslint/parser';
import * as espree from 'espree';
import { relativeExportModule, parseFileCached } from './cross-file';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jwt-cross-file-'));
const write = (file: string, source: string): void => {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), source);
};

write(
  'cjs.js',
  [
    "const client = require('openid-client');",
    "const sub = require('got').extend;",
    'const local = makeLocal();',
    "const { a, b: renamed, ...rest } = require('axios');",
    'x = 1;',
    'run();',
    'exports.client = client;',
    "exports.direct = require('undici');",
    "exports.member = require('ky').create;",
    'exports.sub = sub;',
    'exports.local = local;',
    'exports.renamed = renamed;',
    'exports.rest = rest;',
    'exports.unbound = nowhere;',
    'exports.call = make();',
  ].join('\n'),
);
write(
  'whole.js',
  "const fetcher = require('node-fetch');\nmodule.exports = { ...base, fetcher, other: 1 };\n",
);
write('notobject.js', 'module.exports = factory();\n');
write(
  'esm.ts',
  [
    "import { got as g, 'quoted' as q } from 'got';",
    "import d from './default';",
    "import * as ns from './ns';",
    'export function helper() {}',
    "export const { destructured } = require('x');",
    "export const constant = require('openid-client');",
    'export { g as gotClient, d as fromDefault, ns as namespace, q as quoted };',
    "export { request as undiciRequest } from 'undici';",
    "export { client as chained } from './cjs';",
  ].join('\n'),
);
write('chain/index.ts', "export { next } from '../chain1';\n");
write('chain1.ts', "export { next } from './chain2';\n");
write('chain2.ts', "export { next } from './chain3';\n");
write('chain3.ts', "export { next } from './chain4';\n");
write('chain4.ts', "export { next } from 'openid-client';\n");
write('broken.ts', 'export const = ;\n');
write(
  'typed.ts',
  "import axios from 'axios';\nexport const http: typeof axios = axios;\nexport { axios };\n",
);

const FROM = path.join(root, 'main.ts');
const resolve = (spec: string, name: string, parser: unknown = tsParser) =>
  relativeExportModule(FROM, spec, name, parser);

describe('relativeExportModule', () => {
  it.each([
    ['exports.x = <require binding>', './cjs', 'client', 'openid-client'],
    ['exports.x = require(pkg)', './cjs.js', 'direct', 'undici'],
    ['exports.x = require(pkg).member', './cjs', 'member', 'ky'],
    ['a binding from require(pkg).member', './cjs', 'sub', 'got'],
    ['a renamed destructure of require(pkg)', './cjs', 'renamed', 'axios'],
    [
      'module.exports = { x } beside a spread',
      './whole',
      'fetcher',
      'node-fetch',
    ],
    ['export const x = require(pkg)', './esm', 'constant', 'openid-client'],
    ['export { local as x } of an import', './esm', 'gotClient', 'got'],
    ['export { x } from pkg', './esm', 'undiciRequest', 'undici'],
    [
      'export { x } from a relative module',
      './esm',
      'chained',
      'openid-client',
    ],
    ['a directory index', './chain', 'next', null],
    ['a string-named import', './esm', 'quoted', 'got'],
  ])('%s', (_name, spec, name, expected) => {
    expect(resolve(spec, name)).toBe(expected);
  });

  it.each([
    ['a missing module', './nope', 'client'],
    ['a module that does not parse', './broken', 'x'],
    ['an export the module does not have', './cjs', 'absent'],
    ['a local value that is not a module load', './cjs', 'local'],
    ['a rest element', './cjs', 'rest'],
    ['an unbound identifier', './cjs', 'unbound'],
    ['a call that is not require', './cjs', 'call'],
    ['module.exports of a non-object', './notobject', 'anything'],
    ['an object without that key', './whole', 'missing'],
    ['a default import from a relative module', './esm', 'fromDefault'],
    ['a namespace import from a relative module', './esm', 'namespace'],
    ['a destructured export const', './esm', 'destructured'],
  ])('%s abstains', (_name, spec, name) => {
    expect(resolve(spec, name)).toBeNull();
  });

  it('reads a TypeScript module with the fallback parser when the configured one cannot', () => {
    expect(resolve('./typed', 'axios', espree)).toBe('axios');
  });

  it('caches each parse, including a failed one', () => {
    const file = path.join(root, 'broken.ts');
    expect(parseFileCached(file, tsParser)).toBeNull();
    expect(parseFileCached(file, tsParser)).toBeNull();
    expect(
      parseFileCached(path.join(root, 'no-such-file.ts'), tsParser),
    ).toBeNull();
  });
});
