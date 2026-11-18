/**
 * Lock: the README's "Used by" table only names repositories that really ship our plugins.
 *
 * Offline (every PR): each row links to one file on GitHub and names plugins that exist
 * in packages/. Live (USED_BY_LIVE=1, weekly in check-links.yml): that file still
 * mentions every plugin the row names, so an adopter who drops us gets taken off.
 *
 * Proven by naming `secure-coding` on the laststance/gitbox row: the live check fails.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '..', '..');
const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
const section = readme.split('## Used by')[1]?.split('\n## ')[0] ?? '';

const ROW =
  /^\|\s*\[([\w.-]+\/[\w.-]+)\]\((https:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/blob\/([\w.-]+)\/(\S+))\)\s*\|\s*([a-z-]+(?:, [a-z-]+)*)\s*\|$/;
const rows = section
  .split('\n')
  .filter((line) => line.startsWith('| ['))
  .map((line) => {
    const m = ROW.exec(line);
    return {
      line,
      name: m?.[1],
      url: m?.[2],
      repo: m?.[3],
      raw: m ? `https://raw.githubusercontent.com/${m[3]}/${m[4]}/${m[5]}` : '',
      plugins: m?.[6].split(', ') ?? [],
    };
  });

describe('README "Used by"', () => {
  it('has rows', () => {
    expect(rows.length).toBeGreaterThan(0);
  });

  it.each(rows)('$name links one file and names our plugins', (row) => {
    expect(
      row.url,
      'row shape: | [owner/repo](github blob url) | plugin, plugin |',
    ).toBeDefined();
    expect(row.name).toBe(row.repo);
    for (const plugin of row.plugins) {
      expect(
        existsSync(join(ROOT, 'packages', `eslint-plugin-${plugin}`)),
        plugin,
      ).toBe(true);
    }
  });

  it.runIf(process.env.USED_BY_LIVE === '1').each(rows)(
    '$name still ships what the row says',
    async ({ raw, plugins }) => {
      const res = await fetch(raw, { signal: AbortSignal.timeout(15_000) });
      expect(res.status, raw).toBe(200);
      const text = await res.text();
      for (const plugin of plugins)
        expect(text, plugin).toContain(`eslint-plugin-${plugin}`);
    },
    20_000,
  );
});
