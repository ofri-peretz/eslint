#!/usr/bin/env node
// guard-bash — Claude Code PreToolUse hook for Bash, Edit and Write. Canonical copy:
// burgee packages/hookset/claude/. `hookset init --claude` vendors it into a repo's
// .claude/hooks/, byte-identical, and `hookset check` fails when the copy drifts.
//
// It replaces prose that every CLAUDE.md used to repeat. A rule an agent can break
// with one command is a check, not a sentence: the denial below is the documentation.
//
//   1. Skipping git hooks (--no-verify, `git commit -n`, LEFTHOOK=0/HUSKY=0) — the hooks are the gate.
//   2. Pointing git at other hooks (`git config core.hooksPath`, `git -c core.hooksPath=`).
//   3. Hand-rolled CI polling (`until/while … gh … sleep`) — the harness kills those loops
//      and the turn ends knowing nothing. `gh pr checks <PR> --watch` blocks correctly.
//   4. Asks (never denies) before a publish: `npm publish`, `changeset publish`, and the
//      commands the repo lists under `ask` in .claude/hookset.json (deploys, releases).
//   5. Denies Edit/Write on a path matching a glob the repo lists under `frozen` there.
//
// Matching is done on tokens, not regexes over the raw command: quoted strings and
// heredoc bodies are data (commit messages, PR bodies), and no pattern here can backtrack.
// Reads the PreToolUse payload on stdin. Prints a deny or ask decision, or nothing (no opinion).
// `node guard-bash.mjs --self-test` runs the cases at the bottom.

const SEPARATORS = new Set([";", "&", "|", "\n", "(", ")"]);

/** Drop heredoc bodies: everything after a `<<WORD` line until the line that is WORD. */
function dropHeredocs(cmd) {
  const out = [];
  let end = null;
  for (const line of cmd.split("\n")) {
    if (end !== null) {
      if (line.trim() === end) end = null;
      continue;
    }
    out.push(line);
    const at = line.indexOf("<<");
    // `<<<` is a herestring, not a heredoc: it has no body to skip.
    if (at !== -1 && line[at + 2] !== "<") {
      const word = line
        .slice(at + 2)
        .replace(/^-/, "")
        .trim()
        .split(" ")[0]
        .replaceAll("'", "")
        .replaceAll('"', "");
      if (word) end = word;
    }
  }
  return out.join("\n");
}

/** Index just past the quote that closes the one at `start`. */
function skipQuoted(src, start) {
  const quote = src[start];
  let i = start + 1;
  while (i < src.length && src[i] !== quote)
    i += src[i] === "\\" && quote === '"' ? 2 : 1;
  return i + 1;
}

/**
 * Split into commands of whitespace-separated words. Quoted text becomes an empty word, except a
 * quoted lone flag ("--no-verify"), which the shell passes to git as the bare flag.
 */
export function commands(cmd) {
  const src = dropHeredocs(cmd ?? "").replace(/\\\n/g, " ");
  const result = [];
  let words = [];
  let word = "";
  const flushWord = () => {
    if (word !== "") words.push(word);
    word = "";
  };
  const flushCommand = () => {
    flushWord();
    if (words.length) result.push(words);
    words = [];
  };
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "'" || ch === '"') {
      const end = skipQuoted(src, i);
      const inner = src.slice(i + 1, end - 1);
      // A quoted lone flag reaches git as that flag, unless it is the value of a message or file flag.
      const isValue = word === "" && /^(-[a-zA-Z]*[mF]|--message|--file|--trailer)$/.test(words.at(-1) ?? "");
      word += !isValue && /^-[\w-]+$/.test(inner) ? inner : '""';
      i = end;
      continue;
    }
    if (SEPARATORS.has(ch)) flushCommand();
    else if (ch === " " || ch === "\t") flushWord();
    else word += ch;
    i++;
  }
  flushCommand();
  return result;
}

const GIT_OPTS_WITH_VALUE = new Set([
  "-C",
  "-c",
  "--git-dir",
  "--work-tree",
  "--namespace",
]);

