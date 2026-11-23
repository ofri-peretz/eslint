#!/usr/bin/env node
// stop-after-3 — Claude Code PostToolUse / PostToolUseFailure hook for Bash. Canonical copy:
// burgee packages/hookset/claude/. `hookset init --claude` vendors it next to guard-bash.mjs.
//
// "After three failed tries, stop and ask" was a sentence in CLAUDE.md, and a sentence is a
// suggestion. This counts failed test runs per session; a passing run resets the count, and the
// third failure in a row ends the turn (`continue: false`) with a message telling the agent to
// show the person what fails and ask how to proceed.
//
// A test run is a command whose words name a test runner (vitest, jest, `npm test`,
// `npm run test*`, `turbo run test`, `node --test`, `ci:local`, pytest, `cargo test`, `go test`).
// `node stop-after-3.mjs --self-test` runs the cases at the bottom.

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { commands } from "./guard-bash.mjs";

export const LIMIT = 3;

const RUNNERS = new Set(["vitest", "jest", "mocha", "pytest", "ava", "tap"]);
/** Words that hand the next word the job of being the command: `npx vitest`, `pnpm exec jest`. */
const LAUNCHERS = new Set(["npx", "bunx", "pnpx", "exec", "dlx", "--no", "--yes", "-y", "yarn", "--"]);

/** True when one command's words run a test suite. */
function runsTests(words) {
  // The command word itself, past `VAR=value` assignments: `echo vitest` runs echo.
  let start = 0;
  while (/^\w+=/.test(words[start] ?? "")) start++;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const next = words[i + 1] ?? "";
    const head = i === start || LAUNCHERS.has(words[i - 1] ?? "");
    // Every form counts only as the command itself: `echo npm test` runs echo.
    if (!head) continue;
    if (RUNNERS.has(w) || RUNNERS.has(w.split("/").pop())) return true;
    if (/^(npm|pnpm|yarn|bun)$/.test(w) && (next === "test" || next === "t")) return true;
    if (/^(npm|pnpm|yarn|bun)$/.test(w) && next === "run" && /^(test|ci:local)([:-].*)?$/.test(words[i + 2] ?? "")) return true;
    if (w === "turbo" && next === "run" && words.slice(i + 2).some((x) => /^test([:-].*)?$/.test(x))) return true;
    if (w === "node" && words.slice(i + 1).includes("--test")) return true;
    if ((w === "cargo" || w === "go") && next === "test") return true;
    if (w === "playwright" && next === "test") return true;
  }
  return false;
}

export function isTestCommand(command) {
  return commands(command).some(runsTests);
}

function stateFile(session) {
  const dir = join(tmpdir(), "hookset-stop-after-3");
  mkdirSync(dir, { recursive: true });
  return join(dir, `${String(session || "default").replace(/[^\w.-]/g, "_")}.json`);
}

function readCount(file) {
  try {
    return Number(JSON.parse(readFileSync(file, "utf8")).failures) || 0;
  } catch {
    return 0;
  }
}

/**
 * The hook's answer for one event: the JSON to print, or null. `failed` is true for a
 * PostToolUseFailure event (or a PostToolUse whose response says it failed).
 */
export function record(session, command, failed) {
  if (!isTestCommand(command)) return null;
  const file = stateFile(session);
  if (!failed) {
    rmSync(file, { force: true });
    return null;
  }
  const failures = readCount(file) + 1;
  if (failures < LIMIT) {
    writeFileSync(file, JSON.stringify({ failures }));
    return null;
  }
  rmSync(file, { force: true });
  const reason =
    `[stop-after-3] Tests have failed ${failures} times in a row this session. Stop here: ` +
    "tell the person which tests fail, with the output, what you tried, and the options " +
    "(keep trying on the failing tests only, change approach, or stop). Do not run them again until they answer.";
  return { continue: false, stopReason: reason, systemMessage: reason };
}

function failedResponse(payload) {
  if (payload.hook_event_name === "PostToolUseFailure") return true;
  const r = payload.tool_response;
  if (!r || typeof r !== "object") return false;
  if (r.interrupted === true) return false;
  const code = r.exitCode ?? r.exit_code ?? r.returnCode ?? r.code;
  return typeof code === "number" ? code !== 0 : r.is_error === true || r.isError === true;
}

export const CASES = {
  tests: [
    "npx vitest run src/a.test.ts",
    "npm test",
    "npm run test -- --filter x",
    "npm run ci:local",
    "npx --no turbo run typecheck test build",
    "node --test tests/",
    "cd pkg && pnpm test",
    "./node_modules/.bin/jest -t x",
    "cargo test -p core",
  ],
  other: ["npm run build", "git commit -m 'fix tests'", "echo vitest", "echo npm test", "grep -r 'go test' docs", "npm run typecheck", "go build ./..."],
};

function selfTest() {
  const session = `self-test-${process.pid}`;
  const bad = [
    ...CASES.tests.filter((c) => !isTestCommand(c)).map((c) => `should count: ${c}`),
    ...CASES.other.filter((c) => isTestCommand(c)).map((c) => `should ignore: ${c}`),
  ];
  const seq = [record(session, "npm test", true), record(session, "npm test", true), record(session, "npm test", true)];
  if (seq[0] || seq[1] || !seq[2] || seq[2].continue !== false) bad.push("third failure should stop the turn");
  record(session, "npm test", true);
  record(session, "npm test", false);
  if (record(session, "npm test", true) || record(session, "npm test", true)) bad.push("a pass should reset the count");
  record(session, "npm test", false);
  // A passing command that only mentions a test run must not reset the count.
  record(session, "npm test", true);
  record(session, "npm test", true);
  record(session, "echo npm test", false);
  if (record(session, "npm test", true)?.continue !== false) bad.push("echo npm test should not reset the count");
  record(session, "npm test", false);
  process.stdout.write(bad.length ? `${bad.join("\n")}\n${bad.length} failing\n` : `ok: ${CASES.tests.length} counted, ${CASES.other.length} ignored, stop on ${LIMIT}\n`);
  process.exit(bad.length ? 1 : 0);
}

// Imported (stop-after-3 reads `commands` from guard-bash) is not run: only the entry file acts.
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
    const command = payload.tool_input?.command;
    if (typeof command !== "string") process.exit(0);
    const out = record(payload.session_id, command, failedResponse(payload));
    if (out) process.stdout.write(JSON.stringify(out));
  });
}
