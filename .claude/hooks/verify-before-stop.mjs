#!/usr/bin/env node
// verify-before-stop — Claude Code Stop hook, plus a PostToolUse hook for Bash that feeds it.
// Canonical copy: burgee packages/hookset/claude/. `hookset init --claude` vendors it next to
// guard-bash.mjs and stop-after-3.mjs.
//
// "Run the tests before you say you're done" was a sentence; the verification post says to make
// it a hook that runs when Claude finishes. A whole suite inside a Stop hook would hold every turn
// for minutes, so this hook asks for the run instead of making it:
//
//   - PostToolUse (Bash): a test run that passes records a fingerprint of the uncommitted code.
//   - Stop: when uncommitted code differs from the last passing run's fingerprint (or no run
//     passed this session), the turn is sent back once with the reason. The second Stop of the
//     same turn (`stop_hook_active`) always passes, so Claude can never be stuck here.
//
// Only code this session changed is judged: a path its Edit/Write tools wrote, or one whose
// content changed across one of its Bash calls (PreToolUse snapshots, PostToolUse compares).
// Another session or a generator rewriting files in the same checkout does not stop this one.
// Committed work is not judged here: the commit and push hooks are its gate. Docs do not count:
// `.md`, `.mdx` and `.txt` files, and any glob the repo lists under `verifyIgnore` in
// .claude/hookset.json. A test run is what stop-after-3 counts as one (vitest, `npm test`,
// `npm run ci:local`, …). `node verify-before-stop.mjs --self-test` runs the cases at the bottom.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";

import { commands, globToRegExp } from "./guard-bash.mjs";
import { isTestCommand } from "./stop-after-3.mjs";

const DOCS = /\.(md|mdx|txt)$/i;

/**
 * The uncommitted paths `git status` lists, staged, unstaged and untracked, relative to the repo
 * root. A rename lists both sides, so code renamed to a doc still counts; a copy only its new path.
 */
export function changedPaths(dir) {
  const r = spawnSync(
    "git",
    ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
    { cwd: dir, encoding: "utf8" },
  );
  if (r.status !== 0) return [];
  const parts = r.stdout.split("\0").filter(Boolean);
  const paths = [];
  for (let i = 0; i < parts.length; i++) {
    const entry = parts[i];
    paths.push(entry.slice(3));
    // A rename or copy is followed by its old path. A rename removed it; a copy left it as it was.
    if (entry[0] === "R" && parts[i + 1]) paths.push(parts[i + 1]);
    if (entry[0] === "R" || entry[0] === "C") i++;
  }
  return paths;
}

/** True when `path` is code this hook judges: not docs, not a glob the repo ignores. */
export function counts(path, ignore = []) {
  const rel = path.replaceAll("\\", "/");
  return !DOCS.test(rel) && !ignore.some((g) => globToRegExp(g).test(rel));
}

/** The work tree's root, so a hook whose cwd is a package still reads root-relative paths. */
function rootOf(dir) {
  const r = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    cwd: dir,
    encoding: "utf8",
  });
  return r.status === 0 && r.stdout.trim() ? r.stdout.trim() : dir;
}

/** One hash over the uncommitted code paths this session owns, or null when there is none. */
export function fingerprint(cwd, ignore = [], owned = null) {
  const dir = rootOf(cwd);
  const mine = owned && new Set(owned);
  const paths = changedPaths(dir)
    .filter((p) => counts(p, ignore) && (!mine || mine.has(p)))
    .sort();
  if (paths.length === 0) return null;
  const hash = createHash("sha256");
  for (const p of paths) {
    const file = join(dir, p);
    hash.update(p).update("\0");
    hash
      .update(existsSync(file) ? readFileSync(file) : "<deleted>")
      .update("\0");
  }
  return { hash: hash.digest("hex"), paths };
}

function stateFile(session) {
  const dir = join(tmpdir(), "hookset-verify-before-stop");
  mkdirSync(dir, { recursive: true });
  return join(
    dir,
    `${String(session || "default").replace(/[^\w.-]/g, "_")}.json`,
  );
}

function readState(session) {
  try {
    return JSON.parse(readFileSync(stateFile(session), "utf8")) ?? {};
  } catch {
    return {};
  }
}

function writeState(session, state) {
  writeFileSync(stateFile(session), JSON.stringify(state));
}

/** Marks paths (absolute, or relative to `dir`) as changed by this session. */
export function own(session, dir, paths) {
  const root = rootOf(dir);
  const state = readState(session);
  const owned = new Set(state.owned ?? []);
  for (const p of paths) {
    const abs = resolve(dir, p);
    // git prints the real root; a tool may name the file through a symlink (/var → /private/var)
    // or, on Windows, an 8.3 short name (RUNNER~1). Only the native realpath expands short names.
    let real = abs;
    try {
      real = join(realpathSync.native(dirname(abs)), basename(abs));
    } catch {
      // ponytail: the directory is gone; the path as given is the best we have.
    }
    owned.add(relative(realpathSync.native(root), real).replaceAll("\\", "/"));
  }
  writeState(session, { ...state, owned: [...owned] });
}

