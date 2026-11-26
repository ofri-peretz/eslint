#!/usr/bin/env node
// guard-bash — Claude Code PreToolUse hook for Bash, Edit and Write. Canonical copy:
// burgee packages/hookset/claude/. `hookset init --claude` vendors it into a repo's
// .claude/hooks/, byte-identical, and `hookset check` fails when the copy drifts.
//
// It replaces prose that every CLAUDE.md used to repeat. A rule an agent can break
// with one command is a check, not a sentence: the denial below is the documentation.
//
//   1. Skipping git hooks (--no-verify and its abbreviations, `git commit -n`, LEFTHOOK=0/HUSKY=0,
//      also exported earlier in the same command) — the hooks are the gate.
//   2. Pointing git at other hooks (`git config core.hooksPath`, `git -c core.hooksPath=`,
//      GIT_CONFIG_KEY_n=core.hooksPath) or removing them (`lefthook uninstall`, rm/mv/chmod .git/hooks).
//   3. Hand-rolled CI polling (`until/while/for … gh … sleep`, `watch … gh`) — the harness kills
//      those loops and the turn ends knowing nothing. `gh pr checks <PR> --watch` blocks correctly.
//   4. Asks (never denies) before a publish: npm/pnpm/yarn/bun `publish`, `unpublish`, `deprecate`,
//      `dist-tag add|rm`, `changeset publish`, `lerna publish`, and the commands the repo lists
//      under `ask` in .claude/hookset.json (deploys, releases).
//   5. Denies Edit/Write on a path matching a glob the repo lists under `frozen` there, and on
//      a generated file (`generated`: glob -> the command that writes it), naming that command.
//   6. Denies `git commit` / `git push` run in the foreground under the default 2-minute
//      timeout: their hooks are the repo's gate and take minutes. The denial names the fix
//      (timeout 600000 or run_in_background), so no CLAUDE.md has to say "not a hang".
//   7. Asks before a push that rewrites or deletes remote history: --force, --force-with-lease,
//      -f, +refspec, --delete, :refspec, --mirror, --prune.
//
//   8. Denies a `git commit -m/-F` whose message the repo's commit-msg stations would reject
//      (commitlint with the repo's own config, and the `Verified-by:` receipt where the repo has the
//      provedone station), so the failure comes in seconds, before the pre-commit hook has run for minutes.
//      No commitlint config or install, an interactive commit, or any internal error: no opinion.
//
// Matching is done on tokens, not regexes over the raw command: quoted strings and
// heredoc bodies are data (commit messages, PR bodies), and no pattern here can backtrack.
// Reads the PreToolUse payload on stdin. Prints a deny or ask decision, or nothing (no opinion).
// `node guard-bash.mjs --self-test` runs the cases at the bottom.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { posix } from "node:path";

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

const VALUE_FLAG = /^(-[a-zA-Z]*[mF]|--message|--file|--trailer)$/;

/** True when words[k] is a flag that takes the next word as its value, and was not itself one. */
function takesValue(words, k) {
  return k >= 0 && VALUE_FLAG.test(words[k]) && !takesValue(words, k - 1);
}

/**
 * Split into commands of whitespace-separated words. Quoted text becomes an empty word, except a
 * quoted single word ("--no-verify", "core.hooksPath=x"), which the shell passes on as that word.
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
      // A quoted single word reaches the program as that word, unless it is a message or file value.
      const isValue = word === "" && takesValue(words, words.length - 1);
      word += !isValue && /^\S+$/.test(inner) ? inner : '""';
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

/** Index of git's subcommand in `words` (past `git -C dir`, `git -c k=v`), or -1. */
function gitSub(words) {
  const g = words.indexOf("git");
  if (g === -1) return -1;
  let s = g + 1;
  while (words[s]?.startsWith("-"))
    s += GIT_OPTS_WITH_VALUE.has(words[s]) ? 2 : 1;
  return s;
}

function skipsHooks(words) {
  const s = gitSub(words);
  if (s === -1) return false;
  const env = words.slice(0, words.indexOf("git"));
  const sub = words[s];
  const args = words.slice(s + 1);
  // git takes any unambiguous prefix of a long option: `--no-veri` skips hooks like `--no-verify`.
  if (args.some((a) => /^--no-veri(f|fy)?$/.test(a))) return true;
  if (
    sub === "commit" &&
    args.some((a) => /^-[a-zA-Z]+$/.test(a) && a.includes("n"))
  )
    return true;
  const offEnv = env.some((w) => /^(LEFTHOOK|HUSKY)=(0|false)$/.test(w));
  return offEnv && (sub === "commit" || sub === "push");
}

