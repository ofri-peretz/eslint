import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

export type RepoSpec = {
  name: string;
  repo: string;
  commit: string;
};

export function resolveBenchDir(fallbackRoot: string): string {
  if (process.env.ILB_OOS_DIR) return path.resolve(process.env.ILB_OOS_DIR);
  const oosDir = path.join(os.homedir(), 'repos', 'ofriperetz.dev', 'oos');
  if (fs.existsSync(path.dirname(oosDir))) return oosDir;
  return path.join(fallbackRoot, '.bench-repos');
}

export function safeGit(args: string[], opts: { allowFail?: boolean } = {}): string {
  try {
    return execFileSync('git', args, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }).toString();
  } catch (e: any) {
    if (opts.allowFail) return e.stdout?.toString() || '';
    throw e;
  }
}

/**
 * Fetch exactly one commit into an empty directory.
 *
 * `git clone --depth 1 --branch <ref>` only accepts a **branch or tag**, never a
 * SHA, so every SHA-pinned repository fell through to a `--depth 50` clone of
 * the default branch and was pinned only if the commit happened to be within
 * the last fifty. When it was not, the clone silently kept HEAD.
 *
 * That is how 6 of 107 pinned repositories in ILB-Corpus-Truth ended up at
 * their *current* HEAD — activepieces, eslint-config-ts-prefixer, ghostfolio,
 * immich, novu and one more — and how two runs of "the same" corpus came to
 * scan 107,384 and 119,415 files.
 *
 * `fetch --depth 1 origin <sha>` asks the server for that object directly,
 * which GitHub supports, and works regardless of how far behind the pin is.
 */
/**
 * Whether the working tree is actually at `commit`.
 *
 * `rev-parse HEAD` is the only trustworthy answer: a fetch can fail while
 * leaving a usable `FETCH_HEAD` from an earlier one, and a checkout can fail
 * without a non-zero exit through `allowFail`. A tag or branch pin is resolved
 * through `rev-parse <ref>` so it compares like for like.
 */
function isPinnedTo(dir: string, commit: string): boolean {
  const head = safeGit(['-C', dir, 'rev-parse', 'HEAD'], { allowFail: true }).trim();
  if (!head) return false;
  if (head === commit) return true;
  const resolved = safeGit(['-C', dir, 'rev-parse', commit], { allowFail: true }).trim();
  return resolved !== '' && resolved === head;
}

function fetchCommit(dir: string, repo: RepoSpec): boolean {
  fs.mkdirSync(dir, { recursive: true });
  try {
    execFileSync('git', ['init', '--quiet', dir], { stdio: 'pipe' });
    execFileSync('git', ['-C', dir, 'remote', 'add', 'origin', repo.repo], { stdio: 'pipe' });
    execFileSync('git', ['-C', dir, 'fetch', '--depth', '1', '--quiet', 'origin', repo.commit], { stdio: 'pipe' });
    execFileSync('git', ['-C', dir, 'checkout', '--quiet', 'FETCH_HEAD'], { stdio: 'pipe' });
    return isPinnedTo(dir, repo.commit);
  } catch {
    return false;
  }
}

export function cloneRepo(repo: RepoSpec, benchDir: string): string {
  fs.mkdirSync(benchDir, { recursive: true });
  const dir = path.join(benchDir, repo.name);

  if (fs.existsSync(dir)) {
    const head = safeGit(['-C', dir, 'rev-parse', 'HEAD'], { allowFail: true }).trim();
    const expected = safeGit(['-C', dir, 'rev-parse', repo.commit], { allowFail: true }).trim();
    if (expected && head && head === expected) {
      console.log(`   📂 Cached at ${repo.commit.slice(0, 7)}`);
      return dir;
    }
    safeGit(['-C', dir, 'fetch', '--depth', '1', 'origin', repo.commit], { allowFail: true });
    safeGit(['-C', dir, 'checkout', '--quiet', 'FETCH_HEAD'], { allowFail: true });
    // Verify the RESULT, not the attempt. `FETCH_HEAD` survives an earlier
    // fetch, so a failed one leaves the previous ref in place and checking it
    // out silently pins the repository to whatever was fetched last — the same
    // "looks pinned, isn't" defect this function is being fixed for. Only the
    // commit now checked out is evidence.
    if (isPinnedTo(dir, repo.commit)) {
      console.log(`   📥 Re-pinned cached clone to ${repo.commit.slice(0, 7)}`);
      return dir;
    }
    console.log(`   🧹 Cached clone cannot reach ${repo.commit.slice(0, 7)} — re-cloning`);
    fs.rmSync(dir, { recursive: true, force: true });
  }

  console.log(`   ⬇️  Cloning ${repo.name}@${repo.commit.slice(0, 7)}...`);
  if (fetchCommit(dir, repo)) return dir;

  // Older servers may refuse a bare-SHA fetch. A tag or branch pin still clones
  // the ordinary way.
  fs.rmSync(dir, { recursive: true, force: true });
  try {
    execFileSync('git', ['clone', '--depth', '1', '--branch', repo.commit, '--single-branch', repo.repo, dir], { stdio: 'pipe' });
    if (isPinnedTo(dir, repo.commit)) return dir;
  } catch {
    /* not a branch or tag */
  }

  // Deliberately no HEAD fallback. A benchmark that quietly measures a
  // different commit than the one it reports is worse than one that stops: the
  // numbers look fine and every comparison drawn from them is wrong.
  fs.rmSync(dir, { recursive: true, force: true });
  throw new Error(
    `Could not pin ${repo.name} to ${repo.commit}. The corpus must be reproducible, ` +
      'so this is fatal rather than a fallback to HEAD.',
  );
}