/** Content hash per uncommitted code path, so a Bash call's own edits can be told apart. */
function contents(dir, ignore) {
  const root = rootOf(dir);
  const out = {};
  for (const p of changedPaths(root).filter((p) => counts(p, ignore))) {
    const file = join(root, p);
    out[p] = existsSync(file)
      ? createHash("sha256").update(readFileSync(file)).digest("hex")
      : "<deleted>";
  }
  return out;
}

/** PreToolUse (Bash): remember the uncommitted code before the command runs. */
export function snapshot(session, dir, ignore = []) {
  writeState(session, { ...readState(session), before: contents(dir, ignore) });
}

/**
 * PostToolUse (Bash): every path whose content the command changed is this session's.
 * ponytail: another writer touching a file during this same call is counted too; per-pid
 * tracing would close that, and the window is one command long.
 */
export function ownChanged(session, dir, ignore = []) {
  const { before = {} } = readState(session);
  const after = contents(dir, ignore);
  own(
    session,
    rootOf(dir),
    Object.keys(after).filter((p) => after[p] !== before[p]),
  );
  const { before: _, ...rest } = readState(session);
  writeState(session, rest);
}

/**
 * True when the shell's exit status is the test run's own: the test is the last command and no
 * `|`, `||`, `;` or `&` can hide its failure or run an edit after it. `cd pkg && npx vitest run`
 * proves a pass; `npm test || true`, `npm test | tail` and `npm test && sed -i … a.ts` do not.
 */
export function provesPass(command) {
  // `2>&1` merges streams; its `&` is not a background launch.
  const merged = String(command).replace(/\d*>&\d+/g, " ");
  const bare = merged
    .replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, '""')
    .replaceAll("&&", " ");
  if (/[|;&\n]/.test(bare)) return false;
  const last = commands(merged).at(-1);
  return Boolean(last) && isTestCommand(last.join(" "));
}

/**
 * PostToolUse: a passing foreground test run (`{ command, failed, background }`) remembers what
 * the code looked like. A background launch returns before its tests finish. Prints nothing.
 */
export function recordPass(
  session,
  dir,
  { command, failed, background = false },
  ignore = [],
) {
  if (failed || background || !provesPass(command)) return;
  const state = readState(session);
  const fp = fingerprint(dir, ignore, state.owned ?? []);
  // A pass with nothing of ours uncommitted proves the tree; forget any older fingerprint.
  const { hash: _, ...rest } = state;
  writeState(session, fp ? { ...rest, hash: fp.hash } : rest);
}

/** Stop: the JSON that sends the turn back, or null to let it end. */
export function decideStop(session, dir, active, ignore = []) {
  if (active) return null;
  const state = readState(session);
  const fp = fingerprint(dir, ignore, state.owned ?? []);
  if (!fp || fp.hash === (state.hash ?? null)) return null;
  const shown =
    fp.paths.slice(0, 5).join(", ") +
    (fp.paths.length > 5 ? `, and ${fp.paths.length - 5} more` : "");
  return {
    decision: "block",
    reason:
      `[verify-before-stop] Code changed since the last passing test run (${shown}). ` +
      "Run the tests that cover it, or the repo's verify skill, in the foreground as the last command with no pipe, `||`, `;` or `&` after it, and say what passed. " +
      "If they cannot run yet (you need an answer first), say that in your reply and end the turn; this hook will not stop you twice.",
  };
}

/** The repo's `verifyIgnore` globs from .claude/hookset.json. Missing is none. */
function ignoreOf(dir) {
  try {
    const list = JSON.parse(
      readFileSync(join(dir, ".claude", "hookset.json"), "utf8"),
    ).verifyIgnore;
    return Array.isArray(list) ? list.map(String) : [];
  } catch {
    return [];
  }
}

function failedResponse(payload) {
  if (payload.hook_event_name === "PostToolUseFailure") return true;
  const r = payload.tool_response;
  if (!r || typeof r !== "object") return false;
  if (r.interrupted === true) return true;
  const code = r.exitCode ?? r.exit_code ?? r.returnCode ?? r.code;
  return typeof code === "number"
    ? code !== 0
    : r.is_error === true || r.isError === true;
}

