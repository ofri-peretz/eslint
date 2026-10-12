/**
 * @provenBy {"file":"benchmarks/lib/clone-repo.ts","find":"'--quiet', `${commit}^{commit}`]","replace":"'--quiet', commit]"}
 * @provenBy {"file":"benchmarks/lib/clone-repo.ts","find":"  const staging = fs.mkdtempSync(","replace":"  if (existed) fs.rmSync(dir, { recursive: true, force: true });\n  const staging = fs.mkdtempSync("}
 * @provenBy {"file":"benchmarks/lib/clone-repo.ts","find":"  if (hasLocalWork(retired)) {","replace":"  if (false) {"}
 *
 * Lock: the corpus clone helper never destroys a clone it cannot replace, and
 * an annotated-tag pin counts as pinned.
 *
 * Reproduced in the full ILB-Wild run of 2026-10-12: three.js (`r170`) and
 * next.js (`v15.1.0`) were deleted from ~/repos/ofriperetz.dev/oos and the run
 * reported "Could not pin". Both pins are ANNOTATED tags, and
 * `git rev-parse <tag>` returns the tag object's SHA — which no HEAD can equal.
 * So the cached clone (at exactly the right commit) read as "cannot reach",
 * `cloneRepo` rm -rf'd it, the fresh `git clone --branch r170` succeeded, and
 * the same comparison then rejected and deleted that too. The by-hand clone
 * "succeeding" afterwards was the same clone; only the check was wrong.
 *
 * The fixtures are local repositories served over file://, so this needs no
 * network.
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from 'vitest';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
  readFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cloneRepo } from '../../benchmarks/lib/clone-repo';

const git = (...args: string[]) =>
  execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 't',
      GIT_AUTHOR_EMAIL: 't@t',
      GIT_COMMITTER_NAME: 't',
      GIT_COMMITTER_EMAIL: 't@t',
    },
  }).trim();

let root: string;
let url: string;
let shaA: string; // tagged v1 (annotated)
let shaB: string; // main HEAD
let bench: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'ilb-clone-'));
  const origin = join(root, 'origin');
  git('init', '--quiet', '-b', 'main', origin);
  writeFileSync(join(origin, 'a.txt'), 'a\n');
  git('-C', origin, 'add', '.');
  git('-C', origin, 'commit', '--quiet', '-m', 'A');
  shaA = git('-C', origin, 'rev-parse', 'HEAD');
  git('-C', origin, 'tag', '-a', 'v1', '-m', 'annotated release tag');
  writeFileSync(join(origin, 'b.txt'), 'b\n');
  git('-C', origin, 'add', '.');
  git('-C', origin, 'commit', '--quiet', '-m', 'B');
  shaB = git('-C', origin, 'rev-parse', 'HEAD');
  // GitHub serves any reachable SHA; a stock local repo has to be told to.
  git('-C', origin, 'config', 'uploadpack.allowAnySHA1InWant', 'true');
  url = `file://${origin}`;
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

beforeEach(() => {
  bench = mkdtempSync(join(root, 'bench-'));
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

const head = (dir: string) => git('-C', dir, 'rev-parse', 'HEAD');
const spec = (commit: string) => ({ name: 'target', repo: url, commit });
const dirOf = () => join(bench, 'target');
const leftovers = () => readdirSync(bench).filter((e) => e !== 'target');

/** A pre-existing clone at `ref`, holding an untracked file nobody may delete. */
function existingClone(ref: string): string {
  const dir = dirOf();
  git('clone', '--quiet', url, dir);
  git('-C', dir, 'checkout', '--quiet', '--detach', ref);
  writeFileSync(join(dir, 'MINE.txt'), 'local work\n');
  return dir;
}

