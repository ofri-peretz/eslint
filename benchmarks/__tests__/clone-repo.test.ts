import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { cloneRepo } from '../lib/clone-repo';

const git = (cwd: string, ...args: string[]) =>
  execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf-8' });

const tmp: string[] = [];
afterEach(() => {
  for (const dir of tmp.splice(0))
    fs.rmSync(dir, { recursive: true, force: true });
});

describe('cloneRepo', () => {
  // `git checkout` carries a local edit across when the edited file is the same
  // in both commits, so HEAD reads as pinned while the tree is not the commit's.
  it('never measures a cached clone whose local edit survived the re-pin', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'clone-repo-'));
    tmp.push(root);
    const upstream = path.join(root, 'upstream');
    fs.mkdirSync(upstream);
    git(upstream, 'init', '--quiet');
    git(upstream, 'config', 'user.email', 't@t');
    git(upstream, 'config', 'user.name', 't');
    fs.writeFileSync(path.join(upstream, 'same.txt'), 'pristine\n');
    fs.writeFileSync(path.join(upstream, 'moves.txt'), 'one\n');
    git(upstream, 'add', '.');
    git(upstream, 'commit', '--quiet', '-m', 'one');
    git(upstream, 'tag', 'one');
    fs.writeFileSync(path.join(upstream, 'moves.txt'), 'two\n');
    git(upstream, 'commit', '--quiet', '-am', 'two');
    git(upstream, 'tag', 'two');

    const bench = path.join(root, 'bench');
    const dir = cloneRepo({ name: 'r', repo: upstream, commit: 'one' }, bench);
    fs.writeFileSync(path.join(dir, 'same.txt'), 'somebody edited this\n');

    const repinned = cloneRepo(
      { name: 'r', repo: upstream, commit: 'two' },
      bench,
    );

    expect(fs.readFileSync(path.join(repinned, 'same.txt'), 'utf-8')).toBe(
      'pristine\n',
    );
    expect(fs.readFileSync(path.join(repinned, 'moves.txt'), 'utf-8')).toBe(
      'two\n',
    );
    // The edit is somebody's work: kept beside the replacement, not discarded.
    const kept = fs
      .readdirSync(bench)
      .find((f) => f.startsWith('.r.ilb-replaced-'));
    expect(kept).toBeDefined();
    expect(fs.readFileSync(path.join(bench, kept!, 'same.txt'), 'utf-8')).toBe(
      'somebody edited this\n',
    );
  });
});