function skipsHooks(words) {
  const g = words.indexOf("git");
  if (g === -1) return false;
  const env = words.slice(0, g);
  // Skip git's global options (git -C dir commit, git -c k=v push) to reach the subcommand.
  let s = g + 1;
  while (words[s]?.startsWith("-"))
    s += GIT_OPTS_WITH_VALUE.has(words[s]) ? 2 : 1;
  const sub = words[s];
  const args = words.slice(s + 1);
  if (args.includes("--no-verify")) return true;
  if (
    sub === "commit" &&
    args.some((a) => /^-[a-zA-Z]+$/.test(a) && a.includes("n"))
  )
    return true;
  const offEnv = env.some((w) => /^(LEFTHOOK|HUSKY)=(0|false)$/.test(w));
  return offEnv && (sub === "commit" || sub === "push");
}

/** `git config [--global|--local] core.hooksPath x` or `git -c core.hooksPath=x …`. */
function movesHooks(words) {
  const g = words.indexOf("git");
  if (g === -1) return false;
  const rest = words.slice(g + 1);
  for (let i = 0; i < rest.length; i++)
    if (rest[i] === "-c" && /^core\.hookspath=/i.test(rest[i + 1] ?? "")) return true;
  const c = rest.indexOf("config");
  return c !== -1 && rest.slice(c + 1).some((w) => /^core\.hookspath$/i.test(w)) && !rest.includes("--get") && !rest.includes("--unset");
}

/** True when `words` holds `phrase` (a space-separated word list) as a contiguous run. */
function hasPhrase(words, phrase) {
  const want = phrase.split(" ").filter(Boolean);
  if (!want.length) return false;
  for (let i = 0; i + want.length <= words.length; i++)
    if (want.every((w, j) => words[i + j] === w)) return true;
  return false;
}

export const PUBLISH = ["npm publish", "pnpm publish", "yarn npm publish", "changeset publish"];

const RULES = [
  {
    id: "no-verify",
    test: (cmds) => cmds.some(skipsHooks),
    reason:
      "Git hooks are this repo's gate: never skip them (--no-verify, commit -n, LEFTHOOK=0). " +
      "If a hook fails, fix what it reports. If it is slow, wait: commit/push hooks can take 3–4 minutes, " +
      "and a killed push may still have landed (check `git log origin/<branch> -1` before retrying).",
  },
  {
    id: "hooks-path",
    test: (cmds) => cmds.some(movesHooks),
    reason:
      "Do not point git at other hooks (core.hooksPath): lefthook installed this repo's hooks and they are the gate. " +
      "If a hook is wrong, fix lefthook.yml or the hookset preset in a PR.",
  },
  {
    id: "ci-poll-loop",
    test: (cmds) => {
      const all = cmds.flat();
      return (
        (all.includes("until") || all.includes("while")) &&
        all.includes("gh") &&
        all.includes("sleep")
      );
    },
    reason:
      "Do not hand-roll CI polling loops: the harness timeout kills them and the turn ends knowing nothing. " +
      "Use `gh pr checks <PR> --watch` (or `gh run watch <run-id>`; in interlace, `pr-blockers watch`). " +
      "`--watch` returning means nothing is pending, not that everything passed: check the results after.",
  },
];

/**
 * The verdict for one Bash command: `{ decision: "deny" | "ask", id, reason }`, or null.
 * `ask` holds extra phrases the repo wants a person to approve (from .claude/hookset.json).
 */
export function decide(command, ask = []) {
  const cmds = commands(command);
  for (const r of RULES)
    if (r.test(cmds)) return { decision: "deny", id: r.id, reason: r.reason };
  const phrase = [...PUBLISH, ...ask].find((p) => cmds.some((w) => hasPhrase(w, p)));
  if (phrase)
    return {
      decision: "ask",
      id: "publish",
      reason: `\`${phrase}\` publishes or deploys outside this repo, and that cannot be undone. A person approves it; CI release workflows are the usual route.`,
    };
  return null;
}

/** `*` within a segment, `**` across segments, `?` one character. Paths use forward slashes. */
export function globToRegExp(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i];
    if (ch === "*" && glob[i + 1] === "*") {
      re += glob[i + 2] === "/" ? "(?:.*/)?" : ".*";
      i += glob[i + 2] === "/" ? 2 : 1;
    } else if (ch === "*") re += "[^/]*";
    else if (ch === "?") re += "[^/]";
    else re += /[.+^${}()|[\]\\]/.test(ch) ? `\\${ch}` : ch;
  }
  return new RegExp(`^${re}$`);
}

