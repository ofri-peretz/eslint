import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

export type RepoSpec = {
  name: string;
  repo: string;
  commit: string;
};

/** A hung network fetch must end the repo, not the whole run. */
const GIT_TIMEOUT_MS = 15 * 60_000;

export function resolveBenchDir(fallbackRoot: string): string {
  if (process.env.ILB_OOS_DIR) return path.resolve(process.env.ILB_OOS_DIR);
  const oosDir = path.join(os.homedir(), 'repos', 'ofriperetz.dev', 'oos');
  if (fs.existsSync(path.dirname(oosDir))) return oosDir;
  return path.join(fallbackRoot, '.bench-repos');
}

export function safeGit(
  args: string[],
  opts: { allowFail?: boolean } = {},
): string {
  try {
    return execFileSync('git', args, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).toString();
  } catch (e: any) {
    if (opts.allowFail) return e.stdout?.toString() || '';
    throw e;
  }
}

/** Run git and throw an error that carries git's own stderr, not just "Command failed". */
function git(args: string[]): string {
  try {
    return execFileSync('git', args, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: GIT_TIMEOUT_MS,
    }).toString();
  } catch (e: any) {
    const stderr = (e.stderr?.toString() || '').trim();
    const why =
      e.code === 'ETIMEDOUT'
        ? `timed out after ${GIT_TIMEOUT_MS / 60_000} min`
        : stderr || e.message;
    throw new Error(
      `git ${args.filter((a) => a !== '--quiet').join(' ')}: ${why}`,
    );
  }
}

const isFullSha = (ref: string): boolean => /^[0-9a-f]{40}$/i.test(ref);

/**
 * Whether `dir` is the top of its own git repository.
 *
 * `git -C <dir>` walks UP until it finds a repository. The default bench dir
 * (~/repos/ofriperetz.dev/oos) sits inside another git repository, so a clone
 * directory that has lost its `.git` would have every fetch and checkout below
 * applied to that parent repository instead.
 */
function isOwnRepo(dir: string): boolean {
  const top = safeGit(['-C', dir, 'rev-parse', '--show-toplevel'], {
    allowFail: true,
  }).trim();
  if (!top) return false;
  try {
    return fs.realpathSync(top) === fs.realpathSync(dir);
  } catch {
    return false;
  }
}

/**
 * Whether the working tree is actually at `commit`.
 *
 * `rev-parse HEAD` is the only trustworthy answer: a fetch can fail while
 * leaving a usable `FETCH_HEAD` from an earlier one, and a checkout can fail
 * without a non-zero exit through `allowFail`.
 *
 * The pin is PEELED (`<ref>^{commit}`). `rev-parse <tag>` on an annotated tag
 * returns the tag OBJECT's SHA, which no HEAD can ever equal — so every
 * annotated-tag pin (three.js `r170`, next.js `v15.1.0`) read as "cannot
 * reach", and the clone that was in fact at the right commit was deleted.
 */
export function isPinnedTo(dir: string, commit: string): boolean {
  if (!isOwnRepo(dir)) return false;
  const head = safeGit(
    ['-C', dir, 'rev-parse', '--verify', '--quiet', 'HEAD'],
    { allowFail: true },
  ).trim();
  if (!head) return false;
  if (head === commit) return true;
  const resolved = safeGit(
    ['-C', dir, 'rev-parse', '--verify', '--quiet', `${commit}^{commit}`],
    {
      allowFail: true,
    },
  ).trim();
  return resolved !== '' && resolved === head;
}

/**
 * Fetch exactly the pinned commit into the repository at `dir` and check it out.
 *
 * `git clone --depth 1 --branch <ref>` only accepts a **branch or tag**, never a
 * SHA, so every SHA-pinned repository once fell through to a `--depth 50` clone
 * of the default branch and silently kept HEAD when the pin was older (#524).
 * `fetch --depth 1 <url> <sha>` asks the server for that object directly.
 *
 * A tag or branch is fetched into `refs/tags/<ref>` so the pin resolves locally
 * afterwards — the next run is a cache hit with no network — and so the check
 * compares against what this fetch brought, never a stale `FETCH_HEAD`.
 *
 * The URL comes from the registry rather than the clone's `origin`, which may
 * be missing or point elsewhere in a clone some other tool made.
 */
function fetchPin(dir: string, repo: RepoSpec): void {
  if (isFullSha(repo.commit)) {
    git([
      '-C',
      dir,
      'fetch',
      '--depth',
      '1',
      '--quiet',
      repo.repo,
      repo.commit,
    ]);
  } else {
    git([
      '-C',
      dir,
      'fetch',
      '--depth',
      '1',
      '--quiet',
      '--no-tags',
      repo.repo,
      `+${repo.commit}:refs/tags/${repo.commit}`,
    ]);
  }
  // No --force: a working tree with local edits refuses, and those edits are
  // somebody's work.
  git([
    '-C',
    dir,
    'checkout',
    '--quiet',
    '--detach',
    `${repo.commit}^{commit}`,
  ]);
}

