/**
 * Lock: the parsed-module cache is bounded.
 *
 * It is module state, so it outlives every linted file and every ESLint
 * instance. Unbounded, it held a parsed AST of every relatively-imported module
 * a run ever opened and took the 106k-file corpus gates past an 8 GB heap.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import parser from '@typescript-eslint/parser';
import {
  MAX_CACHED_MODULES,
  cachedModuleCount,
  loadModule,
} from './cross-file';

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'pg-module-cache-'));
afterAll(() => fs.rmSync(ROOT, { recursive: true, force: true }));

describe('parsed-module cache', () => {
  it('never holds more than MAX_CACHED_MODULES parsed modules', () => {
    const count = MAX_CACHED_MODULES + 20;
    const files = Array.from({ length: count }, (_, i) => {
      const file = path.join(ROOT, `m${i}.ts`);
      fs.writeFileSync(file, `export const value${i} = ${i};\n`);
      return file;
    });

    const first = loadModule(files[0], parser);
    expect(first).toBeTruthy();
    // A repeat read of a cached module is the same parse, not a re-parse.
    expect(loadModule(files[0], parser)).toBe(first);

    for (const file of files) loadModule(file, parser);
    expect(cachedModuleCount()).toBe(MAX_CACHED_MODULES);

    // The oldest entry was evicted: reading it again parses afresh.
    expect(loadModule(files[0], parser)).not.toBe(first);
    expect(cachedModuleCount()).toBe(MAX_CACHED_MODULES);
  });
});
