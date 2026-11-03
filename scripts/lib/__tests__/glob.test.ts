import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { globSync } from '../glob';

const tree = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'glob-'));
  for (const f of ['a.md', 'sub/b.md', 'sub/c.mdx', 'node_modules/x/d.md']) {
    fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true });
    fs.writeFileSync(path.join(root, f), '');
  }
  fs.mkdirSync(path.join(root, 'dir.md'));
  return root;
};

describe('globSync over node:fs', () => {
  it('keeps the glob-package options this repo relies on', () => {
    const cwd = tree();
    expect(globSync('**/*.md', { cwd })).toEqual([
      'a.md',
      'dir.md',
      'node_modules/x/d.md',
      'sub/b.md',
    ]);
    expect(
      globSync('**/*.{md,mdx}', {
        cwd,
        nodir: true,
        ignore: '**/node_modules/**',
      }),
    ).toEqual(['a.md', 'sub/b.md', 'sub/c.mdx']);
    expect(globSync('sub/*.md', { cwd, absolute: true })).toEqual([
      path.join(cwd, 'sub/b.md'),
    ]);
  });
});