const HOOKS_OFF = /^(LEFTHOOK|HUSKY)=(0|false)$/;

/** `export LEFTHOOK=0; git push`: the variable outlives its own command, so any commit or push after it is unhooked. */
function hooksOffInShell(cmds) {
  if (!cmds.some((w) => w.some((x) => HOOKS_OFF.test(x)))) return false;
  return cmds.some((w) => {
    const s = gitSub(w);
    return s !== -1 && (w[s] === "commit" || w[s] === "push");
  });
}

const HOOK_FILE_TOOLS = new Set(["rm", "mv", "chmod", "unlink", "truncate", "ln"]);

/** `lefthook uninstall`, `rm .git/hooks/pre-push`, `> .git/hooks/pre-commit`: the hooks are gone. */
function removesHooks(words) {
  if (hasPhrase(words, "lefthook uninstall")) return true;
  const inHooks = (w) => /(^|\/)\.git\/hooks(\/|$)/.test(w.replace(/^>+/, ""));
  if (words.some((w, i) => inHooks(w) && (w.startsWith(">") || /^>+$/.test(words[i - 1] ?? "")))) return true;
  const tool = words.findIndex((w) => HOOK_FILE_TOOLS.has(w.split("/").pop()));
  return tool !== -1 && words.slice(tool + 1).some(inHooks);
}

