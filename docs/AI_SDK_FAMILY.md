# AI SDK security family — architecture & build plan

> **Status:** planning · opened 2026-08-02
> **Scope:** packaging and detector architecture for per-provider LLM security plugins.
> Rule *content* lives in [`roadmaps/owasp-llm-2025-eslint-rules-roadmap.md`](./roadmaps/owasp-llm-2025-eslint-rules-roadmap.md)
> and [`roadmaps/owasp-agentic-eslint-roadmap.md`](./roadmaps/owasp-agentic-eslint-roadmap.md) — this file does not
> restate rules, it decides which package each one ships in and how the detector is shared.

## Why

`eslint-plugin-vercel-ai-security` covers the **fourth-largest** JS LLM SDK. The three
larger surfaces have no protective plugin at all.

| SDK | npm/week (2026-08-02) | Plugin | npm name |
| --- | ---: | --- | --- |
| `@modelcontextprotocol/sdk` | **52.5M** | `eslint-plugin-mcp-sdk-security` | free |
| `openai` (+ `@openai/agents` 1.5M) | 32.4M | `eslint-plugin-openai-security` | free |
| `@anthropic-ai/sdk` (+ `@anthropic-ai/claude-agent-sdk` 8.2M) | 29.3M | `eslint-plugin-anthropic-security` | free |
| `ai` (Vercel) | 19.7M | `eslint-plugin-vercel-ai-security` | **shipped** |
| `@google/genai` | 17.5M | `eslint-plugin-gemini-security` | free |

OpenAI + Anthropic alone are ~3× the surface already covered — and MCP is larger than
either of them.

## Package names (decided 2026-08-02)

**Convention (Ofri, 2026-08-02): every security plugin is `eslint-plugin-*-security`.**
No exceptions for new packages — the suffix is what tells a consumer the package is
protective rather than stylistic, and it is what makes the family scannable on npm.

Applies beyond this family. The per-driver plugins from the `no-sql-injection` correction
take it too — `eslint-plugin-orm-security`, `eslint-plugin-mysql-security`,
`eslint-plugin-sqlite-security` (all free on npm as of 2026-08-02).

> **Three published packages predate the convention:** `eslint-plugin-pg`,
> `eslint-plugin-jwt` and `eslint-plugin-secure-coding` are all security-domain without the
> suffix. Renaming a published package is a real break — npm deprecate + republish, every
> docs page and config example rewritten, and the awesome-eslint listings (live since
> 2026-08-02) point at the current names. Recorded here as a known inconsistency; renaming
> is a separate decision with a separate cost, not part of this plan.

Three of the four new names take the convention unmodified. MCP could not:

- **`eslint-plugin-mcp-security` is taken** — mattschaller, v0.2.5, last published 2026-03-14,
  **14 downloads/week**. Dormant but not abandoned; the name is not available to us and is not
  worth disputing.
- **`eslint-plugin-mcp` is taken** — v1.7.0, unrelated.

**Decision: `eslint-plugin-mcp-sdk-security`.**

- Keeps the family shape, disambiguated by the one honest word. Our detection gates on
  `@modelcontextprotocol/sdk` API shapes — `registerTool`, transports, handler signatures —
  exactly as `vercel-ai-security` gates on the Vercel AI SDK. The name claims what the rules
  actually do.
- It does **not** claim to lint the MCP protocol in the abstract. We can't inspect JSON-RPC
  wire traffic from source, and a name implying otherwise would be a claim we can't back.
- **`mcp-server-security` was rejected** — MCP *clients* carry real risk (connecting to
  untrusted servers, tool-poisoning on the consuming side). Baking `server` into the name
  would force either a second package or a name that lies once client rules land. That is the
  `no-sql-injection` mistake in a different costume: a package name that doesn't match the
  detection's true scope.
- **`modelcontextprotocol` was rejected** — breaks the family pattern, carries no `security`
  marker, and implies a general-purpose MCP plugin (style, best practices) we have no intent
  to ship.

Discovery cost of not owning `mcp-security` is handled with `keywords` (`mcp`,
`model context protocol`, `mcp security`, `mcp server`) and the awesome-list submissions,
not by contorting the package name.

> **Naming note:** "Codex" is OpenAI's coding agent, not an SDK. Its npm surface is
> `openai` + `@openai/agents`, so it folds into the OpenAI plugin — no `eslint-plugin-codex-*`.

## Scope rule (Ofri, 2026-08-02)

> "agentic-security should exist only if there are global rules. If the securities are
> dependent on how each SDK is developed, then we should have only the SDK-specific."

