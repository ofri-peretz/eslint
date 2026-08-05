import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { overlayJs } from '../lib/overlay-js';

/**
 * Regression lock for the sole producer of published JavaScript.
 *
 * tsconfig.lib.json sets `emitDeclarationOnly`, so the first tsc pass emits
 * declarations only and this overlay is what puts runtime code into dist/. An
 * earlier version copied a .js only where the target already existed — safe
 * only while pass 1 also emitted .js. Restoring that guard now would copy
 * nothing and publish packages with no executable code, so these tests assert
 * the copy happens into directories that do NOT yet exist.
 */
describe('overlayJs', () => {
  let root: string;
  beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'overlay-')); });
  afterEach(() => { rmSync(root, { recursive: true, force: true }); });

  const src = () => join(root, 'from');
  const dst = () => join(root, 'to');

  it('copies a nested .js into a target tree that does not exist yet', () => {
    mkdirSync(join(src(), 'rules', 'deep'), { recursive: true });
    writeFileSync(join(src(), 'rules', 'deep', 'index.js'), 'module.exports=1;');
    mkdirSync(dst(), { recursive: true }); // dist/src exists, nested dirs do not

    const copied = overlayJs(src(), dst());

    expect(copied, 'nested .js was not copied — the target dir did not pre-exist').toBe(1);
    expect(existsSync(join(dst(), 'rules', 'deep', 'index.js'))).toBe(true);
    expect(readFileSync(join(dst(), 'rules', 'deep', 'index.js'), 'utf8')).toBe('module.exports=1;');
  });

  it('overwrites an existing .js', () => {
    mkdirSync(src(), { recursive: true });
    mkdirSync(dst(), { recursive: true });
    writeFileSync(join(src(), 'a.js'), 'new');
    writeFileSync(join(dst(), 'a.js'), 'old');

    expect(overlayJs(src(), dst())).toBe(1);
    expect(readFileSync(join(dst(), 'a.js'), 'utf8')).toBe('new');
  });

  it('copies only .js — declarations from pass 1 must survive', () => {
    mkdirSync(src(), { recursive: true });
    mkdirSync(dst(), { recursive: true });
    writeFileSync(join(src(), 'a.js'), 'js');
    writeFileSync(join(src(), 'a.d.ts'), 'stripped-declaration');
    writeFileSync(join(dst(), 'a.d.ts'), 'good-declaration');

    expect(overlayJs(src(), dst())).toBe(1);
    // .d.ts comments power editor hovers; the strip pass must not clobber them.
    expect(readFileSync(join(dst(), 'a.d.ts'), 'utf8')).toBe('good-declaration');
  });

  it('returns 0 when there is no .js at all — the caller treats this as fatal', () => {
    mkdirSync(src(), { recursive: true });
    mkdirSync(dst(), { recursive: true });
    writeFileSync(join(src(), 'a.d.ts'), 'decl');
    expect(overlayJs(src(), dst())).toBe(0);
  });
});
