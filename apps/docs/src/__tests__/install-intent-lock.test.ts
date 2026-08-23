/**
 * Lock for install-intent tracking.
 *
 * `install:command_click` is the closest thing this site has to a conversion:
 * npm is the largest external referrer, the North Star is downloads, and the
 * star/follow CTAs we already measure convert at roughly zero. It went
 * unmeasured until 2026-08-22, so this pins the parts that would silently
 * remove it again.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p: string) => readFileSync(join(ROOT, 'src', p), 'utf-8');

describe('install intent: events stay typed', () => {
  it('keeps both events in the typed map', () => {
    const analytics = read('lib/analytics.ts');
    expect(analytics).toMatch(/'install:command_click':\s*\{/);
    expect(analytics).toMatch(/'install:pm_update':\s*\{/);
  });

  it('records which package manager and which packages were taken', () => {
    // Without `packages`, copy volume is a single undifferentiated number and
    // per-plugin adoption intent is unrecoverable.
    const analytics = read('lib/analytics.ts');
    const block = analytics.slice(analytics.indexOf("'install:command_click'"));
    expect(block).toMatch(/packageManager:/);
    expect(block).toMatch(/packages:/);
    expect(block).toMatch(/surface:/);
  });
});

describe('install intent: the snippet stays instrumented', () => {
  const snippet = () => read('components/mdx/install-snippet.tsx');

  it('tracks copies and package-manager switches', () => {
    expect(snippet()).toMatch(/track\('install:command_click'/);
    expect(snippet()).toMatch(/track\('install:pm_update'/);
  });

  it('observes via capture-phase clicks, not Fumadocs internals', () => {
    // The copy control belongs to fumadocs-ui. Depending on its markup would
    // break silently on a library upgrade; a capture listener on our own
    // wrapper does not.
    expect(snippet()).toMatch(/onClickCapture/);
  });

  it('dedupes rapid repeat copies', () => {
    // One intent, not two, when a reader copies again after switching PM.
    expect(snippet()).toMatch(/lastCopyAt/);
  });

  it('never lets analytics break copying a command', () => {
    expect(snippet()).toMatch(/catch\s*\{/);
  });
});
