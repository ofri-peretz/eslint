/**
 * Lock: the Interlace docs components stay wired.
 *
 * - Tables fold into cards on a narrow column. `rehype-table-stack` labels every body cell
 *   with its column header and `table-stack.css` does the folding; either half alone leaves
 *   a wide screen unchanged and a phone scrolling sideways, so both are checked.
 * - A shell fence of only `npm install` lines becomes npm/pnpm/yarn/bun tabs.
 *
 * Both come from `interlace/docs-baseline` in the agents repo.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { stackTable } from '#interlace/config/rehype-table-stack.mjs';
import { isInstallFence } from '#interlace/config/remark-install-tabs.mjs';

const ROOT = join(__dirname, '..', '..');
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

interface Node {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: Node[];
}

const cell = (tagName: 'th' | 'td', value: string): Node => ({
  type: 'element',
  tagName,
  properties: {},
  children: value === '' ? [] : [{ type: 'text', value }],
});
const row = (...cells: Node[]): Node => ({
  type: 'element',
  tagName: 'tr',
  properties: {},
  children: cells,
});
const table = (head: string[], ...body: string[][]): Node => ({
  type: 'element',
  tagName: 'table',
  properties: {},
  children: [
    {
      type: 'element',
      tagName: 'thead',
      properties: {},
      children: [row(...head.map((v) => cell('th', v)))],
    },
    {
      type: 'element',
      tagName: 'tbody',
      properties: {},
      children: body.map((values) => row(...values.map((v) => cell('td', v)))),
    },
  ],
});
const kids = (node: Node | undefined, tag: string) =>
  (node?.children ?? []).filter((c) => c.tagName === tag);

describe('tables fold into cards', () => {
  it('labels every body cell with its column header and keeps the table roles', () => {
    const t = table(['Option', 'Default'], ['severity', 'error']);
    expect(stackTable(t)).toBe(true);
    expect(t.properties).toMatchObject({ 'data-stack': '', role: 'table' });
    const cells = kids(kids(kids(t, 'tbody')[0], 'tr')[0], 'td');
    expect(cells.map((c) => c.properties)).toEqual([
      { role: 'cell', 'data-label': 'Option' },
      { role: 'cell', 'data-label': 'Default' },
    ]);
  });

  it('leaves a table with no header row alone', () => {
    const t: Node = {
      type: 'element',
      tagName: 'table',
      properties: {},
      children: [],
    };
    expect(stackTable(t)).toBe(false);
    expect(t.properties).toEqual({});
  });

  it('is wired into the MDX pipeline and the stylesheet', () => {
    expect(read('source.config.ts')).toMatch(
      /rehypePlugins:\s*\[[^\]]*rehypeTableStack/,
    );
    expect(read('src/app/global.css')).toContain(
      "@import '../../.interlace/css/table-stack.css';",
    );
    const css = read('.interlace/css/table-stack.css');
    expect(css).toMatch(/@container \(max-width: 30rem\)/);
    expect(css).toMatch(/\[data-label\]::before/);
  });
});

describe('install commands get a tab per package manager', () => {
  const fence = (value: string, lang = 'bash', meta: string | null = null) => ({
    type: 'code',
    lang,
    meta,
    value,
  });

  it('takes a fence of only npm installs', () => {
    expect(
      isInstallFence(fence('npm install eslint-plugin-secure-coding')),
    ).toBe(true);
    expect(isInstallFence(fence('npm i -D a b\nnpm install c'))).toBe(true);
  });

  it('leaves any other command, a titled fence or another language as it is', () => {
    expect(isInstallFence(fence('npx eslint .'))).toBe(false);
    expect(isInstallFence(fence('npm install x\nnpx x'))).toBe(false);
    expect(
      isInstallFence(fence('npm install x', 'bash', 'title="install"')),
    ).toBe(false);
    expect(isInstallFence(fence('npm install x', 'yaml'))).toBe(false);
  });

  it('is wired into the MDX pipeline', () => {
    expect(read('source.config.ts')).toMatch(
      /remarkPlugins:\s*\[[^\]]*remarkInstallTabs/,
    );
  });
});
