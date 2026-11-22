/**
 * Lock for the one-screen /llms.txt.
 *
 * The previous file was a 100 KB list of every docs page. An index that a tool
 * has to truncate is not an index, and it charges every caller for the tail.
 * This holds the replacement to a budget, proves every link goes somewhere real,
 * and ties its plugin list to the security-linting skill's stack map so the two
 * cannot disagree about which plugins exist.
 *
 * Revert the route to the page list and the size and link checks go red.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildLlmsIndex, PLUGINS, SITE } from '@/lib/llms-index';

const DOCS = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REPO = join(DOCS, '..', '..');
const body = buildLlmsIndex();

describe('llms.txt is one screen', () => {
  it('stays inside the size budget', () => {
    expect(Buffer.byteLength(body)).toBeLessThanOrEqual(7_000);
    expect(body.split('\n').length).toBeLessThanOrEqual(60);
  });

  it('starts with a title and a one-line summary', () => {
    const [h1, blank, summary] = body.split('\n');
    expect(h1).toMatch(/^# \S/);
    expect(blank).toBe('');
    expect(summary).toMatch(/^> /);
  });

  it('links only to docs pages that exist', () => {
    const links = [
      ...body.matchAll(
        /\]\((https:\/\/eslint\.interlace\.tools\/docs\/[^)]+)\)/g,
      ),
    ].map((m) => m[1]);
    expect(links.length).toBeGreaterThan(20);
    for (const url of links) {
      const slug = url.slice(`${SITE}/docs/`.length);
      const base = join(DOCS, 'content/docs', slug);
      expect(
        existsSync(`${base}.mdx`) || existsSync(join(base, 'index.mdx')),
        url,
      ).toBe(true);
    }
  });

  it('lists every plugin in the skill stack map, and no plugin that does not exist', () => {
    const map = JSON.parse(
      readFileSync(
        join(REPO, 'skills/security-linting/references/stack-map.json'),
        'utf8',
      ),
    );
    const mapped = map.plugins
      .map((p: { package: string }) => p.package.replace('eslint-plugin-', ''))
      .sort();
    expect(PLUGINS.map(([n]) => n).sort()).toEqual(mapped);
    for (const [n] of PLUGINS)
      expect(
        existsSync(
          join(REPO, 'packages', `eslint-plugin-${n}`, 'package.json'),
        ),
        n,
      ).toBe(true);
  });

  it('says how to use the skill and states its limits', () => {
    expect(body).toContain('claude plugin install interlace@interlace');
    expect(body).toContain('npx skills add ofri-peretz/eslint');
    expect(body).toMatch(/## Limits/);
  });
});

describe('llms routes', () => {
  const read = (p: string) => readFileSync(join(DOCS, 'src', p), 'utf8');

  it('llms.txt serves the short index and llms-full.txt keeps the full page list', () => {
    expect(read('app/llms.txt/route.ts')).toContain('buildLlmsIndex');
    expect(read('app/llms.txt/route.ts')).not.toContain('source.getPages');
    const full = read('app/llms-full.txt/route.ts');
    expect(full).toContain('source.getPages()');
    expect(full).toContain('Documentation index');
  });
});
