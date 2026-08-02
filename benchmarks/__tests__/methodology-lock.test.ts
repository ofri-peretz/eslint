/**
 * Regression lock for the squash-proof methodology receipt (roadmap item 1.5).
 *
 * The bug this locks: `methodologyCommit` is `git rev-parse HEAD` on a *branch*.
 * This repo squash-merges, so that commit never lands in `main` and is
 * unreachable from a fresh clone — the receipt cited in published articles
 * resolves today only because GitHub keeps PR refs alive. `methodologyHash` is
 * the content-addressed replacement. If a suite silently stops emitting it, we
 * are back to unresolvable receipts, so that regression is caught here.
 *
 *   npx vitest run --root benchmarks
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, it, expect } from 'vitest';

import { captureMethodology, collectMethodologyFiles, verifyMethodologyHash } from '../lib/methodology.ts';
import { capturePreregistration } from '../lib/preregister.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BENCHMARKS = path.resolve(HERE, '..');
const REPO_ROOT = path.resolve(BENCHMARKS, '..');

/** Every file that builds a result envelope with a pre-registration receipt. */
function findEmittingSources(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
        walk(p);
      } else if (/\.(ts|mjs|js)$/.test(entry.name)) {
        if (fs.readFileSync(p, 'utf8').includes('methodologyCommit:')) out.push(p);
      }
    }
  };
  walk(path.join(BENCHMARKS, 'suites'));
  out.push(path.join(BENCHMARKS, 'score.ts'));
  return out.filter((p) => fs.readFileSync(p, 'utf8').includes('methodologyCommit:'));
}

describe('methodology receipt — emission lock', () => {
  const sources = findEmittingSources();

  it('finds the suites that emit a pre-registration receipt', () => {
    // Guards the guard: a broken walker would vacuously pass every case below.
    expect(sources.length).toBeGreaterThanOrEqual(13);
  });

  it.each(sources.map((p) => [path.relative(REPO_ROOT, p), p]))(
    '%s emits methodologyHash + methodologyPaths alongside methodologyCommit',
    (_rel, file) => {
      const source = fs.readFileSync(file as string, 'utf8');
      expect(source).toMatch(/methodologyHash:/);
      expect(source).toMatch(/methodologyPaths:/);
    },
  );

  it.each(sources.map((p) => [path.relative(REPO_ROOT, p), p]))(
    '%s derives the receipt from the shared helper, never a raw git call',
    (_rel, file) => {
      const source = fs.readFileSync(file as string, 'utf8');
      expect(source).toContain('capturePreregistration');
      // A per-suite `git rev-parse HEAD` is how the squash-fragile SHA got
      // hand-rolled in two suites; toolchain.ts is the precedent for one
      // shared implementation.
      expect(source).not.toMatch(/rev-parse["']?,?\s*["']?HEAD/);
      expect(source).toMatch(/entrypoint:\s*import\.meta\.url/);
    },
  );
});

describe('captureMethodology', () => {
  it('produces a sha256-prefixed hash and a self-describing path list', () => {
    const { methodologyHash, methodologyPaths } = captureMethodology(import.meta.url);
    expect(methodologyHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(methodologyPaths[0]).toBe('benchmarks/__tests__/methodology-lock.test.ts');
    expect(methodologyPaths).toContain('benchmarks/lib/methodology.ts');
  });

  it('follows repo-local imports transitively and skips bare specifiers', () => {
    // preregister.ts imports methodology.ts, which imports nothing repo-local.
    const paths = collectMethodologyFiles(path.join(BENCHMARKS, 'lib/preregister.ts'));
    expect(paths).toEqual(['benchmarks/lib/preregister.ts', 'benchmarks/lib/methodology.ts']);
    expect(paths.some((p) => p.includes('node_modules') || p.startsWith('node:'))).toBe(false);
  });

  it('is exactly the documented `cat <paths> | shasum -a 256`', () => {
    const { methodologyHash, methodologyPaths } = captureMethodology(path.join(BENCHMARKS, 'lib/preregister.ts'));
    const concatenated = createHash('sha256');
    for (const rel of methodologyPaths) concatenated.update(fs.readFileSync(path.join(REPO_ROOT, rel)));
    expect(methodologyHash).toBe(`sha256:${concatenated.digest('hex')}`);
  });

  it('moves when a covered file changes — the whole point of a content hash', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ilb-methodology-'));
    const entry = path.join(dir, 'run.mjs');
    const dep = path.join(dir, 'method.mjs');
    fs.writeFileSync(dep, 'export const scale = 1;\n');
    fs.writeFileSync(entry, "import { scale } from './method.mjs';\nexport default scale;\n");

    const before = captureMethodology(entry).methodologyHash;
    fs.writeFileSync(dep, 'export const scale = 2;\n');
    const after = captureMethodology(entry).methodologyHash;

    expect(before).not.toBe(after);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('verifies a matching receipt and rejects a tampered one', () => {
    const receipt = captureMethodology(path.join(BENCHMARKS, 'lib/methodology.ts'));
    expect(verifyMethodologyHash(receipt).ok).toBe(true);
    expect(verifyMethodologyHash({ ...receipt, methodologyHash: `sha256:${'0'.repeat(64)}` }).ok).toBe(false);
    expect(verifyMethodologyHash({ ...receipt, methodologyPaths: [] }).ok).toBe(false);
  });
});

describe('capturePreregistration', () => {
  it('carries the receipt only when the caller declares its entrypoint', () => {
    const withEntry = capturePreregistration({ allowDirty: true, entrypoint: import.meta.url });
    expect(withEntry.methodologyHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(withEntry.methodologyPaths.length).toBeGreaterThan(0);

    const without = capturePreregistration({ allowDirty: true });
    expect(without.methodologyHash).toBeNull();
    expect(without.methodologyPaths).toEqual([]);
  });
});
