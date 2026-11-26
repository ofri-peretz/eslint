#!/usr/bin/env node
// codegraph — Claude Code SessionStart hook. Canonical copy: burgee packages/hookset/claude/.
// `hookset init --claude` vendors it next to guard-bash.mjs.
//
// A repo whose .mcp.json runs the CodeGraph MCP server answers "where is X, what calls it, how
// does A reach B" from a prebuilt symbol graph in one codegraph_explore call, where grep takes a
// search, a read and a re-search. The server never builds its own index, and a cloud session
// starts from a fresh clone without one, so the tool would answer "not indexed" every time. This
// starts `codegraph init` (or `sync`, when an index is there) in the background so the session is
// not held for it; the server picks the index up when it lands.
//
// Denying a symbol-shaped grep once was tried and measured on burgee: it added tool calls and did
// not cut greps, so the hook only builds the index.
//
// It does nothing in a repo with no codegraph server in .mcp.json, or with HOOKSET_CODEGRAPH=0.
// `node codegraph.mjs --self-test` runs the cases at the bottom.

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** The npm spec the repo's .mcp.json runs (`@colbymchenry/codegraph@1.6.4`), or null when it runs none. */
export function serverSpec(dir) {
  try {
    const server = JSON.parse(readFileSync(join(dir, ".mcp.json"), "utf8"))?.mcpServers?.codegraph;
    return (server?.args ?? []).find((a) => typeof a === "string" && /(^|\/)codegraph@[^/]+$/.test(a)) ?? null;
  } catch {
    return null;
  }
}

/**
 * The npx arguments that bring the index up to date: build it on a fresh clone, catch it up otherwise.
 * The path is "." because the index runs with `dir` as its cwd: on Windows npx runs through a shell,
 * which would split a path with a space in it.
 */
export function indexArgs(dir, spec) {
  const indexed = existsSync(join(dir, ".codegraph", "codegraph.db"));
  return ["-y", spec, ...(indexed ? ["sync"] : ["init", "--yes"]), "."];
}

function startIndex(dir, spec) {
  // Telemetry off through the env var: `init` and `sync` reject `--no-telemetry`, which only `serve` takes.
  const env = { ...process.env, CODEGRAPH_TELEMETRY: "0" };
  const windows = process.platform === "win32";
  const child = spawn(windows ? "npx.cmd" : "npx", indexArgs(dir, spec), { cwd: dir, env, detached: true, stdio: "ignore", shell: windows });
  child.on("error", () => {});
  child.unref();
}

export const CASES = {
  specs: {
    '{"mcpServers":{"codegraph":{"args":["-y","@colbymchenry/codegraph@1.6.4","serve","--mcp"]}}}': "@colbymchenry/codegraph@1.6.4",
    '{"mcpServers":{"codegraph":{"command":"codegraph","args":["serve","--mcp"]}}}': null,
    '{"mcpServers":{"other":{"args":["-y","@colbymchenry/codegraph@1.6.4"]}}}': null,
    "not json": null,
  },
};

function selfTest() {
  const bad = [];
  for (const [json, want] of Object.entries(CASES.specs)) {
    const dir = mkdtempSync(join(tmpdir(), "codegraph-"));
    writeFileSync(join(dir, ".mcp.json"), json);
    if (serverSpec(dir) !== want) bad.push(`spec of ${json}: want ${want}, got ${serverSpec(dir)}`);
  }
  const dir = mkdtempSync(join(tmpdir(), "codegraph-"));
  if (indexArgs(dir, "x@1").join(" ") !== "-y x@1 init --yes .") bad.push("a fresh clone should init");
  mkdirSync(join(dir, ".codegraph"));
  writeFileSync(join(dir, ".codegraph", "codegraph.db"), "");
  if (indexArgs(dir, "x@1").join(" ") !== "-y x@1 sync .") bad.push("an indexed repo should sync");
  if (serverSpec(join(dir, "missing")) !== null) bad.push("no .mcp.json should be null");
  process.stdout.write(bad.length ? `${bad.join("\n")}\n${bad.length} failing\n` : `ok: ${Object.keys(CASES.specs).length + 3} cases\n`);
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
    if (process.env.HOOKSET_CODEGRAPH === "0" || payload.hook_event_name !== "SessionStart") process.exit(0);
    const dir = process.env.CLAUDE_PROJECT_DIR || payload.cwd || process.cwd();
    const spec = serverSpec(dir);
    if (spec) startIndex(dir, spec);
  });
}
