---
'eslint-plugin-vercel-ai-security': minor
---

fix(vercel-ai-security): fix 26 FPs and 13 FNs, apply documented option defaults, quieter recommended preset

**`recommended` preset changes (you will see fewer errors):**

- `require-max-steps`: `error` → `off`. The rule now reports only unbounded step settings (a `hasToolCall`-only `stopWhen`, `maxSteps: Infinity`, or a limit read from the request). A tool call with no step option is no longer reported, because the SDK defaults to a single step.
- `require-abort-signal`: `error` → `off` (CVSS 4; fired on the AI SDK quickstart route).
- `require-request-timeout`: `warn` → `off` (duplicated `require-abort-signal`).
- `no-training-data-exposure`: `warn` → `off` (name and URL heuristics with no link to any provider setting).
- `require-output-filtering`: `warn` → `off`.
- `require-max-tokens`: `error` → `warn` (CVSS 6.5).
- `require-tool-schema` and `require-tool-confirmation` stay at `error`, now aligned with their CVSS of 7.0 or higher. Every preset level now follows the rule's own CVSS: `error` at 7.0 and above, `warn` below.

The AI SDK v5 quickstart route now produces 0 errors under `recommended`. A lock test enforces this.

**Behaviour changes:**

- All rules: the documented `defaultOptions` now apply. Previously 18 rules read `context.options` and silently ran a shorter hard-coded list instead. SDK calls are matched by exact name, so `generateTextureAtlas` is no longer treated as `generateText`. Name patterns match whole words, so `businessName` no longer counts as `ssn`. A spread in the options may carry a required setting, so it counts as satisfying it.
- `no-unsafe-output-handling`:
  - The parameters of a tool's `execute` count as model output.
  - Sinks are resolved by callee: `child_process`, `vm`, `eval`, `new Function`, SQL `.query`/`.unsafe`.
  - New sinks: `dangerouslySetInnerHTML`, and `fetch` with a model-chosen URL (new message `unsafeOutputInRequest`, CWE-918).
  - `RegExp#exec` and sanitized HTML are no longer reported.
- `no-dynamic-system-prompt`:
  - New message `userControlledSystemPrompt` for a system prompt read straight from the request.
  - System prompts built only from constants or the current date are no longer reported.
- `require-validated-prompt`:
  - User input is now recognised by its shape: read from the request body or query string.
  - Name patterns match a name's head noun, so `inputTokens` is no longer reported.
  - Schema-parsed values count as validated.
- `no-hardcoded-api-keys`: provider-shaped keys are reported wherever they appear, including module constants and headers. Secret names, URLs, resource paths and env-var names are no longer reported.
- `require-tool-confirmation`:
  - Tools defined with `tool({...})` are now checked.
  - `needsApproval` / `toolApproval`, or a tool without `execute`, counts as confirmation.
  - `create`, `post`, `change` and `run` were removed from the default patterns.
- `no-sensitive-in-prompt`: the rule now searches `messages` arrays.
- `no-system-prompt-leak`: server-side option builders (an object with `model`) are no longer reported. `system` keys in response payloads are reported, including in nested and `JSON.stringify` payloads.
- `require-output-filtering`:
  - A data source is now a member call on a data-access chain.
  - Block-bodied `execute`s are checked.
  - `get`, `fetch`, `read` and `load` were removed from the defaults.
- `no-training-data-exposure`: URLs are matched by whole path segment, and `feedback`, `improve` and `learn` were removed from the defaults.
- `require-error-handling`: `onError` satisfies the rule for `streamText`/`streamObject`.
- `require-audit-logging`: enabled telemetry counts as logging.
- `require-output-validation`: `.message` and `.response` are no longer treated as AI output.

Full audit: `benchmarks/audits/2026-10-10-fp-fn-vercel-ai-security.md`.
