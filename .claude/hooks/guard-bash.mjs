#!/usr/bin/env node
// guard-bash — Claude Code PreToolUse hook for Bash. One copy per Interlace repo,
// byte-identical; agents-sync carries it (agents/.claude/hooks/).
//
// It replaces prose that every CLAUDE.md used to repeat. A rule an agent can break
// with one command is a check, not a sentence: the denial below is the documentation.
//
//   1. Skipping git hooks (--no-verify, `git commit -n`, LEFTHOOK=0/HUSKY=0) — the hooks are the gate.
//   2. Hand-rolled CI polling (`until/while … gh … sleep`) — the harness kills those loops
//      and the turn ends knowing nothing. `gh pr checks <PR> --watch` blocks correctly.
//
// Matching is done on tokens, not regexes over the raw command: quoted strings and
// heredoc bodies are data (commit messages, PR bodies), and no pattern here can backtrack.
// Reads the PreToolUse payload on stdin. Prints a deny decision, or nothing (no opinion).
// `node guard-bash.mjs --self-test` runs the cases at the bottom.

const SEPARATORS = new Set([';', '&', '|', '\n', '(', ')']);

/** Drop heredoc bodies: everything after a `<<WORD` line until the line that is WORD. */
function dropHeredocs(cmd) {
  const out = [];
  let end = null;
  for (const line of cmd.split('\n')) {
    if (end !== null) {
      if (line.trim() === end) end = null;
      continue;
    }
    out.push(line);
    const at = line.indexOf('<<');
    if (at !== -1) {
      const word = line
        .slice(at + 2)
        .replace(/^-/, '')
        .trim()
        .split(' ')[0]
        .replaceAll("'", '')
        .replaceAll('"', '');
      if (word) end = word;
    }
  }
  return out.join('\n');
}

/** Index just past the quote that closes the one at `start`. */
function skipQuoted(src, start) {
  const quote = src[start];
  let i = start + 1;
  while (i < src.length && src[i] !== quote)
    i += src[i] === '\\' && quote === '"' ? 2 : 1;
  return i + 1;
}

/**
 * Split into commands of whitespace-separated words. Quoted text becomes an empty word, except a
 * quoted lone flag ("--no-verify"), which the shell passes to git as the bare flag.
 */
export function commands(cmd) {
  const src = dropHeredocs(cmd ?? '').replace(/\\\n/g, ' ');
  const result = [];
  let words = [];
  let word = '';
  const flushWord = () => {
    if (word !== '') words.push(word);
    word = '';
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
      word += /^-[\w-]+$/.test(inner) ? inner : '""';
      i = end;
      continue;
    }
    if (SEPARATORS.has(ch)) flushCommand();
    else if (ch === ' ' || ch === '\t') flushWord();
    else word += ch;
    i++;
  }
  flushCommand();
  return result;
}

const GIT_OPTS_WITH_VALUE = new Set([
  '-C',
  '-c',
  '--git-dir',
  '--work-tree',
  '--namespace',
]);

function skipsHooks(words) {
  const g = words.indexOf('git');
  if (g === -1) return false;
  const env = words.slice(0, g);
  // Skip git's global options (git -C dir commit, git -c k=v push) to reach the subcommand.
  let s = g + 1;
  while (words[s]?.startsWith('-'))
    s += GIT_OPTS_WITH_VALUE.has(words[s]) ? 2 : 1;
  const sub = words[s];
  const args = words.slice(s + 1);
  if (args.includes('--no-verify')) return true;
  if (
    sub === 'commit' &&
    args.some((a) => /^-[a-zA-Z]+$/.test(a) && a.includes('n'))
  )
    return true;
  const offEnv = env.some((w) => w === 'LEFTHOOK=0' || w === 'HUSKY=0');
  return offEnv && (sub === 'commit' || sub === 'push');
}

const RULES = [
  {
    id: 'no-verify',
    test: (cmds) => cmds.some(skipsHooks),
    reason:
      "Git hooks are this repo's gate: never skip them (--no-verify, commit -n, LEFTHOOK=0). " +
      'If a hook fails, fix what it reports. If it is slow, wait: commit/push hooks can take 3–4 minutes, ' +
      'and a killed push may still have landed (check `git log origin/<branch> -1` before retrying).',
  },
  {
    id: 'ci-poll-loop',
    test: (cmds) => {
      const all = cmds.flat();
      return (
        (all.includes('until') || all.includes('while')) &&
        all.includes('gh') &&
        all.includes('sleep')
      );
    },
    reason:
      'Do not hand-roll CI polling loops: the harness timeout kills them and the turn ends knowing nothing. ' +
      'Use `gh pr checks <PR> --watch` (or `gh run watch <run-id>`; in interlace, `pr-blockers watch`). ' +
      '`--watch` returning means nothing is pending, not that everything passed: check the results after.',
  },
];

export function decide(command) {
  const cmds = commands(command);
  for (const r of RULES)
    if (r.test(cmds)) return { id: r.id, reason: r.reason };
  return null;
}

export const CASES = {
  deny: [
    'git commit --no-verify -m x',
    'git push --no-verify origin x',
    'git commit -nm "x"',
    'git commit -n -m x',
    'LEFTHOOK=0 git push',
    'cd repo && git commit --no-verify',
    'git commit "--no-verify" -m x',
    'git -C . commit -n -m x',
    'LEFTHOOK=0 git -c core.x=1 push',
    'git commit \\\n  --no-verify -m x',
    'until gh pr view 5 --json state | grep MERGED; do sleep 30; done',
    'while true; do gh run list; sleep 10; done',
    'until gh workflow view ci; do sleep 5; done',
  ],
  allow: [
    'git commit -m "docs: explain why --no-verify is banned"',
    "git commit -F - <<'EOF'\nnever use --no-verify\nEOF",
    "git commit -F - <<'EOF'\nuntil gh pr checks; do sleep 1; done\nEOF\ngit push",
    'gh pr checks 12 --watch',
    'git -C . log -n 3',
    'git commit -am "x"',
    'sleep 5',
    'LEFTHOOK=0 npm ci',
    'git log -n 3',
  ],
};

function selfTest() {
  const bad = [
    ...CASES.deny.filter((c) => !decide(c)).map((c) => `should deny: ${c}`),
    ...CASES.allow.filter((c) => decide(c)).map((c) => `should allow: ${c}`),
  ];
  process.stdout.write(
    bad.length
      ? `${bad.join('\n')}\n${bad.length} failing\n`
      : `ok: ${CASES.deny.length} denied, ${CASES.allow.length} allowed\n`,
  );
  process.exit(bad.length ? 1 : 0);
}

if (process.argv.includes('--self-test')) selfTest();
else if (
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].split('/').pop())
) {
  let raw = '';
  process.stdin.on('data', (d) => (raw += d));
  process.stdin.on('end', () => {
    let cmd = '';
    try {
      cmd = JSON.parse(raw)?.tool_input?.command ?? '';
    } catch {
      process.exit(0);
    }
    const hit = decide(cmd);
    if (!hit) process.exit(0);
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: `[guard-bash:${hit.id}] ${hit.reason}`,
        },
      }),
    );
  });
}