/** Tracked edits or untracked, NON-ignored files. Ignored build output (node_modules) is not work. */
function hasLocalWork(dir: string): boolean {
  if (!isOwnRepo(dir)) return true; // cannot tell, so assume it matters
  try {
    return git(['-C', dir, 'status', '--porcelain']).trim() !== '';
  } catch {
    return true;
  }
}

function headOf(dir: string): string {
  return (
    safeGit(['-C', dir, 'rev-parse', '--short', 'HEAD'], {
      allowFail: true,
    }).trim() || 'no HEAD'
  );
}

/**
 * Put `staging` (a verified clone) at `dir`.
 *
 * Only reached once the replacement is pinned and complete, so the user is
 * never left without a clone. The one being replaced is deleted only when it
 * holds nothing of anyone's — otherwise it is kept beside the new one.
 */
function swapIntoPlace(staging: string, dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.renameSync(staging, dir);
    return;
  }
  const retired = path.join(
    path.dirname(dir),
    `.${path.basename(dir)}.ilb-replaced-${Date.now()}`,
  );
  fs.renameSync(dir, retired);
  try {
    fs.renameSync(staging, dir);
  } catch (e) {
    // Put the old clone back: never leave `dir` empty.
    fs.renameSync(retired, dir);
    fs.rmSync(staging, { recursive: true, force: true });
    throw e;
  }
  if (hasLocalWork(retired)) {
    console.log(`   ⚠️  Previous clone had local changes — kept at ${retired}`);
    return;
  }
  fs.rmSync(retired, { recursive: true, force: true });
}

/**
 * Return a directory holding `repo` checked out at exactly `repo.commit`.
 *
 * Never deletes a clone before its replacement exists. The earlier version
 * `rm -rf`'d the cached clone the moment it looked unpinned and only then tried
 * to fetch; with the annotated-tag bug above, three.js and next.js were deleted
 * on every run. Now an existing clone is re-pinned in place, and failing that a
 * replacement is cloned into a staging sibling and swapped in only once it is
 * verified. If nothing works the existing clone is left exactly as it was.
 */
export function cloneRepo(repo: RepoSpec, benchDir: string): string {
  fs.mkdirSync(benchDir, { recursive: true });
  const dir = path.join(benchDir, repo.name);
  const attempts: string[] = [];
  const existed = fs.existsSync(dir);

  if (existed) {
    if (isPinnedTo(dir, repo.commit)) {
      console.log(`   📂 Cached at ${repo.commit.slice(0, 7)}`);
      return dir;
    }
    if (!isOwnRepo(dir)) {
      attempts.push(`in place: ${dir} is not the top of a git repository`);
    } else if (hasLocalWork(dir)) {
      // checkout keeps a local edit to a file both commits share, so HEAD would
      // read as pinned over a tree that is not the commit. Stage a clean one;
      // swapIntoPlace keeps the edited clone beside it.
      attempts.push(`in place: ${dir} has local changes`);
    } else {
      try {
        fetchPin(dir, repo);
        if (isPinnedTo(dir, repo.commit)) {
          console.log(
            `   📥 Re-pinned cached clone to ${repo.commit.slice(0, 7)}`,
          );
          return dir;
        }
        attempts.push(`in place: HEAD is ${headOf(dir)} after checkout`);
      } catch (e: any) {
        attempts.push(`in place: ${e.message}`);
      }
    }
    console.log(
      `   🔁 Cached clone cannot be re-pinned to ${repo.commit.slice(0, 7)} — cloning a replacement beside it`,
    );
  } else {
    console.log(`   ⬇️  Cloning ${repo.name}@${repo.commit.slice(0, 7)}...`);
  }

  const staging = fs.mkdtempSync(
    path.join(benchDir, `.${repo.name}.ilb-staging-`),
  );
  try {
    git(['init', '--quiet', staging]);
    fetchPin(staging, repo);
    if (!isPinnedTo(staging, repo.commit)) {
      throw new Error(`fresh clone: HEAD is ${headOf(staging)} after checkout`);
    }
  } catch (e: any) {
    fs.rmSync(staging, { recursive: true, force: true });
    attempts.push(
      e.message.startsWith('fresh clone')
        ? e.message
        : `fresh clone: ${e.message}`,
    );
    // Deliberately no HEAD fallback. A benchmark that quietly measures a
    // different commit than the one it reports is worse than one that stops.
    throw new Error(
      `Could not pin ${repo.name} to ${repo.commit}. The corpus must be reproducible, ` +
        'so this is fatal rather than a fallback to HEAD.' +
        (existed ? ` The existing clone at ${dir} was left as it was.` : '') +
        `\n     ${attempts.join('\n     ')}`,
    );
  }

  swapIntoPlace(staging, dir);
  return dir;
}
