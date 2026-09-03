import { describe, it, expect } from 'vitest';

import { syncVersionsInContent, VERSION_PATTERNS } from '../sync-source-versions';

/**
 * Locks the `sync-source-versions` core. The script is wired into
 * `changeset:version`, so it runs on every release to keep each plugin's
 * hardcoded `plugin.meta.version` matched to package.json. The published
 * 3.0.3 / 3.0.5 plugins shipped with drifted metadata (`meta.version: '1.0.0'`
 * vs package 3.0.3) — this sync is the guard against that, so its core must be
 * correct AND must fail loudly rather than silently mis-sync.
 */
describe('syncVersionsInContent', () => {
  const metaSrc = (v: string) =>
    `export const plugin = {\n  meta: { name: 'eslint-plugin-x', version: '${v}' },\n  rules,\n};\n`;

  it('rewrites a drifted plugin.meta.version to the target', () => {
    const { content, updates, errors } = syncVersionsInContent(metaSrc('1.0.0'), '3.0.4');
    expect(errors).toHaveLength(0);
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({ pattern: 'plugin.meta.version', oldVersion: '1.0.0' });
    expect(content).toContain("version: '3.0.4'");
    expect(content).not.toContain('1.0.0');
  });

  it('rewrites a VERSION constant and a version export', () => {
    const r1 = syncVersionsInContent(`export const VERSION = '0.1.0';`, '0.2.0');
    expect(r1.errors).toHaveLength(0);
    expect(r1.content).toContain("VERSION = '0.2.0'");

    const r2 = syncVersionsInContent(`export const version = '0.1.0';`, '0.2.0');
    expect(r2.errors).toHaveLength(0);
    expect(r2.content).toContain("version = '0.2.0'");
  });

  it('is a clean no-op when already in sync', () => {
    const { content, updates, errors } = syncVersionsInContent(metaSrc('3.0.4'), '3.0.4');
    expect(updates).toHaveLength(0);
    expect(errors).toHaveLength(0);
    expect(content).toBe(metaSrc('3.0.4'));
  });

  it('does not touch files with no version constant', () => {
    const src = `export const plugin = { rules };\n`;
    const { updates, errors } = syncVersionsInContent(src, '9.9.9');
    expect(updates).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });

  // The regression lock for the hardening: when a pattern's findRegex detects a
  // drifted version but its replace regex cannot rewrite it (find/replace pair
  // out of sync), the function MUST record an error — so `main()` exits 1 and the
  // Version PR fails loudly instead of silently producing a stale meta.version.
  it('flags an error when a detected drift cannot be rewritten (find/replace divergence)', () => {
    const divergent: typeof VERSION_PATTERNS = [
      { name: 'divergent', findRegex: /TAG=([\d.]+)/, regex: /THIS_WILL_NEVER_MATCH/ },
    ];
    const { content, updates, errors } = syncVersionsInContent('TAG=1.0.0', '2.0.0', divergent);
    expect(updates).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ pattern: 'divergent', detectedVersion: '1.0.0' });
    expect(content).toBe('TAG=1.0.0'); // unchanged — and NOT reported as a successful update
  });

  // One call can hit multiple patterns: a good one must still be applied while a
  // diverged one is flagged — so the rewrite isn't lost AND the run still fails.
  it('accumulates both an update and an error when patterns are mixed', () => {
    const mixed: typeof VERSION_PATTERNS = [
      VERSION_PATTERNS[1]!, // 'VERSION constant' — rewrites successfully
      { name: 'divergent', findRegex: /TAG=([\d.]+)/, regex: /THIS_WILL_NEVER_MATCH/ },
    ];
    const src = `export const VERSION = '0.1.0';\nTAG=0.1.0`;
    const { content, updates, errors } = syncVersionsInContent(src, '1.0.0', mixed);
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({ pattern: 'VERSION constant', oldVersion: '0.1.0' });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ pattern: 'divergent', detectedVersion: '0.1.0' });
    expect(content).toContain("VERSION = '1.0.0'"); // the good rewrite still landed
  });
});
