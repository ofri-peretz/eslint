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
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { globToRegExp } from "./guard-bash.mjs";
import { isTestCommand } from "./stop-after-3.mjs";

const DOCS = /\.(md|mdx|txt)$/i;

/** The uncommitted paths `git status` lists, staged, unstaged and untracked, renames as their new path. */
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
    // A rename or copy is followed by its old path, which is not in the tree any more.
    if (entry[0] === "R" || entry[0] === "C") i++;
  }
  return paths;
}

/** True when `path` is code this hook judges: not docs, not a glob the repo ignores. */
export function counts(path, ignore = []) {
  const rel = path.replaceAll("\\", "/");
  return !DOCS.test(rel) && !ignore.some((g) => globToRegExp(g).test(rel));
}

/** One hash over every uncommitted code path and its content, or null when there is none. */
export function fingerprint(dir, ignore = []) {
  const paths = changedPaths(dir)
    .filter((p) => counts(p, ignore))
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

function passedHash(session) {
  try {
    return JSON.parse(readFileSync(stateFile(session), "utf8")).hash ?? null;
  } catch {
    return null;
  }
}

/** PostToolUse: a passing test run remembers what the code looked like. Prints nothing. */
export function recordPass(session, dir, command, failed, ignore = []) {
  if (failed || !isTestCommand(command)) return;
  const fp = fingerprint(dir, ignore);
  // A pass with nothing uncommitted proves the committed tree; forget any older fingerprint.
  if (fp) writeFileSync(stateFile(session), JSON.stringify({ hash: fp.hash }));
  else rmSync(stateFile(session), { force: true });
}

/** Stop: the JSON that sends the turn back, or null to let it end. */
export function decideStop(session, dir, active, ignore = []) {
  if (active) return null;
  const fp = fingerprint(dir, ignore);
  if (!fp || fp.hash === passedHash(session)) return null;
  const shown =
    fp.paths.slice(0, 5).join(", ") +
    (fp.paths.length > 5 ? `, and ${fp.paths.length - 5} more` : "");
  return {
    decision: "block",
    reason:
      `[verify-before-stop] Code changed since the last passing test run (${shown}). ` +
      "Run the tests that cover it, or the repo's verify skill, and say what passed. " +
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

  if (decideStop(session, dir, false))
    bad.push("a clean tree should end the turn");
  writeFileSync(join(dir, "notes.md"), "x");
  if (decideStop(session, dir, false))
    bad.push("a docs-only change should end the turn");
  writeFileSync(join(dir, "a.ts"), "export const a = 1;\n");
  if (decideStop(session, dir, false)?.decision !== "block")
    bad.push("untested code should send the turn back");
  if (decideStop(session, dir, true))
    bad.push("the second stop of a turn should always pass");
  if (decideStop(session, dir, false, ["*.ts"]))
    bad.push("a verifyIgnore glob should not count");
  recordPass(session, dir, "npm run build", false);
  if (!decideStop(session, dir, false)) bad.push("a build is not a test run");
  recordPass(session, dir, "npx vitest run", true);
  if (!decideStop(session, dir, false))
    bad.push("a failing test run is not a pass");
  recordPass(session, dir, "npx vitest run", false);
  if (decideStop(session, dir, false))
    bad.push("a passing run over this code should end the turn");
  writeFileSync(join(dir, "a.ts"), "export const a = 2;\n");
  if (!decideStop(session, dir, false))
    bad.push("an edit after the pass should send the turn back");

  rmSync(stateFile(session), { force: true });
  rmSync(dir, { recursive: true, force: true });
  process.stdout.write(
    bad.length ? `${bad.join("\n")}\n${bad.length} failing\n` : "ok: 9 cases\n",
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
    if (typeof command === "string")
      recordPass(
        payload.session_id,
        dir,
        command,
        failedResponse(payload),
        ignore,
      );
  });
}
