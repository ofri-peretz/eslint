# Agent guide for `@interlace/eslint-formatter`

This file is read by autonomous coding agents (Claude Code, Codex, Cursor, …) to learn how to consume this package's output. Source-of-truth for human readers: [`README.md`](./README.md).

## TL;DR — which mode should an agent use?

| Agent task | Recommended mode | Why |
| :--- | :--- | :--- |
| Pipe lint into a Claude / GPT prompt for fix-suggestion | `xml` | Anthropic's [official guidance](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags) — XML tags parse with notably higher accuracy than free prose; ~15 % cheaper than `json` in our v1.2 bench. |
| Stream lint into an agent loop (one finding at a time) | `ndjson` | Self-describing JSON per line; partial output remains valid JSONL on truncation; summary line ships first so a clean run exits early. |
| Tight token budget (< 4 k tokens for the lint slice) | `compact` | Lowest cost of any mode (~90 % cheaper than `eslint-stylish`); preserves all four FP/FN attribution axes. |
| Strict programmatic parse (one-shot, full payload) | `json` | `summary` ships before `rules` so prompt-cache prefixes stay valid as the rule list churns; abbreviated keys; same fields as NDJSON. |
| Human in the loop reviewing terminal output | `human` | Color, message, CWE/CVSS prefix, AST nodeType inline. Auto-detected when stdout is a TTY. |

Override the mode with `ESLINT_FORMAT_MODE=<mode>`; the default auto-detects (`human` in TTY, `compact` in CI / pipes).

## Honoring agent-context constraints

Per [Anthropic's effective context engineering guide](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents):

> Studies on needle-in-a-haystack style benchmarking have uncovered the concept of context rot: as the number of tokens in the context window increases, the model's ability to accurately recall information from that context decreases.

The formatter handles this at three layers:

1. **Severity-first ordering** — errors before warnings, then count desc. The most attention-worthy finding always lands at index 0 of the rule list, mitigating "lost in the middle" effects.
2. **Token budget** — set `ESLINT_FORMAT_CHAR_BUDGET=N` to enforce a hard ceiling. Trims lowest-priority rules from the tail (severity-first sort means errors survive first), with an explicit `[truncated N rule(s)]` notice.
3. **Cache-friendly prefix ordering** — `json` and `ndjson` modes ship the stable `summary` block first so [prompt-cache breakpoints](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) stay valid as the per-rule list churns (up to 90 % input cost / 85 % latency reduction on cache hits).

## Output schema

Structured modes (`json`, `ndjson`) follow [`schema.json`](./schema.json). XML mode mirrors the same semantic content with tag-based delimiters; see [`src/renderers/xml.ts`](./src/renderers/xml.ts) for the emitted shape.

Per-rule fields (all modes that carry them):

| Field | Type | Source |
| :--- | :--- | :--- |
| `id` / `<rule>` | string | ESLint ruleId |
| `sev` / `<severity>` | `"error" \| "warning"` | ESLint severity (1 → warning, 2 → error) |
| `n` / `<count>` | int | Total occurrences across the run |
| `fix` / `<fixable>` | bool | At least one occurrence is autofixable |
| `sugg` / `<has_suggestions>` | bool | At least one occurrence carries an ESLint `suggestions[]` entry |
| `desc` / `<description>` | string? | `meta.docs.description` |
| `msg` / `<message>` | string? | First non-empty per-message text — the most actionable single field for fix suggestion |
| `docs` / `<docs_url>` | string? | `meta.docs.url` |
| `cwe` / `<cwe>` | `"CWE-NNN"`? | `meta.docs.cwe` (Interlace ext.) — surfaces TP-classification context |
| `cvss` / `<cvss>` | number 0–10? | `meta.docs.cvss` (Interlace ext.) |
| `locs` / `<locations>` | location[] | Up to 5 (compact/human), 25 (xml), 50 (json/ndjson) |

Per-location:
| Field | Type | Notes |
| :--- | :--- | :--- |
| `f` / `file=` | string | Relative to cwd when given |
| `l` / `line=` | int | 1-indexed |
| `c` / `column=` | int | 1-indexed |
| `t` / `node_type=` | string? | ESLint AST nodeType (cheap LLM disambiguator) |
| `sugg` / suggestions | `{desc}[]?` | Manual-fix descriptions |

## Reproducibility — what to expect

Determinism is a contract:

- **Severity-first sort** — guaranteed across all four structured modes.
- **Ruleid tie-break** — for ties on count, ruleIds sort lex-ascending. The output bytes are stable across runs regardless of file traversal order.
- **`renderJSON(sample) === renderJSON(sample)`** for any sample (verified by 100 random fuzz iterations in `fuzz.test.ts`).

If you observe non-determinism, file an issue — the formatter and its test suite enforce this.

## Verification path you can rely on

Every PR runs three contracts:

| Contract | What it catches |
| :--- | :--- |
| **Signal contract** | Every structured format scores 4 / 4 on `ruleId` / `severity` / `count` / `fixable` recoverability across 270 (shape × scale × format) cells. |
| **Latency contract** | Per-scale wall-clock ceilings: tiny ≤ 5 ms, small ≤ 10 ms, medium ≤ 25 ms, large ≤ 50 ms, extreme ≤ 250 ms. |
| **Per-cell regression check** | Every cell within +5 % tokens (or +10 tok abs) / max(+50 %, +0.5 ms) latency / signal score ≥ baseline vs the snapshotted `benchmarks/results/ilb-formatter/baseline.json`. |

Plus a **fleet CWE-rendering smoke** (`npm run audit:cwe-rendering`) that walks every Interlace plugin, picks one rule with `meta.docs.cwe` set, runs it through the formatter, and asserts the `[CWE-NNN]` prefix appears in the output.

## Performance — current numbers (v1.2)

| Mode | Cost vs `eslint-stylish` | Signal | Latency P50 mean |
| :--- | ---: | ---: | ---: |
| `interlace-compact` | **−89.5 %** | 4.0 / 4 | 0.04 ms |
| `interlace-xml` | **−96.8 %** vs stylish · **−14.5 %** vs json | 4.0 / 4 | 0.06 ms |
| `interlace-human` | −62.3 % | 4.0 / 4 | 0.08 ms |
| `interlace-json` | −62.6 % | 4.0 / 4 | 0.06 ms |
| `interlace-ndjson` | −62.3 % | 4.0 / 4 | 0.06 ms |

Refresh: `npm run ilb:formatter` (no API). Live numbers always at [`benchmarks/results/ilb-formatter/latest.json`](../../benchmarks/results/ilb-formatter/latest.json).

## Sources

- Anthropic: [Use XML tags to structure your prompts](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags)
- Anthropic: [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- Anthropic: [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- `rtk-ai`: [CLI proxy with NDJSON ESLint formatter (~90 % token reduction)](https://github.com/NotMyself/rtk-ai)