function selfTest() {
  const bad = [];
  const dir = join(tmpdir(), `hookset-vbs-${process.pid}`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("GIT_")));
  const git = (...a) => spawnSync("git", a, { cwd: dir, encoding: "utf8", env });
  git("init", "-q");
  git(
    "-c",
    "user.email=t@t",
    "-c",
    "user.name=t",
    "commit",
    "-q",
    "--allow-empty",
    "-m",
    "root",
  );
  const session = `self-test-${process.pid}`;
  rmSync(stateFile(session), { force: true });
  // An edit made by one of this session's Bash calls.
  const edit = (rel, text, at = dir) => {
    snapshot(session, at);
    writeFileSync(join(dir, rel), text);
    ownChanged(session, at);
  };

  if (decideStop(session, dir, false))
    bad.push("a clean tree should end the turn");
  writeFileSync(join(dir, "other.ts"), "export const o = 1;\n");
  if (decideStop(session, dir, false))
    bad.push("code another writer changed should not send the turn back");
  edit("notes.md", "x");
  if (decideStop(session, dir, false))
    bad.push("a docs-only change should end the turn");
  edit("a.ts", "export const a = 1;\n");
  if (decideStop(session, dir, false)?.decision !== "block")
    bad.push("untested code should send the turn back");
  if (decideStop(session, dir, false)?.reason.includes("other.ts"))
    bad.push("the reason should name only this session's files");
  if (decideStop(session, dir, true))
    bad.push("the second stop of a turn should always pass");
  if (decideStop(session, dir, false, ["*.ts"]))
    bad.push("a verifyIgnore glob should not count");
  recordPass(session, dir, { command: "npm run build", failed: false });
  if (!decideStop(session, dir, false)) bad.push("a build is not a test run");
  recordPass(session, dir, { command: "npx vitest run", failed: true });
  if (!decideStop(session, dir, false))
    bad.push("a failing test run is not a pass");
  recordPass(session, dir, { command: "npx vitest run", failed: false });
  if (decideStop(session, dir, false))
    bad.push("a passing run over this code should end the turn");
  edit("a.ts", "export const a = 2;\n");
  if (!decideStop(session, dir, false))
    bad.push("an edit after the pass should send the turn back");
  for (const command of [
    "npm test || true",
    "npx vitest run 2>&1 | tail -5",
    "npm test; echo done",
    "npm test && sed -i s/2/3/ a.ts",
  ]) {
    recordPass(session, dir, { command, failed: false });
    if (!decideStop(session, dir, false))
      bad.push(`"${command}" cannot prove a pass`);
  }
  recordPass(session, dir, { command: "npm test", failed: false, background: true });
  if (!decideStop(session, dir, false))
    bad.push("a background launch is not a finished run");
  mkdirSync(join(dir, "pkg"), { recursive: true });
  edit("pkg/b.ts", "export const b = 1;\n", join(dir, "pkg"));
  recordPass(session, join(dir, "pkg"), {
    command: "npx vitest run 2>&1",
    failed: false,
  });
  if (decideStop(session, join(dir, "pkg"), false))
    bad.push("a pass from a package directory should cover the same tree");
  edit("pkg/b.ts", "export const b = 2;\n", join(dir, "pkg"));
  if (!decideStop(session, join(dir, "pkg"), false))
    bad.push("an edit seen from a package directory should send the turn back");
  git("add", "-A");
  git("-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "-m", "code");
  rmSync(stateFile(session), { force: true });
  snapshot(session, dir);
  git("mv", "a.ts", "a.md");
  ownChanged(session, dir);
  if (!decideStop(session, dir, false))
    bad.push("renaming code to a doc removes code and should send the turn back");

  rmSync(stateFile(session), { force: true });
  rmSync(dir, { recursive: true, force: true });
  process.stdout.write(
    bad.length ? `${bad.join("\n")}\n${bad.length} failing\n` : "ok: 19 cases\n",
  );
  process.exit(bad.length ? 1 : 0);
}

const isMain =
  Boolean(process.argv[1]) &&
  import.meta.url.endsWith(`/${process.argv[1].split(/[\\/]/).pop()}`);
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
    const dir = payload.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const ignore = ignoreOf(process.env.CLAUDE_PROJECT_DIR || dir);
    if (payload.hook_event_name === "Stop") {
      const out = decideStop(
        payload.session_id,
        dir,
        payload.stop_hook_active === true,
        ignore,
      );
      if (out) process.stdout.write(JSON.stringify(out));
      return;
    }
    const command = payload.tool_input?.command;
    if (payload.hook_event_name === "PreToolUse") {
      if (typeof command === "string") snapshot(payload.session_id, dir, ignore);
      return;
    }
    const file = payload.tool_input?.file_path ?? payload.tool_input?.notebook_path;
    if (typeof command !== "string" && typeof file === "string") {
      own(payload.session_id, dir, [file]);
      return;
    }
    if (typeof command === "string") ownChanged(payload.session_id, dir, ignore);
    if (typeof command === "string")
      recordPass(
        payload.session_id,
        dir,
        {
          command,
          failed: failedResponse(payload),
          background: payload.tool_input?.run_in_background === true,
        },
        ignore,
      );
  });
}
