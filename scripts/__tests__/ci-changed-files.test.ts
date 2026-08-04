import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { changedFilesSince } from '../lib/ci-changed-files.mts';

/**
 * Lock for the base-commit resolution that gates ALL affected filtering.
 *
 * This silently returned null for the entire life of the feature: on a
 * pull_request event actions/checkout never creates refs/remotes/origin/main,
 * so `git merge-base HEAD origin/main` always failed and every PR fell back to
 * running the full matrix. The fallback is safe, so nothing ever went red —
 * it just quietly wasted the optimisation on every single run.
 */
describe('changedFilesSince', () => {
  let repo: string;
  const git = (...args: string[]) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();

  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), 'basefix-'));
    git('init', '-q', '-b', 'main');
    git('config', 'user.email', 't@t.t');
    git('config', 'user.name', 't');
    mkdirSync(join(repo, 'packages', 'a'), { recursive: true });
    writeFileSync(join(repo, 'packages', 'a', 'x.ts'), 'a');
    git('add', '-A');
    git('commit', '-qm', 'base');
  });
  afterEach(() => rmSync(repo, { recursive: true, force: true }));

  it('resolves a bare commit SHA and returns only that branch\'s changes', () => {
    const base = git('rev-parse', 'HEAD');
    git('checkout', '-q', '-b', 'feature');
    mkdirSync(join(repo, 'packages', 'b'), { recursive: true });
    writeFileSync(join(repo, 'packages', 'b', 'y.ts'), 'b');
    git('add', '-A');
    git('commit', '-qm', 'feature work');

    const r = changedFilesSince(base, repo);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.changed).toEqual(['packages/b/y.ts']);
  });

  it('excludes commits that landed on the base after the branch point', () => {
    const base = git('rev-parse', 'HEAD');
    git('checkout', '-q', '-b', 'feature');
    writeFileSync(join(repo, 'packages', 'a', 'mine.ts'), 'mine');
    git('add', '-A');
    git('commit', '-qm', 'mine');
    // main moves on independently — three-dot diff must not attribute this to us
    git('checkout', '-q', 'main');
    writeFileSync(join(repo, 'packages', 'a', 'theirs.ts'), 'theirs');
    git('add', '-A');
    git('commit', '-qm', 'theirs');
    git('checkout', '-q', 'feature');

    const r = changedFilesSince(base, repo);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.changed).toEqual(['packages/a/mine.ts']);
  });

  it('reports failure (never throws) when the base cannot be resolved', () => {
    const r = changedFilesSince('refs/remotes/origin/does-not-exist', repo);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.why).toMatch(/could not be resolved|no merge-base/);
  });
});

/**
 * Structural lock: the workflow must hand the sharders a base COMMIT. Without
 * it they fall back to `origin/main`, which does not exist in a PR checkout.
 */
describe('quality-full passes a resolvable base to the sharders', () => {
  it('every CI_TEST_SHARD_ALL is accompanied by CI_TEST_SHARD_BASE', () => {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
    const wf = readFileSync(join(root, '.github/workflows/quality-full.yml'), 'utf8');
    const alls = (wf.match(/CI_TEST_SHARD_ALL:/g) ?? []).length;
    const bases = (wf.match(/CI_TEST_SHARD_BASE:/g) ?? []).length;
    expect(alls, 'no CI_TEST_SHARD_ALL found — lock would be vacuous').toBeGreaterThan(0);
    expect(
      bases,
      `${alls} job(s) set CI_TEST_SHARD_ALL but only ${bases} set CI_TEST_SHARD_BASE. ` +
        `A job without it diffs against origin/main, which does not exist in a ` +
        `pull_request checkout, so it silently runs EVERY package.`,
    ).toBe(alls);
    expect(wf, 'the base must come from the event payload, not a ref name').toContain(
      'github.event.pull_request.base.sha',
    );
  });
});
