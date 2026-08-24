/**
 * Docs content link & title integrity lock.
 *
 * Two silent UX breakers, both found by walking real journeys (2026-08-24):
 *
 * 1. Rule .md sources link sibling rules as `./other-rule.md` — right on
 *    GitHub, a guaranteed 404 on the site. 447 such links across 228 published
 *    pages made every "Related Rules" section a dead end, capping engaged
 *    visitors at one page per session. The sync script now rewrites them; this
 *    lock catches any committed page (or future generator regression) that
 *    reintroduces one.
 *
 * 2. All 26 plugin overview pages were titled 'Overview' — 26 identical
 *    browser-tab titles and near-duplicate SEO titles for the most-trafficked
 *    pages on the site (the vercel-ai-security overview out-traffics the
 *    homepage). Titles must name the package.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { globSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const APP = join(__dirname, '../..');
const CONTENT = join(APP, 'content/docs');

describe('docs content: links and titles', () => {
  const mdx = globSync('**/*.mdx', { cwd: CONTENT });

  it('finds content to audit (guards a vacuous pass)', () => {
    expect(mdx.length).toBeGreaterThan(400);
  });

  it('no page links a sibling document as a raw .md file', () => {
    const offenders: string[] = [];
    for (const rel of mdx) {
      const body = readFileSync(join(CONTENT, rel), 'utf8');
      if (/\]\(\s*(?:\.\/)?[a-z0-9][a-z0-9-]*\.md\s*\)/.test(body)) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });

  it('the rule-docs generator rewrites .md links, so regeneration cannot regress', () => {
    const sync = readFileSync(join(APP, 'scripts/sync-rules-docs.ts'), 'utf8');
    expect(sync).toMatch(/\]\\\(\\s\*\(\?:\\\.\\\/\)\?/);
    expect(sync).toContain("'](./$1)'");
  });

  it('every plugin overview is titled by its package, never "Overview"', () => {
    const overviews = globSync('*/plugin-*/index.mdx', { cwd: CONTENT });
    expect(overviews.length).toBeGreaterThanOrEqual(20);
    for (const rel of overviews) {
      const body = readFileSync(join(CONTENT, rel), 'utf8');
      const slug = rel.split('/')[1]; // plugin-<name>
      expect(body, rel).toMatch(new RegExp(`^title: eslint-${slug}$`, 'm'));
      expect(body, rel).not.toMatch(/^title: '?Overview'?$/m);
    }
  });
});
