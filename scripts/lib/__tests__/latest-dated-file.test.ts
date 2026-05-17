import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { latestDatedFile, latestDatedFileStrict } from '../latest-dated-file.js';

let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'latest-dated-test-'));
  writeFileSync(join(root, '2026-05-09.json'), '');
  writeFileSync(join(root, '2026-05-10.json'), '');
  writeFileSync(join(root, '2026-05-11.json'), '');
  writeFileSync(join(root, '2026-05-10-v2.json'), ''); // dated but non-strict
  writeFileSync(join(root, 'baseline.json'), '');
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('latestDatedFile', () => {
  it('returns the newest dated file', () => {
    const path = latestDatedFile(root);
    expect(path).toEqual(join(root, '2026-05-11.json'));
  });

  it('prefers any dated file over non-dated names like baseline.json', () => {
    expect(latestDatedFile(root)).toMatch(/2026-05-/);
  });

  it('returns null for a missing directory', () => {
    expect(latestDatedFile(join(root, 'does-not-exist'))).toBeNull();
  });
});

describe('latestDatedFileStrict', () => {
  it('ignores dated-but-non-strict variants', () => {
    const path = latestDatedFileStrict(root);
    expect(path).toEqual(join(root, '2026-05-11.json'));
  });

  it('returns null when no strict match exists', () => {
    const empty = mkdtempSync(join(tmpdir(), 'strict-empty-'));
    writeFileSync(join(empty, '2026-05-10-v2.json'), '');
    writeFileSync(join(empty, 'baseline.json'), '');
    expect(latestDatedFileStrict(empty)).toBeNull();
    rmSync(empty, { recursive: true, force: true });
  });
});