This is [`AGENTS.md` › Plugin Scope Rules](../AGENTS.md) applied to this family: a shared
plugin has to earn its existence with rules that fire **with no SDK installed**. Anything
gated on a provider's call shape ships in that provider's plugin. Enforced in spirit by
`npm run lint:taxonomy`; see the finding below for why this family needs its own discipline.

## Detector architecture

The 19 existing vercel-ai rules encode LLM-integration *concepts*, not Vercel concepts.
13 of them gate on the same four bare identifiers:

```js
const aiSDKFunctions = ['generateText', 'streamText', 'generateObject', 'streamObject'];
```

Per provider the concept is identical and only the sink shape changes:

| Provider | Text/chat sink | Embeddings sink |
| --- | --- | --- |
| Vercel AI | `generateText()` / `streamText()` | `embed()` / `embedMany()` |
| OpenAI | `openai.chat.completions.create()` / `openai.responses.create()` | `openai.embeddings.create()` |
| Anthropic | `client.messages.create()` / `client.messages.stream()` | — (no first-party embeddings) |
| Gemini | `ai.models.generateContent()` / `…generateContentStream()` | `ai.models.embedContent()` |

**Every sink table entry must be verified against the live SDK before it ships** — these are
from working knowledge, not from reading each SDK's current type surface. That verification
is task P1.1 below, not an assumption baked into the plan.

So: extract each detector into `@interlace/eslint-devkit` as a **sink-parameterized factory**
and instantiate it per provider — the `createSqlInjectionRule` pattern validated on
2026-08-02. One detector, four instantiations, no drift between them.

```
devkit/src/llm/create-<concept>-rule.ts   ← detection + message ids, sinks injected
  ├── vercel-ai-security/<rule>           ← sinks: generateText, streamText, …
  ├── openai-security/<rule>              ← sinks: chat.completions.create, responses.create
  ├── anthropic-security/<rule>           ← sinks: messages.create, messages.stream
  └── gemini-security/<rule>              ← sinks: models.generateContent, …
```

Note: `devkit/src/llm/` currently holds **only** `llm-context.test.ts`, which imports from
`../ast/ast-utils` — a misfiled test with no implementation beside it. That directory is the
natural home for these factories; fold the orphan test in when it lands.

### MCP does not share the prompt-sink factories

The other four plugins all mean "call a model with a prompt" and differ only in sink shape.
MCP is a **protocol**: server registration, tool/resource/prompt handlers, transports (stdio
vs streamable HTTP), capability negotiation. Its risk surface is tool poisoning, unvalidated
tool arguments reaching shell/fs sinks, resource path traversal, and missing auth on HTTP
transports — almost none of which the prompt-sink factories model.

`eslint-plugin-mcp-sdk-security` therefore reuses devkit's **AST, taint and security
utilities** but needs its own detectors. Planning it as a factory consumer would be wrong,
and pretending otherwise would produce rules that fire on nothing.

This also settles the agentic question for MCP: tool-handler rules gate on
`server.registerTool(...)` — an SDK shape — so they ship in the MCP plugin, not in a shared
agentic package.

### Dual-runtime requirement (oxlint + ESLint) — every rule, no exceptions

All 408 existing rules run on both runtimes today (`audit:portability`: oxlint 1.62+ →
408 run, 0 blocked). New plugins inherit that only if they are built for it:

- Each plugin ships `src/oxlint.ts` plus an `"./oxlint"` subpath in `package.json` exports.
  `scripts/generate-oxlint-shims.ts` emits them; `npm run oxlint:shims:check` gates drift in
  CI and `.github/workflows/oxlint-parity.yml` runs the runtime probe on every PR.
- **The only hard blocker is TypeScript parser-services**, i.e. type-aware rules. Any
  type-aware call must be guarded with `hasParserServices` or the rule becomes oxlint-blocked.
- Because the detectors live in devkit, this constraint is enforced in **one** place rather
  than five. Keep the factories AST-only; if a concept genuinely needs type information, it
  degrades gracefully rather than blocking the rule.

Verify with `npm run audit:portability` before each plugin ships — the target is
`0 blocked` on oxlint, matching the rest of the ecosystem.

## Rule classification (all 19 audited 2026-08-02)

### Sink-coupled — 13 rules, port cleanly via a factory

`no-dynamic-system-prompt` · `no-sensitive-in-prompt` · `no-unsafe-output-handling` ·
`require-abort-signal` · `require-audit-logging` · `require-error-handling` ·
`require-max-tokens` · `require-rag-content-validation` · `require-request-timeout` ·
`require-tool-schema` · `require-validated-prompt` · `require-embedding-validation`¹ ·
`require-max-steps`²