/** The verdict for an Edit/Write on `file` (relative to the repo), or null. */
export function decideEdit(file, frozen = []) {
  const rel = String(file ?? "").replaceAll("\\", "/").replace(/^\.\//, "");
  const hit = frozen.find((g) => globToRegExp(g).test(rel));
  return hit
    ? {
        decision: "deny",
        id: "frozen",
        reason: `${rel} matches the frozen glob \`${hit}\` in .claude/hookset.json. It changes only by a decision: record one, then edit the list in its own PR.`,
      }
    : null;
}

export const CASES = {
  deny: [
    "git commit --no-verify -m x",
    "git push --no-verify origin x",
    'git commit -nm "x"',
    "git commit -n -m x",
    "LEFTHOOK=0 git push",
    "cd repo && git commit --no-verify",
    'git commit "--no-verify" -m x',
    "git -C . commit -n -m x",
    "LEFTHOOK=0 git -c core.x=1 push",
    "git config core.hooksPath /dev/null",
    "git -c core.hooksPath=/tmp/none push",
    "HUSKY=false git commit -m x",
    "read -r b <<< 'x'\ngit commit --no-verify -m y",
    "git commit \\\n  --no-verify -m x",
    "until gh pr view 5 --json state | grep MERGED; do sleep 30; done",
    "while true; do gh run list; sleep 10; done",
    "until gh workflow view ci; do sleep 5; done",
  ],
  allow: [
    'git commit -m "docs: explain why --no-verify is banned"',
    'git commit -m "--no-verify"',
    'git commit -am "--no-verify"',
    "git commit -F - <<'EOF'\nnever use --no-verify\nEOF",
    "git commit -F - <<'EOF'\nuntil gh pr checks; do sleep 1; done\nEOF\ngit push",
    "gh pr checks 12 --watch",
    "git -C . log -n 3",
    'git commit -am "x"',
    "sleep 5",
    "LEFTHOOK=0 npm ci",
    "git log -n 3",
    "git config --get core.hooksPath",
    'echo "npm publish" > notes.txt',
  ],
  ask: ["npm publish --access public", "cd pkg && npx changeset publish", "pnpm publish"],
};

function selfTest() {
  const bad = [
    ...CASES.deny.filter((c) => decide(c)?.decision !== "deny").map((c) => `should deny: ${c}`),
    ...CASES.allow.filter((c) => decide(c)).map((c) => `should allow: ${c}`),
    ...CASES.ask.filter((c) => decide(c)?.decision !== "ask").map((c) => `should ask: ${c}`),
  ];
  process.stdout.write(
    bad.length
      ? `${bad.join("\n")}\n${bad.length} failing\n`
      : `ok: ${CASES.deny.length} denied, ${CASES.allow.length} allowed, ${CASES.ask.length} asked\n`,
  );
  process.exit(bad.length ? 1 : 0);
}

/** The repo's `.claude/hookset.json`: `{ "ask": [phrases], "frozen": [globs] }`. Missing is empty. */
async function repoConfig() {
  const { readFile } = await import("node:fs/promises");
  const dir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  try {
    const c = JSON.parse(await readFile(`${dir}/.claude/hookset.json`, "utf8"));
    return {
      dir,
      ask: Array.isArray(c.ask) ? c.ask.map(String) : [],
      frozen: Array.isArray(c.frozen) ? c.frozen.map(String) : [],
    };
  } catch {
    return { dir, ask: [], frozen: [] };
  }
}

// Imported (stop-after-3 reads `commands` from guard-bash) is not run: only the entry file acts.
const isMain = Boolean(process.argv[1]) && import.meta.url.endsWith(`/${process.argv[1].split(/[\\/]/).pop()}`);
if (isMain && process.argv.includes("--self-test")) selfTest();
else if (isMain) {
  let raw = "";
  process.stdin.on("data", (d) => (raw += d));
  process.stdin.on("end", async () => {
    let payload;
    try {
      payload = JSON.parse(raw) ?? {};
    } catch {
      process.exit(0);
    }
    const input = payload.tool_input ?? {};
    const config = await repoConfig();
    let hit = null;
    if (typeof input.command === "string") hit = decide(input.command, config.ask);
    else {
      const file = input.file_path ?? input.notebook_path;
      if (typeof file === "string") {
        const rel = file.startsWith(`${config.dir}/`) ? file.slice(config.dir.length + 1) : file;
        hit = decideEdit(rel, config.frozen);
      }
    }
    if (!hit) process.exit(0);
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: hit.decision,
          permissionDecisionReason: `[guard-bash:${hit.id}] ${hit.reason}`,
        },
      }),
    );
  });
}
