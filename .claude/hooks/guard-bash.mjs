#!/usr/bin/env node
// guard-bash — Claude Code PreToolUse hook for Bash. One copy per Interlace repo,
// byte-identical; the canonical source is agents/interlace/package-baseline/claude-hooks/.
//
// It replaces prose that every CLAUDE.md used to repeat. A rule an agent can break
// with one command is a check, not a sentence: the denial below is the documentation.
//
//   1. Skipping git hooks (--no-verify, `git commit -n`, LEFTHOOK=0/HUSKY=0) — the hooks are the gate.
//   2. Hand-rolled CI polling (`until/while … gh pr|run … sleep`) — the harness kills those
//      loops and the turn ends knowing nothing. `gh pr checks <PR> --watch` blocks correctly.
//
// Reads the PreToolUse payload on stdin. Prints a deny decision, or nothing (no opinion).
// `node guard-bash.mjs --self-test` runs the cases at the bottom.

const RULES = [
  {
    id: 'no-verify',
    test: (c) =>
      /\bgit\b[^;&|\n]*\s--no-verify\b/.test(c) ||
      /\bgit\s+commit\b[^;&|\n]*\s-[a-zA-Z]*n[a-zA-Z]*(\s|$)/.test(c) ||
      /\b(LEFTHOOK|HUSKY)=0\b[^;&|\n]*\bgit\s+(commit|push)\b/.test(c),
    reason:
      "Git hooks are this repo's gate: never skip them (--no-verify, commit -n, LEFTHOOK=0). " +
      'If a hook fails, fix what it reports. If it is slow, wait: commit/push hooks can take 3–4 minutes, ' +
      'and a killed push may still have landed (check `git log origin/<branch> -1` before retrying).',
  },
  {
    id: 'ci-poll-loop',
    test: (c) =>
      /\b(until|while)\b/.test(c) &&
      /\bgh\s+(pr|run|api)\b/.test(c) &&
      /\bsleep\b/.test(c),
    reason:
      'Do not hand-roll CI polling loops: the harness timeout kills them and the turn ends knowing nothing. ' +
      'Use `gh pr checks <PR> --watch` (or `gh run watch <run-id>`; in interlace, `pr-blockers watch`). ' +
      '`--watch` returning means nothing is pending, not that everything passed: check the results after.',
  },
];

// Quoted strings and heredoc bodies are data (commit messages, PR bodies), not flags.
export function stripData(cmd) {
  return cmd
    .replace(/<<-?\s*(['"]?)(\w+)\1[\s\S]*?\n\s*\2\s*(\n|$)/g, ' ')
    .replace(/'[^']*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""');
}

export function decide(command) {
  const c = stripData(command ?? '');
  for (const r of RULES) if (r.test(c)) return { id: r.id, reason: r.reason };
  return null;
}

function selfTest() {
  const deny = [
    'git commit --no-verify -m x',
    'git push --no-verify origin x',
    'git commit -nm "x"',
    'git commit -n -m x',
    'LEFTHOOK=0 git push',
    'until gh pr view 5 --json state | grep MERGED; do sleep 30; done',
    'while true; do gh run list; sleep 10; done',
  ];
  const allow = [
    'git commit -m "docs: explain why --no-verify is banned"',
    "git commit -F - <<'EOF'\nnever use --no-verify\nEOF",
    'gh pr checks 12 --watch',
    'git commit -am "x"',
    'sleep 5',
    'LEFTHOOK=0 npm ci',
    'git log -n 3',
  ];
  let bad = 0;
  for (const c of deny)
    if (!decide(c)) {
      bad++;
      console.error('should deny:', c);
    }
  for (const c of allow)
    if (decide(c)) {
      bad++;
      console.error('should allow:', c);
    }
  console.log(
    bad
      ? `${bad} failing`
      : `ok: ${deny.length} denied, ${allow.length} allowed`,
  );
  process.exit(bad ? 1 : 0);
}

if (process.argv.includes('--self-test')) selfTest();
else {
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
