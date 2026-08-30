# `evals/` — Stage 4 (Test): continuous evals

A suite that runs **whenever the agent's configuration changes** — `CLAUDE.md`,
`AGENTS.md`, anything under `.agent/`, or the hooks in `lefthook.yml`.

We carry 45 agent-facing markdown files in `.agent/` plus two `CLAUDE.md`-class
documents, and until this existed there was no way to tell whether editing one of them
made the agents worse. A prompt is code with no test.

## Two layers

**Layer 1 — deterministic config checks.** No model, no key, no cost. Runs on every
PR that touches configuration: every relative link in an agent-facing document
resolves, every referenced script exists, and every document a `CLAUDE.md` points at
is really there. A broken pointer in a rule document is a rule the agent silently
cannot read.

**Layer 2 — task evals.** Real tasks with accepted outcomes, run non-interactively
against the current configuration. Needs `ANTHROPIC_API_KEY`; the suite reports
`skipped` without one rather than failing, so a fork or a PR without secrets is not
blocked.

## A case

`evals/cases/<id>.json`:

```json
{
  "id": "lock-test-discipline",
  "why": "CLAUDE.md requires a fix to ship with a check that fails on the unfixed code.",
  "prompt": "…",
  "allowedTools": "Read,Grep,Glob",
  "expect": [
    { "check": "output-contains", "value": "fails on the unfixed" }
  ]
}
```

`expect` entries are evaluated against the agent's transcript:

| check | passes when |
| :--- | :--- |
| `output-contains` | the response contains `value` (case-insensitive) |
| `output-omits` | the response does **not** contain `value` |
| `shell` | `value` run in the repo exits 0 |

## Choosing cases

Take 20–50 real tasks from recent work, each with its expected or accepted outcome.
Two rules learned from the rest of this repo:

- **Every production incident earns an eval**, written by whoever owned the incident.
  The `renamed-plugin` case below exists because a rename left dead references in
  eight config files for months.
- **A case must be able to fail.** A prompt whose answer is in the prompt tests
  nothing. Seed the tree with the wrong state and check that the agent notices.

## Running

```bash
npm run evals          # both layers; layer 2 skips without a key
npm run evals:config   # layer 1 only — fast, deterministic, no key
```

Results land in `evals/results/<date>.json` for historical comparison. A
configuration change that drops the pass rate gets reviewed before it merges, and the
team that owns the change approves it.
