/**
 * Unit tests for the cross-file resolver: the failure modes a rule test cannot
 * reach through a real file (a parser with no scope manager, a parser that
 * throws, the depth bound), plus the specifier forms it accepts.
 */
import { describe, it, expect } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { join } from 'node:path';
import {
  MAX_RESOLVE_DEPTH,
  parseModule,
  resolveExport,
  resolveIdentifier,
  resolveRelative,
} from './module-resolver';

const DIR = join(__dirname, '..', '..', 'fixtures', 'cross-file');
const SERVER = join(DIR, 'server.ts');
const BARREL = join(DIR, 'barrel.ts');

describe('resolveRelative', () => {
  it('resolves relative specifiers only', () => {
    expect(resolveRelative(SERVER, 'some-package')).toBeUndefined();
    expect(resolveRelative(SERVER, './no-such-module')).toBeUndefined();
  });

  it('maps a TypeScript-ESM .js import to its .ts source, and a directory to its index', () => {
    expect(resolveRelative(SERVER, './brand.js')).toBe(join(DIR, 'brand.ts'));
    expect(resolveRelative(SERVER, './dir')).toBe(join(DIR, 'dir', 'index.ts'));
    expect(resolveRelative(SERVER, './brand.ts')).toBe(join(DIR, 'brand.ts'));
  });
});

describe('parseModule', () => {
  it('returns undefined for a file that is not there', () => {
    expect(parseModule(join(DIR, 'nope.ts'), parser)).toBeUndefined();
  });

  it('abstains when the parser cannot give a scope manager', () => {
    const file = join(DIR, 'loader.ts');
    expect(parseModule(file, { parse: () => ({}) })).toBeUndefined();
    expect(
      parseModule(file, {
        parseForESLint: () => {
          throw new Error('syntax');
        },
      }),
    ).toBeUndefined();
    expect(
      parseModule(file, {
        parseForESLint: () => ({ ast: {}, scopeManager: null }),
      }),
    ).toBeUndefined();
  });

  it('caches a parsed module by path and modification time', () => {
    const file = join(DIR, 'schemas.ts');
    const first = parseModule(file, parser);
    expect(first).toBeDefined();
    expect(parseModule(file, parser)).toBe(first);
  });
});

describe('resolveExport', () => {
  it('is unknown when the module cannot be parsed', () => {
    expect(
      resolveExport(join(DIR, 'dynamic-default.ts'), 'ALIAS', {
        parser: {},
        depth: 0,
      }),
    ).toEqual({ kind: 'unknown' });
  });

  it('is unknown for `export * as ns` of a module that is not there', () => {
    expect(resolveExport(BARREL, 'nsMissing', { parser, depth: 0 })).toEqual({
      kind: 'unknown',
    });
  });

  it('is undefined for a name the module does not export', () => {
    expect(
      resolveExport(join(DIR, 'brand.ts'), 'NOPE', { parser, depth: 0 }),
    ).toBeUndefined();
  });

  it('gives up past the depth bound', () => {
    const past = { parser, depth: MAX_RESOLVE_DEPTH + 1 };
    expect(resolveExport(join(DIR, 'brand.ts'), 'BRAND', past)).toEqual({
      kind: 'unknown',
    });
    const parsed = parseModule(join(DIR, 'brand.ts'), parser)!;
    const id = { type: 'Identifier', name: 'BRAND' } as never;
    expect(
      resolveIdentifier(
        id,
        { scope: parsed.scope, file: join(DIR, 'brand.ts') },
        past,
      ),
    ).toEqual({
      kind: 'unknown',
    });
  });
});
