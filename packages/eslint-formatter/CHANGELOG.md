# Changelog

All notable changes to `@interlace/eslint-formatter` will be documented here.

## [Unreleased]

### Added

- **`ndjson` output mode** (`ESLINT_FORMAT_MODE=ndjson`) — newline-delimited JSON for streaming agent loops. Summary line ships first; one self-describing JSON per rule line; partial outputs remain valid JSONL.
- **Char-budget knob** (`ESLINT_FORMAT_CHAR_BUDGET=N`) — hard ceiling on output size. Trims rules from the tail (lowest-priority via severity-first sort) until the render fits, with an explicit `[truncated N rule(s)]` notice.
- **Per-message text** captured + rendered in all four modes (`message` / `msg`). The most actionable single field for an LLM-fix consumer; previously dropped.
- **CWE / CVSS surfaces** when rule meta declares `meta.docs.cwe` / `meta.docs.cvss`. Rendered inline in human mode (`[CWE-089 · CVSS 9.8]` cyan), compact mode (`[CWE-089]` prefix), and as `cwe` / `cvss` keys in JSON / NDJSON.
- **`nodeType` preservation** — AST node type from ESLint per location, exposed as `t` in JSON / NDJSON and as a gray inline annotation in human mode.
- **`suggestions[]` round-trip** — ESLint manual-fix suggestions surface as `(has suggestions)` in compact / human and as `sugg` boolean + per-location `sugg[]` array in JSON / NDJSON.
- **ANSI color in human mode** — auto-disabled when `!process.stdout.isTTY` or `NO_COLOR` is set; honors `FORCE_COLOR`.
- **Mode-aware `MAX_LOCATIONS` cap** — `compact` / `human` cap at 5 (token-budget-sensitive), `json` / `ndjson` at 50 (downstream tooling can want the full set).

### Changed

- **Rules now sort severity-first** (errors before warnings, then count desc, then ruleId asc). Previously: count desc only. This prevents a rare critical error from being buried under thousands of low-severity warnings — the "lost in the middle" effect makes top-of-list dramatically more visible to LLMs.
- **JSON: `summary` ships before `rules`**. Cache breakpoints in Anthropic / OpenAI prompt caching match by prefix, so the stable summary at the front survives even when the per-rule list churns ([Anthropic guide](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)).
- **`groupByRule(results, context, mode?)`** — third positional argument added (optional, defaults to `MAX_LOCATIONS = 5`). Callers that pass two arguments are unaffected.
- **Tie-break by `ruleId.localeCompare()`** — the grouper's output bytes are now hash-stable across runs regardless of file traversal order.
- **Windows-safe relative paths** — uses `path.relative()` instead of string concatenation; falls back to absolute path for files outside `cwd`.
- **Human mode: render the per-message text instead of the rule description** when both are present (more specific = more actionable). Falls back to description when no per-message text exists.

### Performance

Latest ILB-Formatter v1.1 numbers (240-cell suite, 6 shapes × 5 scales × 8 formats):

- `compact`: **−89.5 %** tokens vs `eslint-stylish`, P50 ~ 0.04 ms (~25 × faster than stylish)
- `ndjson`: **−66.7 %** tokens, P50 ~ 0.06 ms
- `json`: **−67.9 %** tokens, P50 ~ 0.06 ms
- `human`: **−62.3 %** tokens, P50 ~ 0.08 ms (paid for ANSI + message + CWE/CVSS — fair trade)

All four modes score 4 / 4 on the FP/FN-attribution signal contract on every fixture in the suite.

## [0.1.0] — 2026-05-03

### Added

- Initial release
- Three output modes: `human`, `compact`, `json`
- Auto-mode detection (TTY → human, CI/pipe → compact)
- `ESLINT_FORMAT_MODE` environment variable override
- Rule grouping with deduplication and representative locations
- Summary statistics (errors, warnings, files, fixable count)
- Support for ESLint 8 and 9
