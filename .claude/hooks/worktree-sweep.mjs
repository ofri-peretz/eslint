#!/usr/bin/env node
// worktree-sweep — Claude Code SessionStart hook. Canonical copy: burgee packages/hookset/claude/.
// `hookset init --claude` vendors it next to guard-bash.mjs.
//
// Claude Code's `--worktree`, isolated subagents and any agent that runs `git worktree add` leave
// a full checkout per task, and nothing removes one when the task ends. At most once a day per
// clone, this starts the repo's own `hookset worktrees --prune` in the background, so the session
// is not held for it. That command removes only worktrees that hold no work: not the main or
// current one, not locked, nothing uncommitted, every commit on a remote, and idle for the age
// given (default 3 days); `git worktree remove` without --force, branches kept.
//
// The person decides: HOOKSET_WORKTREES=0 turns it off, HOOKSET_WORKTREES_OLDER_THAN=<days>
// changes the age, and `git worktree lock <path>` keeps one worktree out of every sweep. It does
// nothing in a repo without hookset installed (node_modules/.bin/hookset). Each run's report is
// kept in the OS temp directory under hookset-worktree-sweep/.
// `node worktree-sweep.mjs --self-test` runs the cases at the bottom.

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const EVERY_MS = 24 * 60 * 60 * 1000;

/** The repo's own hookset bin, or null when hookset is not installed there. */
export function hooksetBin(dir) {
  const bin = join(dir, "node_modules", ".bin", process.platform === "win32" ? "hookset.cmd" : "hookset");
  return existsSync(bin) ? bin : null;
}

/** The arguments for the sweep: `--older-than` only when the person set a whole, non-negative number of days. */
export function sweepArgs(olderThan) {
  const days = Number(olderThan);
  const set = olderThan !== undefined && olderThan !== "" && Number.isFinite(days) && days >= 0;
  return ["worktrees", "--prune", "--json", ...(set ? ["--older-than", String(days)] : [])];
}

/** Where this clone's last sweep is stamped and reported: named by a hash of the path, so no two clones share one. */
export function stampFile(dir, base = tmpdir()) {
  const state = join(base, "hookset-worktree-sweep");
  mkdirSync(state, { recursive: true });
  return join(state, `${createHash("sha256").update(dir).digest("hex").slice(0, 16)}.json`);
}

/** Whether a sweep is due: no stamp yet, an unreadable one, or one older than EVERY_MS. */
export function due(stamp, now) {
  try {
    const at = Number(JSON.parse(readFileSync(stamp, "utf8")).at);
    return !(now - at < EVERY_MS);
  } catch {
    return true;
  }
}

function startSweep(dir, bin, args, stamp) {
  writeFileSync(stamp, JSON.stringify({ at: Date.now(), args }));
  const out = openSync(stamp.replace(/\.json$/, ".log"), "w");
  const windows = process.platform === "win32";
  // A .cmd runs only through a shell on Windows, which splits an unquoted path at its spaces.
  const child = spawn(windows ? `"${bin}"` : bin, args, { cwd: dir, detached: true, stdio: ["ignore", out, out], shell: windows });
  child.on("error", () => {});
  child.unref();
}

function selfTest() {
  const bad = [];
  const check = (name, got, want) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) bad.push(`${name}: want ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
  };
  check("default args", sweepArgs(undefined), ["worktrees", "--prune", "--json"]);
  check("empty age", sweepArgs(""), ["worktrees", "--prune", "--json"]);
  check("an age", sweepArgs("7"), ["worktrees", "--prune", "--json", "--older-than", "7"]);
  check("age zero", sweepArgs("0"), ["worktrees", "--prune", "--json", "--older-than", "0"]);
  check("negative age", sweepArgs("-1"), ["worktrees", "--prune", "--json"]);
  check("not a number", sweepArgs("soon"), ["worktrees", "--prune", "--json"]);
  const base = mkdtempSync(join(tmpdir(), "worktree-sweep-"));
  const stamp = stampFile("/repos/a b", base);
  check("stamp path", stamp, join(base, "hookset-worktree-sweep", `${createHash("sha256").update("/repos/a b").digest("hex").slice(0, 16)}.json`));
  check("paths that differ only in punctuation get their own stamps", stampFile("/repos/ab", base) === stampFile("/repos_ab", base), false);
  check("due with no stamp", due(stamp, 1000), true);
  writeFileSync(stamp, JSON.stringify({ at: 1000 }));
  check("not due within a day", due(stamp, 1000 + EVERY_MS - 1), false);
  check("due after a day", due(stamp, 1000 + EVERY_MS), true);
  writeFileSync(stamp, "not json");
  check("due on a bad stamp", due(stamp, 1000), true);
  check("no bin", hooksetBin(base), null);
  process.stdout.write(bad.length ? `${bad.join("\n")}\n${bad.length} failing\n` : "ok: 13 cases\n");
  process.exit(bad.length ? 1 : 0);
}

const isMain = Boolean(process.argv[1]) && import.meta.url.endsWith(`/${process.argv[1].split(/[\\/]/).pop()}`);
if (isMain && process.argv.includes("--self-test")) selfTest();
else if (isMain) {
  let raw = "";
  process.stdin.on("data", (d) => (raw += d));
  process.stdin.on("end", () => {
    let payload;
    try {
      payload = JSON.parse(raw) ?? {};
    } catch {
      process.exit(0);
    }
    if (process.env.HOOKSET_WORKTREES === "0" || payload.hook_event_name !== "SessionStart") process.exit(0);
    const dir = process.env.CLAUDE_PROJECT_DIR || payload.cwd || process.cwd();
    const bin = hooksetBin(dir);
    if (!bin) process.exit(0);
    const stamp = stampFile(dir, process.env.HOOKSET_WORKTREE_SWEEP_DIR || tmpdir());
    if (due(stamp, Date.now())) startSweep(dir, bin, sweepArgs(process.env.HOOKSET_WORKTREES_OLDER_THAN), stamp);
  });
}