describe('cloneRepo pins annotated tags', () => {
  it('clones an annotated-tag pin from scratch', () => {
    const dir = cloneRepo(spec('v1'), bench);
    expect(head(dir)).toBe(shaA);
    expect(leftovers()).toEqual([]);
  });

  it('treats a clone already at an annotated tag as cached, and touches nothing', () => {
    const dir = dirOf();
    git(
      'clone',
      '--quiet',
      '--depth',
      '1',
      '--branch',
      'v1',
      '--single-branch',
      url,
      dir,
    );
    writeFileSync(join(dir, 'MINE.txt'), 'local work\n');

    expect(cloneRepo(spec('v1'), bench)).toBe(dir);
    expect(head(dir)).toBe(shaA);
    expect(readFileSync(join(dir, 'MINE.txt'), 'utf8')).toBe('local work\n');
  });

  it('is a cache hit on the second run, with no network', () => {
    cloneRepo(spec('v1'), bench);
    const offline = { ...spec('v1'), repo: 'file:///nonexistent/ilb-remote' };
    expect(head(cloneRepo(offline, bench))).toBe(shaA);
  });
});

describe('cloneRepo never deletes a clone it cannot replace', () => {
  it('leaves the existing clone exactly as it was when the pin cannot be fetched', () => {
    const dir = existingClone(shaB);

    expect(() => cloneRepo(spec('f'.repeat(40)), bench)).toThrow(
      /Could not pin target.*left as it was/s,
    );

    expect(existsSync(dir)).toBe(true);
    expect(head(dir)).toBe(shaB);
    expect(readFileSync(join(dir, 'MINE.txt'), 'utf8')).toBe('local work\n');
    expect(leftovers()).toEqual([]);
  });

  it('leaves the existing clone when the remote is unreachable', () => {
    const dir = existingClone(shaB);
    const offline = { ...spec(shaA), repo: 'file:///nonexistent/ilb-remote' };

    expect(() => cloneRepo(offline, bench)).toThrow(/Could not pin target/);
    expect(head(dir)).toBe(shaB);
    expect(existsSync(join(dir, 'MINE.txt'))).toBe(true);
  });

  it('re-pins an existing clone in place, keeping its files', () => {
    const dir = existingClone(shaB);

    expect(cloneRepo(spec(shaA), bench)).toBe(dir);
    expect(head(dir)).toBe(shaA);
    expect(existsSync(join(dir, 'MINE.txt'))).toBe(true);
  });

  it('swaps in a replacement only once it is pinned, and keeps an old clone that holds local work', () => {
    // Untracked b.txt blocks the in-place checkout of B (which tracks b.txt),
    // so the helper must build a replacement beside it.
    const dir = existingClone(shaA);
    writeFileSync(join(dir, 'b.txt'), 'my edit, not the upstream file\n');

    expect(cloneRepo(spec(shaB), bench)).toBe(dir);
    expect(head(dir)).toBe(shaB);

    const kept = leftovers();
    expect(kept).toHaveLength(1);
    expect(kept[0]).toMatch(/^\.target\.ilb-replaced-/);
    expect(readFileSync(join(bench, kept[0], 'b.txt'), 'utf8')).toBe(
      'my edit, not the upstream file\n',
    );
  });

  it('never runs git against a parent repository when the clone has lost its .git', () => {
    // ~/repos/ofriperetz.dev/oos sits inside another git repository, where
    // `git -C oos/<name>` on a directory without .git walks up to the parent.
    const parent = join(bench, 'parent');
    git('init', '--quiet', parent);
    const inner = join(parent, 'oos');
    const dir = join(inner, 'target');
    execFileSync('mkdir', ['-p', dir]);
    writeFileSync(join(dir, 'MINE.txt'), 'local work\n');

    expect(head(cloneRepo(spec(shaA), inner))).toBe(shaA);

    // Nothing was fetched into, or checked out in, the parent.
    expect(git('-C', parent, 'for-each-ref')).toBe('');
    expect(git('-C', parent, 'count-objects')).toMatch(/^0 objects/);
    // And the directory that was there is kept, since nothing could say it held no work.
    const kept = readdirSync(inner).filter((e) =>
      e.startsWith('.target.ilb-replaced-'),
    );
    expect(kept).toHaveLength(1);
    expect(existsSync(join(inner, kept[0], 'MINE.txt'))).toBe(true);
  });
});
