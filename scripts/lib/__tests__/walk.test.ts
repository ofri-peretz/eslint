/**
 * Unit tests for scripts/lib/walk.ts.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { walkFiles } from '../walk.js';

let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'walk-test-'));
  mkdirSync(join(root, 'src/nested'), { recursive: true });
  mkdirSync(join(root, 'src/node_modules/foo'), { recursive: true });
  mkdirSync(join(root, 'src/dist'), { recursive: true });
  writeFileSync(join(root, 'src/a.ts'), '');
  writeFileSync(join(root, 'src/b.js'), '');
  writeFileSync(join(root, 'src/nested/c.ts'), '');
  writeFileSync(join(root, 'src/node_modules/foo/d.ts'), '');
  writeFileSync(join(root, 'src/dist/e.ts'), '');
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('walkFiles', () => {
  it('yields all files when no filter is given', () => {
    const files = [...walkFiles(join(root, 'src'))].map((p) => p.replace(root, ''));
    expect(files.sort()).toEqual(['/src/a.ts', '/src/b.js', '/src/nested/c.ts']);
  });

  it('honours the extensions filter', () => {
    const files = [...walkFiles(join(root, 'src'), { extensions: ['.ts'] })].map(
      (p) => p.replace(root, ''),
    );
    expect(files.sort()).toEqual(['/src/a.ts', '/src/nested/c.ts']);
  });

  it('returns relative paths when relativeTo is set', () => {
    const files = [
      ...walkFiles(join(root, 'src'), { relativeTo: root, extensions: ['.ts'] }),
    ];
    expect(files.sort()).toEqual(['src/a.ts', 'src/nested/c.ts']);
  });

  it('skips node_modules + dist by default', () => {
    const files = [...walkFiles(join(root, 'src'), { extensions: ['.ts'] })];
    expect(files.some((p) => p.includes('node_modules'))).toBe(false);
    expect(files.some((p) => p.includes('dist'))).toBe(false);
  });

  it('honours an explicit skipDirs override', () => {
    const files = [
      ...walkFiles(join(root, 'src'), {
        skipDirs: ['node_modules'],
        extensions: ['.ts'],
      }),
    ];
    expect(files.some((p) => p.includes('dist'))).toBe(true);
    expect(files.some((p) => p.includes('node_modules'))).toBe(false);
  });

  it('returns nothing when the directory does not exist', () => {
    expect([...walkFiles(join(root, 'does-not-exist'))]).toEqual([]);
  });
});
