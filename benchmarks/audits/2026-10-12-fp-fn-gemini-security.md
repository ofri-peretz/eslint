# FP/FN audit: eslint-plugin-gemini-security (2026-10-12)

The audit ran against the published 0.3.5, which matched `main`. It found 2 false-positive classes and 4 false-negative classes across the 3 rules, and all of them are fixed. The real-code scan now shows no finding, which is the correct result for these repositories: no file disables a safety filter, hardcodes a working key, or builds a system instruction from runtime input.

**Where the fixes live.**

- `no-hardcoded-api-key` and `no-untrusted-content-in-prompt` are devkit factory instantiations. They were fixed in `packages/eslint-devkit/src/rule-creation/` (`sdk-flow.ts`, `sdk-api-key-rule.ts`, `system-prompt-injection-rule.ts`) together with this plugin's configs. **The devkit needs a release alongside the 1.0.0.**
- `no-disabled-safety-settings` is local to the plugin.

**Design constraint.** Verdicts come from AST structure and bounded same-file following. The SDK enum is resolved through its import. `threshold`, `category` and `safetySettings` are matched as the SDK's request-schema keys, never as variable names. The rename litmus is covered by `FN: a renamed import is still the positional constructor` and the namespaced `genai.HarmBlockThreshold` case.

## Method

- **Synthetic.** Snippets cover:
  - `@google/genai`: `models.generateContent` / `generateContentStream` with `config.systemInstruction`, `chats.create`, `caches.create` and `live.connect`;
  - `@google/generative-ai`: `getGenerativeModel` / `startChat` with `systemInstruction`, the server `GoogleAIFileManager` / `GoogleAICacheManager`, and positional keys;
  - safety settings written as enums, as strings, through consts and in mapped lists;
  - unrelated `threshold` objects in the same file.
- **Real code.** Every file that imports `@google/genai` or `@google/generative-ai`.

| Repository                                           | Files   |
| ---------------------------------------------------- | ------- |
| googleapis/js-genai                                  | 104     |
| google-gemini/live-api-web-console                   | 7       |
| google-gemini/cookbook                               | 5       |
| google-gemini/gemini-image-editing-nextjs-quickstart | 1       |
| **Total**                                            | **117** |

## Real-code findings per rule

| Rule                           | Published 0.3.5 | Verdict                                                                                                                                                                                                                                                                           | After the fix | Verdict                                   |
| ------------------------------ | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ----------------------------------------- |
| no-hardcoded-api-key           | 1               | FP: `apiKey: 'fake-api-key'` (js-genai google_samples/angular/generate_content/generate_content.ts:34)                                                                                                                                                                            | 0             | —                                         |
| no-disabled-safety-settings    | 0               | — (every sample uses `BLOCK_LOW_AND_ABOVE` / `BLOCK_ONLY_HIGH`)                                                                                                                                                                                                                   | 0             | —                                         |
| no-untrusted-content-in-prompt | 0               | Every `systemInstruction` in these repos is static. Before the fix, the rule did not read `config.systemInstruction`, the form every js-genai sample uses (sdk-samples/generate_content_with_system_instructions.ts:19 and others), so its silence there measured nothing (FN-1). | 0             | Now read, and static (a correct negative) |

## Findings

| Finding                                                                                                                                                                              | FP/FN | Status | Test name                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FP-1: a placeholder key reported as a committed credential                                                                                                                           | FP    | fixed  | `FP: the SDK sample placeholder`, `FP: YOUR_API_KEY and test-api-key`                                                                                                                    |
| FN-1: `systemInstruction` under `config` (the `@google/genai` shape) was never read                                                                                                  | FN    | fixed  | `FN: systemInstruction under config (the current SDK)`, `FN: the config object held in a const`, `FN: a per-message config on a chat`                                                    |
| FN-2: the instruction set at model or session creation was not checked: `getGenerativeModel`, `startChat`, `chats.create`, `caches.create`, `live.connect`                           | FN    | fixed  | `FN: a chat, a cached context and a Live session`, `FN: the legacy SDK sets it on getGenerativeModel and startChat`                                                                      |
| FN-3: the positional key on `GoogleAIFileManager` / `GoogleAICacheManager`, a key in a const, and a renamed import (the check compared the local identifier to `GoogleGenerativeAI`) | FN    | fixed  | `FN: the server-side file and cache managers take the key positionally`, `FN: the key held in a const, positional and named`, `FN: a renamed import is still the positional constructor` |
| FP-2: any `threshold: 'OFF'` / `X.OFF` in a Gemini file reported (a circuit breaker, a lint config, a logger enum)                                                                   | FP    | fixed  | `FP: a circuit breaker, a lint config and a logger in a Gemini file`                                                                                                                     |
| FN-4: a disabling constant held in a const                                                                                                                                           | FN    | fixed  | `FN: the disabling constant held in a const`                                                                                                                                             |

**Test-first.** I ran the new test files against a `git archive HEAD` copy of the sources. 12 of the 13 `FP:`/`FN:` cases failed there. The case `a date in the system instruction` passed on `HEAD`, because the old rule did not read `config` at all. It is renamed `guard: …`.

**Existing tests moved** (each with a comment in the test file):

- 4 key-rule invalid cases used `'AIzaAAAA'`, a stand-in. They moved to valid, and each mechanism is re-pinned with a key-shaped value.
- 5 safety-rule invalid cases had a bare `{ threshold }` with no SafetySetting shape, or an unbound `HarmBlockThreshold`. They moved to valid, and each mechanism is re-pinned with a `category` beside it, a `safetySettings` list around it, or the enum resolved from its import.
- The safety test now uses the TypeScript parser, so a user `enum` can be a case.

## Quint oracle (2026-10-12 follow-up)

`gemini-security.no-hardcoded-api-key` (incl. the positional constructor), `.no-untrusted-content-in-prompt`, `.no-disabled-safety-settings` (value × shape × import style) — 622 cases sampled, every combination of the model's dimensions. Run with `node benchmarks/quint/generate.mjs gemini-security` and `npx vitest run --root benchmarks __tests__/quint-oracle.lock.test.ts`.

| Finding                                                                                                       | FP/FN | Status | Test name                                                             |
| ------------------------------------------------------------------------------------------------------------- | ----- | ------ | --------------------------------------------------------------------- |
| Q-1: a key-shaped literal as the environment fallback was not reported, positional and named — 16 model cases | FN    | fixed  | `FN: a literal key as the environment fallback, positional and named` |

## Deferred

None.

## Gates

Run in `packages/eslint-plugin-gemini-security`:

- `npx vitest run --coverage`: green, 100/100/100/100.
- `npm run typecheck`: clean.
- `npm run build`: clean.

Root gates for all four plugins are listed in `2026-10-12-fp-fn-openai-security.md`.
