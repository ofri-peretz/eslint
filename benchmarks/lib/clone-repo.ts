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

export function cloneRepo(repo: RepoSpec, benchDir: string): string {
  fs.mkdirSync(benchDir, { recursive: true });
  const dir = path.join(benchDir, repo.name);

  if (fs.existsSync(dir)) {
    const head = safeGit(['-C', dir, 'rev-parse', 'HEAD'], { allowFail: true }).trim();
    const expected = safeGit(['-C', dir, 'rev-parse', repo.commit], { allowFail: true }).trim();
    if (expected && head && head === expected) {
      console.log(`   📂 Cached at ${repo.commit} (${head.slice(0, 7)})`);
      return dir;
    }
    if (!expected) {
      const fetched = safeGit(['-C', dir, 'fetch', '--depth', '1', 'origin', repo.commit], { allowFail: true });
      if (fetched && safeGit(['-C', dir, 'rev-parse', 'FETCH_HEAD'], { allowFail: true }).trim()) {
        safeGit(['-C', dir, 'checkout', 'FETCH_HEAD'], { allowFail: true });
        console.log(`   📥 Fetched & checked out ${repo.commit}`);
      } else {
        console.log(`   ⚠️  Could not resolve ${repo.commit} on cached clone — using HEAD ${head.slice(0, 7)}`);
      }
      return dir;
    }
    console.log(`   🔄 Cache stale — checking out ${repo.commit}`);
    safeGit(['-C', dir, 'fetch', '--depth', '1', 'origin', repo.commit], { allowFail: true });
    safeGit(['-C', dir, 'checkout', repo.commit], { allowFail: true });
    return dir;
  }

  console.log(`   ⬇️  Cloning ${repo.name}@${repo.commit} (shallow)...`);
  try {
    execFileSync('git', ['clone', '--depth', '1', '--branch', repo.commit, '--single-branch', repo.repo, dir], { stdio: 'pipe' });
  } catch {
    execFileSync('git', ['clone', '--depth', '50', '--single-branch', repo.repo, dir], { stdio: 'pipe' });
    try {
      execFileSync('git', ['-C', dir, 'checkout', repo.commit], { stdio: 'pipe' });
    } catch {
      console.log(`   ⚠️  Could not pin to ${repo.commit}, using HEAD`);
    }
  }
  return dir;
}
