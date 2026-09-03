/**
 * Coverage-focused tests for resolver.ts, resolver-adapter.ts and
 * resolver-detection.ts edge branches.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { resolveModule, clearResolverCache } from './resolver';
import { resolveWithExternalResolvers, type ResolverSetting } from './resolver-adapter';
import { compareResolverPriority } from './resolver-detection';

beforeEach(() => {
  clearResolverCache();
});

describe('resolveModule edge branches', () => {
  it('handles a relative fromFile whose dirname walk terminates at "."', () => {
    // fromFile without a directory component → startDir '.' → the upward
    // cache walk hits `parent === dir` and breaks instead of looping forever.
    const result = resolveModule('some-nonexistent-package-xyz', 'file.ts');
    expect(result).toBeNull();
  });

  it('returns null when resolution throws unexpectedly (outer catch)', () => {
    // A `null` entry inside resolver settings makes the settings normalizer
    // call Object.entries(null), which throws — exercising the outer
    // defensive catch that guarantees resolveModule never crashes.
    const result = resolveModule('react-nonexistent-xyz', __filename, {
      resolverSettings: [null] as unknown as ResolverSetting,
    });
    expect(result).toBeNull();
  });
});

describe('resolveModule CSS resolution with directories masquerading as files', () => {
  let cssDir: string;

  beforeEach(() => {
    cssDir = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), 'resolver-css-cov-')),
    );
  });

  afterEach(() => {
    fs.rmSync(cssDir, { recursive: true, force: true });
  });

  it('skips extension candidates that exist but are directories', () => {
    // ./style + '.css' exists, but as a DIRECTORY → stats.isFile() is false
    fs.mkdirSync(path.join(cssDir, 'style.css'));
    const fromFile = path.join(cssDir, 'consumer.ts');
    fs.writeFileSync(fromFile, 'export {};', 'utf-8');

    const result = resolveModule('./style', fromFile, { cssSupport: true });
    expect(result).toBeNull();
  });

  it('skips index-file candidates that exist but are directories', () => {
    // ./comp/index.css exists, but as a DIRECTORY → stats.isFile() is false
    fs.mkdirSync(path.join(cssDir, 'comp', 'index.css'), { recursive: true });
    const fromFile = path.join(cssDir, 'consumer.ts');
    fs.writeFileSync(fromFile, 'export {};', 'utf-8');

    const result = resolveModule('./comp', fromFile, { cssSupport: true });
    expect(result).toBeNull();
  });
});

describe('resolveWithExternalResolvers settings normalization', () => {
  it('returns null for settings that are neither string, array, nor object', () => {
    const result = resolveWithExternalResolvers(
      './foo',
      __filename,
      42 as unknown as ResolverSetting,
    );
    expect(result).toBeNull();
  });

  it('ignores array items that are neither strings nor objects', () => {
    // A numeric entry falls through both normalizer branches and is dropped;
    // with no usable resolver configured the result is null (not a crash).
    const result = resolveWithExternalResolvers(
      './foo',
      __filename,
      [42] as unknown as ResolverSetting,
    );
    expect(result).toBeNull();
  });
});

describe('compareResolverPriority', () => {
  it('orders known resolvers by priority list position', () => {
    expect(compareResolverPriority('typescript', 'webpack')).toBeLessThan(0);
    expect(compareResolverPriority('css', 'vite')).toBeGreaterThan(0);
    expect(compareResolverPriority('rollup', 'rollup')).toBe(0);
  });

  it('sorts unknown resolver names after all known ones', () => {
    expect(compareResolverPriority('custom-resolver', 'css')).toBeGreaterThan(0);
    expect(compareResolverPriority('typescript', 'custom-resolver')).toBeLessThan(0);
    expect(compareResolverPriority('unknown-a', 'unknown-b')).toBe(0);
  });
});