/** `git config [--global|--local] core.hooksPath x`, `git -c core.hooksPath=x …`, `GIT_CONFIG_KEY_0=core.hooksPath`. */
function movesHooks(words) {
  if (words.some((w) => /^GIT_CONFIG_KEY_\d+=core\.hookspath$/i.test(w))) return true;
  if (removesHooks(words)) return true;
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

export const PUBLISH = ["npm publish", "pnpm publish", "yarn npm publish", "changeset publish", "lerna publish"];

const PACKAGE_MANAGERS = new Set(["npm", "pnpm", "yarn", "bun"]);
/** Subcommands that change the registry for everyone: no later command takes them back. */
const REGISTRY_WRITES = new Set(["publish", "unpublish", "deprecate"]);

/**
 * The registry write `words` runs, or null: npm, pnpm, yarn or bun (by any path, `/usr/bin/npm`)
 * with `publish`, `unpublish`, `deprecate` or `dist-tag add|rm` as its subcommand, after global
 * options: `npm --access=public publish`, `npm --registry https://r publish`. An option without `=`
 * may take the next word as its value, so that word is skipped unless it is the subcommand itself.
 */
function publishesAfterOptions(words) {
  const isWrite = (k) => REGISTRY_WRITES.has(words[k]) || (words[k] === "dist-tag" && /^(add|rm)$/.test(words[k + 1] ?? ""));
  for (let i = 0; i < words.length; i++) {
    const tool = words[i].split("/").pop();
    if (!PACKAGE_MANAGERS.has(tool)) continue;
    let j = i + 1;
    while (j < words.length && words[j].startsWith("-")) {
      // Any option without `=` may take the next word as its value (`--registry url`, `-F pkg`).
      const valued = !words[j].includes("=");
      j++;
      if (valued && j < words.length && !words[j].startsWith("-") && !isWrite(j)) j++;
    }
    if (isWrite(j)) return `${tool} ${words[j]}${words[j] === "dist-tag" ? ` ${words[j + 1]}` : ""}`;
  }
  return null;
}

/** True when `words` is a `git push` that rewrites or deletes history on the remote. */
function forcePushes(words) {
  const s = gitSub(words);
  if (s === -1 || words[s] !== "push") return false;
  return words.slice(s + 1).some(
    (a) =>
      /^--(force|force-with-lease|mirror|delete|prune)(=.*)?$/.test(a) ||
      (/^-[a-zA-Z]+$/.test(a) && /[fd]/.test(a)) ||
      /^[+:]./.test(a),
  );
}

const RULES = [
  {
    id: "no-verify",
    test: (cmds) => cmds.some(skipsHooks) || hooksOffInShell(cmds),
    reason:
      "Git hooks are this repo's gate: never skip them (--no-verify, commit -n, LEFTHOOK=0). " +
      "If a hook fails, fix what it reports. If it is slow, wait: commit/push hooks can take 3–4 minutes, " +
      "and a killed push may still have landed (check `git log origin/<branch> -1` before retrying).",
  },
  {
    id: "hooks-path",
    test: (cmds) => cmds.some(movesHooks),
    reason:
      "Do not point git at other hooks (core.hooksPath) or remove them (lefthook uninstall, .git/hooks): lefthook installed this repo's hooks and they are the gate. " +
      "If a hook is wrong, fix lefthook.yml or the hookset preset in a PR.",
  },
  {
    id: "ci-poll-loop",
    test: (cmds) => {
      const all = cmds.flat();
      if (cmds.some((w) => w[0] === "watch" && w.includes("gh"))) return true;
      return (
        (all.includes("until") || all.includes("while") || all.includes("for")) &&
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
  const phrase =
    PUBLISH.find((p) => cmds.some((w) => hasPhrase(w, p))) ??
    cmds.map(publishesAfterOptions).find(Boolean);
  if (phrase)
    return {
      decision: "ask",
      id: "publish",
      reason: `\`${phrase}\` changes the package registry outside this repo, and that cannot be undone. A person approves it; CI release workflows are the usual route.`,
    };
  if (cmds.some(forcePushes))
    return {
      decision: "ask",
      id: "force-push",
      reason:
        "This push rewrites or deletes history on the remote, which other sessions and reviewers may have built on. A person approves it. " +
        "If a push was rejected because the remote has commits you lack, merge them instead: `git fetch origin <branch> && git merge --no-edit FETCH_HEAD`.",
    };
  const listed = ask.find((p) => cmds.some((w) => hasPhrase(w, p)));
  if (listed)
    return {
      decision: "ask",
      id: "repo-ask",
      reason: `This repo lists \`${listed}\` in .claude/hookset.json as a step a person approves: it overwrites or ships something that is hard to take back.`,
    };
  return null;
}

/** Below this a foreground Bash call is killed while a commit or push hook is still running. */
export const HOOKED_MIN_TIMEOUT_MS = 300_000;

/**
 * The verdict for a `git commit` or `git push` given the Bash call's `timeout` and
 * `run_in_background`, or null. Their hooks run the repo's gate for minutes; the default
 * 2-minute timeout kills them mid-gate and the agent retries a push that may have landed.
 */
export function decideHooked(command, { timeout, run_in_background } = {}) {
  if (run_in_background === true || (Number(timeout) || 0) >= HOOKED_MIN_TIMEOUT_MS) return null;
  const hooked = commands(command).find((w) => {
    const s = gitSub(w);
    // `git commit --dry-run` runs no hooks; `git push --dry-run` still runs pre-push.
    return s !== -1 && (w[s] === "commit" ? !w.includes("--dry-run") : w[s] === "push") && !w.includes("--help");
  });
  if (!hooked) return null;
  const sub = hooked[gitSub(hooked)];
  return {
    decision: "deny",
    id: "hooked-timeout",
    reason:
      `\`git ${sub}\` runs this repo's ${sub === "push" ? "pre-push" : "commit"} hooks, which take minutes: not a hang. ` +
      "Run it again with `timeout: 600000` (or `run_in_background: true`) and wait for it. " +
      "If an earlier push was killed, check `git log origin/<branch> -1` first: it may have landed.",
  };
}

/** Words of the commands in `src`, quotes resolved (`"a b"` is one word), each with whether the shell would expand it. */
function shellWords(src) {
  const out = [];
  let words = [];
  let w = null;
  const flushWord = () => {
    if (w) words.push(w);
    w = null;
  };
  const flush = () => {
    flushWord();
    if (words.length) out.push(words);
    words = [];
  };
  const add = (text, dynamic) => {
    w ??= { text: "", dynamic: false };
    w.text += text;
    w.dynamic ||= dynamic;
  };
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "'") {
      const end = src.indexOf("'", i + 1);
      if (end === -1) return [];
      add(src.slice(i + 1, end), false);
      i = end + 1;
    } else if (ch === '"') {
      const end = skipQuoted(src, i) - 1;
      const inner = src.slice(i + 1, end);
      // `"$(cat <<'EOF' … EOF)"` is how a long message is passed: the body is the message.
      const doc = /^\$\(cat <<-?\s*(['"]?)(\w+)\1\n([\s\S]*?)\n[ \t]*\2\s*\)$/.exec(inner);
      if (doc) add(doc[3], false);
      else add(inner.replace(/\\([\\"$`])/g, "$1"), /[$`]/.test(inner));
      i = end + 1;
    } else if (ch === "\\" && src[i + 1] !== undefined) {
      add(src[i + 1], false);
      i += 2;
    } else if (SEPARATORS.has(ch)) {
      flush();
      i++;
    } else if (ch === " " || ch === "\t") {
      flushWord();
      i++;
    } else {
      add(ch, ch === "$" || ch === "`");
      i++;
    }
  }
  flush();
  return out;
}

/**
 * The message a `git commit -m … / -F …` carries, or null when it is not a commit, has none on its
 * command line (the editor opens), or cannot be known without running the shell. `read` returns a
 * file's text (or null); `-F -` reads the command's own heredoc.
 */
export function commitMessage(command, read = () => null) {
  let src = String(command ?? "").replace(/\\\n/g, " ");
  let stdin = null;
  if (/(?:-F|--file)[ =]-(?:\s|$)/.test(src)) {
    const heredoc = /<<-?\s*(['"]?)(\w+)\1[^\n]*\n([\s\S]*?)\n[ \t]*\2[ \t]*(?:\n|$)/.exec(src);
    if (heredoc) {
      stdin = heredoc[3];
      src = src.replace(heredoc[0], "\n");
    }
  }
  for (const w of shellWords(src)) {
    const s = gitSub(w.map((x) => x.text));
    if (s === -1 || w[s].text !== "commit") continue;
    const args = w.slice(s + 1);
    const parts = [];
    for (let k = 0; k < args.length; k++) {
      const a = args[k].text;
      let value;
      if (a === "--message" || a === "--file" || /^-[a-zA-Z]*[mF]$/.test(a)) {
        const arg = args[++k];
        if (!arg || arg.dynamic) return null;
        value = arg.text;
        if (/^-[a-zA-Z]*F$|^--file$/.test(a)) value = value === "-" ? stdin : read(value);
      } else if (/^--(message|file)=/.test(a)) {
        if (args[k].dynamic) return null;
        value = a.startsWith("--file=") ? read(a.slice(7)) : a.slice(10);
      } else if (/^-[a-zA-Z]*m./.test(a)) {
        if (args[k].dynamic) return null;
        value = a.slice(a.indexOf("m") + 1);
      } else continue;
      if (value === null || value === undefined) return null;
      parts.push(value);
    }
    return parts.length ? parts.join("\n\n") : null;
  }
  return null;
}

const COMMITLINT_CONFIG = [
  ...["", ".json", ".yaml", ".yml", ".js", ".cjs", ".mjs", ".ts", ".cts", ".mts"].map((e) => `.commitlintrc${e}`),
  ...["js", "cjs", "mjs", "ts", "cts", "mts"].map((e) => `commitlint.config.${e}`),
];

/** The `✖` lines commitlint prints for `message`: its rules (scope, type, footer width) come from the repo's own config; this only finds and runs it. */
function commitlintProblems(message, dir) {
  const pkg = (() => {
    try {
      return JSON.parse(readFileSync(`${dir}/package.json`, "utf8"));
    } catch {
      return {};
    }
  })();
  const cli = `${dir}/node_modules/@commitlint/cli/cli.js`;
  if (!existsSync(cli) || !(pkg.commitlint || COMMITLINT_CONFIG.some((f) => existsSync(`${dir}/${f}`)))) return [];
  const r = spawnSync(process.execPath, [cli], { cwd: dir, input: message, encoding: "utf8", timeout: 6000, env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" } });
  if (r.status !== 1) return [];
  // Lint failures are `✖ <message> [rule]` lines; a crash (bad config) prints none and has no opinion.
  return `${r.stdout}\n${r.stderr}`.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("✖") && /\[[a-z-]+\]$/.test(l));
}

/** The provedone receipt rule (burgee packages/provedone receipt.ts `verdict`), for repos that run its commit-msg station. */
function receiptProblem(message, dir) {
  const has = (f) => {
    try {
      return readFileSync(`${dir}/${f}`, "utf8").includes("provedone");
    } catch {
      return false;
    }
  };
  if (!has("package.json") && !has("lefthook.yml") && !has("lefthook.yaml")) return null;
  const lines = message
    .split("\n")
    .filter((l) => !l.startsWith("#"))
    .join("\n")
    .replace(/\n[ \t]+/g, " ")
    .split("\n");
  if (/^Merge /.test(lines.join("\n"))) return null;
  const values = lines.flatMap((l) => /^Verified-by:(.*)/i.exec(l)?.slice(1) ?? []).map((v) => v.trim());
  const fix = "add a trailer `Verified-by: <command> -> exit 0` (or `Verified-by: none (<why no check applies>)`)";
  if (!values.length) return `✖ no Verified-by: line: ${fix}`;
  if (values.some((v) => /^none\b/i.test(v) && !/^none \(\s*\S[^)]*\)$/i.test(v))) return "✖ `Verified-by: none` gives no reason: write `Verified-by: none (<why it needs no check>)`";
  if (values.some((v) => v === "")) return `✖ an empty Verified-by: line: ${fix}`;
  return null;
}

/** The verdict for a `git commit` whose message the commit-msg stations would reject, or null. Never throws. */
export function decideCommitMessage(command, dir) {
  try {
    const message = commitMessage(command, (f) => {
      try {
        return readFileSync(posix.isAbsolute(f) ? f : `${dir}/${f}`, "utf8");
      } catch {
        return null;
      }
    });
    if (message === null || message.trim() === "") return null;
    const problems = [...commitlintProblems(message, dir), receiptProblem(message, dir)].filter(Boolean);
    if (!problems.length) return null;
    return {
      decision: "deny",
      id: "commit-message",
      reason:
        `The commit-msg hook would reject this message, but only after the pre-commit hook has spent minutes on the tests. Fix it now:\n${problems.join("\n")}` +
        (problems.some((p) => p.includes("footer")) ? "\nFold a trailer longer than 100 characters onto a second line that starts with a space." : ""),
    };
  } catch {
    return null;
  }
}

/** `*` within a segment, `**` across segments, `?` one character. Paths use forward slashes. */
const GLOB_TOKEN = /\*\*\/|\*\*|\*|\?|[.+^${}()|[\]\\]/g;
const GLOB_PART = { "**/": "(?:.*/)?", "**": ".*", "*": "[^/]*", "?": "[^/]" };
export function globToRegExp(glob) {
  return new RegExp(`^${glob.replace(GLOB_TOKEN, (token) => GLOB_PART[token] ?? `\\${token}`)}$`);
}

/** The verdict for an Edit/Write on `file` (relative to the repo), or null. */
export function decideEdit(file, frozen = [], generated = {}) {
  // posix.normalize folds `a/../b` and `./a`, so a dotted path cannot step around a frozen glob.
  const rel = posix.normalize(String(file ?? "").replaceAll("\\", "/")).replace(/^\.\//, "");
  const made = Object.entries(generated).find(([g]) => globToRegExp(g).test(rel));
  if (made)
    return {
      decision: "deny",
      id: "generated",
      reason: `${rel} is generated (\`${made[0]}\` in .claude/hookset.json). Edit its source, then run \`${made[1]}\`.`,
    };
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
    'git -c "core.hooksPath=/dev/null" push',
    'git commit -m -F "--no-verify"',
    "HUSKY=false git commit -m x",
    "read -r b <<< 'x'\ngit commit --no-verify -m y",
    "git commit \\\n  --no-verify -m x",
    "until gh pr view 5 --json state | grep MERGED; do sleep 30; done",
    "while true; do gh run list; sleep 10; done",
    "until gh workflow view ci; do sleep 5; done",
    "git push --no-veri origin x",
    "git commit --no-verif -m x",
    "export LEFTHOOK=0; git push",
    "LEFTHOOK=0\ngit commit -m x",
    "export HUSKY=false && git -C . commit -m x",
    "lefthook uninstall",
    "npx lefthook uninstall",
    "rm .git/hooks/pre-push",
    "rm -f /repo/.git/hooks/pre-commit",
    "chmod -x .git/hooks/pre-commit",
    "mv .git/hooks .git/hooks.off",
    "echo > .git/hooks/pre-push",
    "GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.hooksPath GIT_CONFIG_VALUE_0=/dev/null git push",
    "for i in 1 2 3; do gh pr checks 5; sleep 30; done",
    "watch -n 30 gh pr checks 5",
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
    'git commit -m "never use --no-veri"',
    "cat .git/hooks/pre-push",
    "ls .git/hooks",
    "git push -u origin feature",
    "git push origin HEAD:refs/heads/feature",
    "npm view pkg dist-tags",
    "npm dist-tag ls pkg",
    "npm run publish:dry",
    "for f in a b; do echo $f; done",
    "LEFTHOOK=0 npm ci && git status",
  ],
  ask: [
    "npm publish --access public",
    "cd pkg && npx changeset publish",
    "pnpm publish",
    "npm --access=public publish",
    "npm --registry https://registry.npmjs.org publish",
    "pnpm --filter pkg publish",
    "pnpm -F pkg publish",
    "npm -g publish",
    "yarn publish",
    "bun publish",
    "/usr/local/bin/npm publish",
    "npm unpublish pkg@1.0.0",
    "pnpm deprecate pkg@1 old",
    "npm dist-tag add pkg@1.0.0 latest",
    "npx lerna publish from-package",
    "git push --force origin main",
    "git push -f",
    "git push -uf origin x",
    "git push origin +main",
    "git push --force-with-lease=main origin main",
    "git push origin :main",
    "git push --delete origin x",
    "git push -d origin x",
    "git push --mirror",
  ],
  // decideHooked cases: the command, its Bash input, and whether it is denied.
  hooked: [
    ["git push origin main", {}, true],
    ["git -C repo commit -m x", { timeout: 120000 }, true],
    ["cd a && git push", { timeout: 299999 }, true],
    ["git push", { timeout: 600000 }, false],
    ["git commit -m x", { run_in_background: true }, false],
    ["git push --dry-run", {}, true],
    ["git commit --dry-run -m x", {}, false],
    ["git log -n 3", {}, false],
    ["git commit -F - <<'EOF'\nx\nEOF", { timeout: 300000 }, false],
    ["echo 'git push'", {}, false],
  ],
  // decideEdit: [path, denied as] against EDIT_CONFIG.
  edit: [
    ["content/a/b.md", "frozen"],
    ["./docs/../content/a.md", "frozen"],
    ["public/r/button.json", "generated"],
    ["public/r/../r/x.json", "generated"],
    ["src/button.tsx", null],
  ],
};

const EDIT_CONFIG = { frozen: ["content/**/*.md"], generated: { "public/r/**": "npm run registry:build" } };

// decideCommitMessage: [command, denied as a message problem containing, or null], run in a repo
// with a commitlint config (a stand-in CLI that applies the same three rules), the provedone station.
export const MESSAGES = [
  ['git commit -m "feat(zzz): add x\n\nVerified-by: npm test -> exit 0"', "scope must be one of"],
  ['git commit -m "feat(ci): add x"', "no Verified-by"],
  ['git commit -m "feat(ci): add x" -m "Verified-by: none"', "gives no reason"],
  [`git commit -m "feat(ci): add x" -m "Verified-by: ${"x".repeat(120)} -> exit 0"`, "100 characters"],
  ['git commit -F - <<\'EOF\'\nfeat(zzz): x\n\nVerified-by: t -> exit 0\nEOF', "scope must be one of"],
  ['git commit -m "$(cat <<\'EOF\'\nfeat(ci): x\n\nbody\nEOF\n)"', "no Verified-by"],
  ['git commit -m "feat(ci): add x\n\nVerified-by: npm test -> exit 0"', null],
  ['git commit -am "fix(ci): x" -m "Verified-by: none (docs only)"', null],
  ['git commit -m "$(cat <<\'EOF\'\nfeat(ci): x\n\nVerified-by: npm test -> exit 0\nEOF\n)"', null],
  ["git commit", null],
  ["git commit --amend --no-edit", null],
  ['git commit -m "$MSG"', null],
  ['git log -m "feat(zzz): x"', null],
];

const FAKE_COMMITLINT = `let s = "";
process.stdin.on("data", (d) => (s += d)).on("end", () => {
  const out = [];
  const scope = /^\\w+\\(([^)]*)\\)/.exec(s)?.[1];
  if (scope && !["a", "ci"].includes(scope)) out.push("\\u2716 scope must be one of [a, ci] [scope-enum]");
  if (s.split("\\n").slice(1).some((l) => l.length > 100)) out.push("\\u2716 footer's lines must not be longer than 100 characters [footer-max-line-length]");
  console.log(out.join("\\n"));
  process.exit(out.length ? 1 : 0);
});
`;

async function messageFixture() {
  const { mkdtempSync, mkdirSync, writeFileSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const dir = mkdtempSync(`${tmpdir()}/guard-bash-`);
  mkdirSync(`${dir}/node_modules/@commitlint/cli`, { recursive: true });
  writeFileSync(`${dir}/node_modules/@commitlint/cli/cli.js`, FAKE_COMMITLINT);
  writeFileSync(`${dir}/commitlint.config.mjs`, "export default {};\n");
  writeFileSync(`${dir}/package.json`, JSON.stringify({ scripts: { "hook:provedone": "provedone gate --mode enforce" } }));
  return dir;
}

async function selfTest() {
  const repo = await messageFixture();
  const bare = await messageFixture();
  const bad = [
    ...CASES.deny.filter((c) => decide(c)?.decision !== "deny").map((c) => `should deny: ${c}`),
    ...CASES.allow.filter((c) => decide(c)).map((c) => `should allow: ${c}`),
    ...CASES.ask.filter((c) => decide(c)?.decision !== "ask").map((c) => `should ask: ${c}`),
    ...CASES.hooked
      .filter(([c, input, denied]) => Boolean(decideHooked(c, input)) !== denied)
      .map(([c, input, denied]) => `should ${denied ? "deny" : "allow"} ${JSON.stringify(input)}: ${c}`),
    ...CASES.edit
      .filter(([f, id]) => (decideEdit(f, EDIT_CONFIG.frozen, EDIT_CONFIG.generated)?.id ?? null) !== id)
      .map(([f, id]) => `should ${id ? `deny as ${id}` : "allow"}: edit ${f}`),
    ...MESSAGES.flatMap(([c, want]) => {
      const hit = decideCommitMessage(c, repo);
      return (want === null ? hit === null : hit?.reason.includes(want)) ? [] : [`should ${want === null ? "allow" : `deny (${want})`}: ${c}`];
    }),
  ];
  // Without a commitlint config or the provedone station there is nothing to enforce.
  const { rmSync } = await import("node:fs");
  rmSync(`${bare}/commitlint.config.mjs`);
  rmSync(`${bare}/package.json`);
  if (decideCommitMessage('git commit -m "feat(zzz): x"', bare)) bad.push("should allow a commit in a repo with no commitlint config or provedone station");
  rmSync(repo, { recursive: true, force: true });
  rmSync(bare, { recursive: true, force: true });
  process.stdout.write(
    bad.length
      ? `${bad.join("\n")}\n${bad.length} failing\n`
      : `ok: ${CASES.deny.length} denied, ${CASES.allow.length} allowed, ${CASES.ask.length} asked, ${CASES.hooked.length} timed, ${CASES.edit.length} edits, ${MESSAGES.length} messages\n`,
  );
  process.exit(bad.length ? 1 : 0);
}

/** The repo's `.claude/hookset.json`: `{ "ask": [phrases], "frozen": [globs], "generated": { glob: command } }`. Missing is empty. */
async function repoConfig() {
  const { readFile } = await import("node:fs/promises");
  const dir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  try {
    const c = JSON.parse(await readFile(`${dir}/.claude/hookset.json`, "utf8"));
    return {
      dir,
      ask: Array.isArray(c.ask) ? c.ask.map(String) : [],
      frozen: Array.isArray(c.frozen) ? c.frozen.map(String) : [],
      generated:
        c.generated && typeof c.generated === "object" && !Array.isArray(c.generated)
          ? Object.fromEntries(Object.entries(c.generated).map(([g, cmd]) => [g, String(cmd)]))
          : {},
    };
  } catch {
    return { dir, ask: [], frozen: [], generated: {} };
  }
}

// Imported (stop-after-3 reads `commands` from guard-bash) is not run: only the entry file acts.
const isMain = Boolean(process.argv[1]) && import.meta.url.endsWith(`/${process.argv[1].split(/[\\/]/).pop()}`);
if (isMain && process.argv.includes("--self-test")) await selfTest();
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
    if (typeof input.command === "string")
      hit = decide(input.command, config.ask) ?? decideCommitMessage(input.command, payload.cwd || config.dir) ?? decideHooked(input.command, input);
    else {
      const file = input.file_path ?? input.notebook_path;
      if (typeof file === "string") {
        // Windows hands both paths over with backslashes: compare them with forward slashes.
        const [f, d] = [file, config.dir].map((p) => posix.normalize(p.replaceAll("\\", "/")));
        const rel = f.startsWith(`${d}/`) ? f.slice(d.length + 1) : f;
        hit = decideEdit(rel, config.frozen, config.generated);
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