¹ Needs an embeddings API — no Anthropic instantiation.
² Agent-loop shaped — maps to `@openai/agents` and `claude-agent-sdk`, not to the base SDKs.

### Not sink-coupled — 6 rules, and this is a problem

`no-hardcoded-api-keys` · `no-system-prompt-leak` · `no-training-data-exposure` ·
`require-output-filtering` · `require-output-validation` · `require-tool-confirmation`

These detect via **name-pattern heuristics** — property names containing `apiKey`,
`systemPrompt`, path strings like `/train` or `/finetune`. They reference no Vercel
identifier at all.

> ### 🔴 Finding: 6 of 19 vercel-ai rules fire on code that never imports the Vercel AI SDK
>
> This is the mirror image of the `no-sql-injection` misplacement: there, a driver-gated
> detector was packaged as generic; here, generic heuristics are packaged under a
> provider-specific name. A consumer who installs `vercel-ai-security` for their Vercel app
> gets these firing across unrelated files, and a consumer who *doesn't* use Vercel has no
> way to get them at all.
>
> `no-hardcoded-api-keys` also already string-matches `'openai'` and `'anthropic'` — the
> family boundary is leaking before the sibling plugins exist.
>
> **These 6 are the candidate "global rules"** under Ofri's criterion. They genuinely fire
> with no SDK installed. The open question is not *whether* they're global but *where global
> belongs*: a new shared plugin, or `secure-coding` (for `no-hardcoded-api-keys`, which is a
> secrets rule, not an LLM rule). Decide before building — see Open questions.

### Provider-unique rules (each plugin's real justification)

A plugin that is only a re-instantiation of shared factories is a repackaging exercise.
These are the rules that make each one independently protective:

- **Gemini** — `safetySettings: BLOCK_NONE` disables content filtering outright. No equivalent
  in any other SDK; strongest single provider-unique rule in the family.
- **Anthropic** — prompt-caching (`cache_control`) leaking sensitive context across turns;
  `betas` / beta-header opt-ins that change safety behaviour; `claude-agent-sdk` tool
  permission and sandbox settings.
- **OpenAI** — Assistants/file-search data exposure; `store: true` retention on Responses API;
  `@openai/agents` handoff and guardrail configuration.

## Phases

- [ ] **P1.1** Verify every sink in the table above against each SDK's current type surface.
- [ ] **P1.2** Decide the 6 global rules' home (see Open questions) — blocks P3.
- [ ] **P2.1** Extract the 13 sink-coupled detectors into `devkit/src/llm/` factories.
- [ ] **P2.2** Refactor `vercel-ai-security` onto the factories. **Its existing test suite must
      pass untouched** — that is the no-regression proof, same as the 28 pg tests were for
      `createSqlInjectionRule`.
- [ ] **P3.1** `eslint-plugin-openai-security` — factories + provider-unique rules.
- [ ] **P3.2** `eslint-plugin-anthropic-security` — factories + provider-unique rules.
- [ ] **P3.3** `eslint-plugin-gemini-security` — factories + provider-unique rules.
- [ ] **P3.4** `eslint-plugin-mcp-sdk-security` — own detectors (not factory consumers).
      Read the prior art first: `eslint-plugin-mcp-security@0.2.5` is the only existing MCP
      linter and its rule list is free competitive intelligence. Sequencing is open — MCP is
      the largest surface and its competitor is dormant, but it shares the least with P2, so
      building it first delays the factory payoff.
- [ ] **P4** Per-plugin: README brand header, docs site pages, **`src/oxlint.ts` + `./oxlint`
      export**, shim snapshot regeneration, `audit:portability` at 0 oxlint blockers,
      CWE/OWASP mapping, changesets, `interlace-numbers.json` regeneration.
- [ ] **P5** Update `AGENTS.md` scope table — it currently lists `eslint-plugin-openai-security`
      and `eslint-plugin-agentic-security` as though they exist. Either ship them or cut the rows.

## Open questions

1. **Where do the 6 global rules live?** Options: (a) a new shared plugin — but then it needs a
   name and a scope promise that isn't "leftovers"; (b) split them — `no-hardcoded-api-keys` to
   `secure-coding` as a secrets rule, the LLM-shaped remainder to a shared LLM plugin;
   (c) duplicate into each provider plugin — rejected, that is the double-report failure mode.
2. **Do the heuristics survive scrutiny?** They were written inside a provider plugin where the
   blast radius felt bounded. Promoted to global, their false-positive rate needs measuring
   against the benchmark corpus before they ship anywhere.
3. **`eslint-plugin-mcp-security` is taken** (v0.2.5, third party). If MCP rules are wanted, the
   name has to change or the rules fold into the per-provider agent plugins.
