/**
 * @provenBy {"file":"scripts/ilb-corpus-integrity.ts","find":"const sha = peeled?.[0] ?? refSha;","replace":"const sha = refSha;"}
 * @provenBy {"file":"scripts/ilb-corpus-integrity.ts","find":"['ls-remote', repo, commitish, `${commitish}^{}`]","replace":"['ls-remote', '--refs', repo, commitish]"}
 *
 * Lock: the corpus-integrity check records the COMMIT a tag pin stands for,
 * not the annotated tag object.
 *
 * `scripts/ilb-corpus-integrity.ts` resolved tags with `git ls-remote --refs`,
 * which drops the peeled `<tag>^{}` lines, so its "prefer the peeled line"
 * branch never ran. For the two annotated pins in the registry it wrote the
 * tag-object SHA into `benchmark-results/corpus-integrity.json` as
 * `resolvedSha`:
 *
 *   three.js r170     recorded 232de0c… (tag object) — the commit is beab9e8…
 *   next.js  v15.1.0  recorded 371382a… (tag object) — the commit is dafcd43…
 *
 * No checkout can be at a tag object, so the recorded "pin" matched nothing
 * the bench clones (same bug class as #1209 in benchmarks/lib/clone-repo.ts).
 * It also made the drift check compare tag objects: re-issuing an annotated
 * tag on the SAME commit (new message, re-signed, annotated → lightweight)
 * reported drift that does not exist in the corpus.
 *
 * Fixtures are local repositories served over file://, so this needs no
 * network.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveOnRemote } from '../ilb-corpus-integrity';

const git = (...args: string[]) =>
  execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      // A developer's tag.gpgSign / commit.gpgSign would make the fixture fail.
      GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_AUTHOR_NAME: 't',
      GIT_AUTHOR_EMAIL: 't@t',
      GIT_COMMITTER_NAME: 't',
      GIT_COMMITTER_EMAIL: 't@t',
    },
  }).trim();

let root: string;
let origin: string;
let url: string;
let shaA: string; // annotated tag `v1` and lightweight tag `lw` point here
let shaB: string; // main HEAD

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'ilb-integrity-'));
  origin = join(root, 'origin');
  git('init', '--quiet', '-b', 'main', origin);
  writeFileSync(join(origin, 'a.txt'), 'a\n');
  git('-C', origin, 'add', '.');
  git('-C', origin, 'commit', '--quiet', '-m', 'A');
  shaA = git('-C', origin, 'rev-parse', 'HEAD');
  git('-C', origin, 'tag', '-a', 'v1', '-m', 'annotated release tag');
  git('-C', origin, 'tag', 'lw');
  writeFileSync(join(origin, 'b.txt'), 'b\n');
  git('-C', origin, 'add', '.');
  git('-C', origin, 'commit', '--quiet', '-m', 'B');
  shaB = git('-C', origin, 'rev-parse', 'HEAD');
  url = `file://${origin}`;
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('resolveOnRemote peels annotated tags', () => {
  it('fixture sanity: v1 is an annotated tag whose object is not the commit', () => {
    const tagObject = git('-C', origin, 'rev-parse', 'v1');
    expect(git('-C', origin, 'cat-file', '-t', tagObject)).toBe('tag');
    expect(tagObject).not.toBe(shaA);
  });

  it('an annotated tag resolves to the commit it points to', () => {
    const r = resolveOnRemote(url, 'v1');
    expect(r).toMatchObject({ sha: shaA, kind: 'tag', ref: 'refs/tags/v1' });
    expect(git('-C', origin, 'cat-file', '-t', r.sha as string)).toBe('commit');
  });

  it('a lightweight tag and a branch resolve to their commit', () => {
    expect(resolveOnRemote(url, 'lw')).toMatchObject({
      sha: shaA,
      kind: 'tag',
    });
    expect(resolveOnRemote(url, 'main')).toMatchObject({
      sha: shaB,
      kind: 'branch',
    });
  });

  it('a 40-hex pin is taken as-is', () => {
    expect(resolveOnRemote(url, shaB)).toMatchObject({
      sha: shaB,
      kind: 'sha',
    });
  });

  it('an unknown ref is reported, not resolved', () => {
    expect(resolveOnRemote(url, 'no-such-ref').sha).toBeNull();
  });

  it('re-issuing the tag on the same commit is not drift; moving it is', () => {
    const before = resolveOnRemote(url, 'v1').sha;
    git(
      '-C',
      origin,
      'tag',
      '-f',
      '-a',
      'v1',
      shaA,
      '-m',
      'same commit, new message',
    );
    expect(resolveOnRemote(url, 'v1').sha).toBe(before);
    git('-C', origin, 'tag', '-f', 'v1', shaA); // annotated → lightweight
    expect(resolveOnRemote(url, 'v1').sha).toBe(before);
    git('-C', origin, 'tag', '-f', '-a', 'v1', shaB, '-m', 'moved');
    expect(resolveOnRemote(url, 'v1').sha).toBe(shaB);
  });
});
