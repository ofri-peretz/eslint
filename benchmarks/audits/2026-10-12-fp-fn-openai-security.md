# FP/FN audit: eslint-plugin-openai-security (2026-10-12)

The audit ran against the published 0.3.4, which matched `main`. It found 4 false-positive classes and 5 false-negative classes across the 3 rules. All are fixed, and the real-code scan now shows only true positives.

**Where the fixes live.** As for Anthropic and Gemini, the rule logic is in the shared devkit factories (`packages/eslint-devkit/src/rule-creation/`: the new `sdk-flow.ts`, plus `sdk-api-key-rule.ts`, `browser-escape-hatch-rule.ts`, `system-prompt-injection-rule.ts` and `module-evidence.ts`), together with this plugin's rule configs. **The devkit needs a release alongside the 1.0.0.**

**Design constraint.** Verdicts come from AST structure, scope resolution, and bounded same-file value following. SDK identity is resolved through the import, and no verdict uses a local name. Literal values are judged by their shape. The rename-litmus cases are `rename litmus: renamed import, key and options` and `rename litmus: renamed import and options`.

## Method

- **Synthetic.** Snippet files cover:
  - `openai` v4–v6: `chat.completions.create/parse/stream/runTools`, the Responses API, the `developer` role, content parts, the Azure client and Bedrock providers;
  - the Realtime WebSocket client, `withOptions` and subclasses;
  - the Agents SDK (`Agent`, `OpenAIProvider`, `setDefaultOpenAIKey`);
  - options held in variables.
- **Real code.** Every file that imports `openai` or `@openai/*`.

| Repository                            | Files    |
| ------------------------------------- | -------- |
| openai/openai-node                    | 458      |
| openai/openai-agents-js               | 546      |
| openai/openai-realtime-agents         | 13       |
| supabase/supabase                     | 19       |
| supabase-community/chatgpt-your-files | 1        |
| **Total**                             | **1037** |

`vercel/ai-chatbot` and `openai/openai-realtime-console` were also cloned. Neither has a file that imports `openai`.

## Real-code findings per rule

| Rule                           | Published 0.3.4 | Verdict                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | After the fix | Verdict                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------ | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| no-hardcoded-api-key           | 601             | **All FP.** Stand-ins: `'My API Key'` (tests/realtime.test.ts:11, 204×), `'test-key'`, `'synthetic-*'`, `'ollama'` (agents-js examples/basic/hello-world-gpt-oss.ts:21), `'...'` (examples/docs/config/setDefaultOpenAIClient.ts:4), `'something1234'`, `'bedrock-token'`.                                                                                                                                                                                                                                  | 1             | TP: openai-node tests/lib/webhooks.test.ts:57. A `whsec_` signing secret is held in a const. The published rule did not check `webhookSecret` (FN-2). The value is the Standard Webhooks spec's published test vector, and nothing in the code tells that apart from a live secret.                                                                                                                                                                                                                                                                                                   |
| no-browser-api-key-exposure    | 13              | 10 TP: Vite-inlined key in the browser (agents-js integration-tests/vite-react/src/App.tsx:13); jsdom and browser ecosystem tests with a literal, env or injected key (ecosystem-tests/*/tests/import.test.ts, test-jsdom.ts, ts-browser-webpack/src/index.ts:101, :105; tests/internal/detect-platform.test.ts:218). 3 FP: tests/realtime-websocket.test.ts:384, :410, :426 report a test helper `createAzureClient({ tokenProvider, dangerouslyAllowBrowser })`, which is not an SDK construction (FP-2). | 10            | TP (same 10)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| no-untrusted-content-in-prompt | 1               | FP: supabase packages/ai-commands/test/extensions.ts:17. A system turn written as `` codeBlock`…` `` with no interpolation (FP-4).                                                                                                                                                                                                                                                                                                                                                                          | 5             | TP: supabase packages/ai-commands/src/sql/cron.ts:12 puts the user's prompt in a system turn held in a const array (FN-5). supabase apps/ui-library/.../platform-kit-nextjs/app/api/ai/sql/route.ts:90 puts a runtime DB schema into a const `instructions`; a column comment is an injection vector (FN-5). agents-js examples/memory/hitl-session-scenario.ts:71, packages/agents-openai/test/hitlOpenAIConversationsSession.test.ts:185 and integration-tests/node-sdk-behavior/test/capabilities/guardrails.test.mjs:109 build Agents SDK `instructions` from a parameter (FN-6). |

Adding Agents SDK coverage first surfaced 8 more findings. They interpolated `RECOMMENDED_PROMPT_PREFIX`, an import (examples/customer-service/index.ts:76, :92; examples/docs/handoffs/recommendedPrompt.ts:6; examples/realtime-twilio-sip/agents.ts:61, :70, :79), or a path that `mkdtemp` generates (examples/tools/apply-patch.ts:129). Those were fixed before release and are locked as `guard:` cases.

## Findings

| Finding                                                                                                                                                                                                           | FP/FN | Status | Test name                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FP-1: a placeholder key reported as a committed credential                                                                                                                                                        | FP    | fixed  | `FP: the SDK test-suite placeholder`, `FP: a local model server ignores the key`, `FP: an elided docs placeholder`, `FP: synthetic, fake and test stand-ins`, `FP: an Azure client with a stand-in key`                                                                                                                                                                        |
| FP-2: any call with an `apiKey` / flag object reported as the OpenAI client: another vendor's client, the Vercel AI provider, an unbound `OpenAI`, a test helper                                                  | FP    | fixed  | `FP: another vendor's client`, `FP: the Vercel AI provider factory belongs to vercel-ai-security`, `(was invalid) an unbound OpenAI beside an Agents SDK import`, `(was invalid) an unbound factory call`                                                                                                                                                                      |
| FN-1: a key or the options held in a const or a same-file spread                                                                                                                                                  | FN    | fixed  | `FN: the key held in a const`, `FN: the options object held in a const, and spread`, `FN: the options object held in a const` (browser)                                                                                                                                                                                                                                        |
| FN-2: `adminAPIKey`, `webhookSecret`, `new OpenAIProvider({ apiKey })` and `setDefaultOpenAIKey('…')` not checked                                                                                                 | FN    | fixed  | `FN: an admin key`, `a webhook signing secret`, `FN: the Agents SDK provider and its process-wide default key`                                                                                                                                                                                                                                                                 |
| FP-3: the browser flag reported for a per-session credential: an Azure token provider, a key-provider function, an ephemeral Realtime client secret, bring-your-own-key, and an Anthropic client in the same file | FP    | fixed  | `FP: an Azure client with an Entra token provider`, `FP: a key provider function`, `FP: an ephemeral Realtime client secret fetched from the server`, `FP: bring-your-own-key held in component state`, `FP: an Anthropic client in the same file is not this plugin`                                                                                                          |
| FP-4: an interpolation-free tagged template (`codeBlock`) and operator config (`process.env`) reported as dynamic instructions                                                                                    | FP    | fixed  | `FP: an interpolation-free tagged template (codeBlock)`, `FP: an operator-configured bot name from the environment`                                                                                                                                                                                                                                                            |
| FN-5: a system/developer prompt built in a const or held in a const message list                                                                                                                                  | FN    | fixed  | `FN: the user prompt in a system turn held in a const array`, `FN: a runtime database schema spliced into Responses instructions`                                                                                                                                                                                                                                              |
| FN-6: the `developer` role, the Responses API `input` list, the Agents SDK `Agent` instructions, the Assistants API, and the `stream` / `parse` / `runTools` request paths                                        | FN    | fixed  | `FN: the developer role is the system role for reasoning models`, `FN: a developer turn in the Responses API input list`, `FN: an Agents SDK agent built with interpolated instructions`, `FN: a dynamic Agents SDK instructions function`, `FN: an Assistants run overriding its instructions (thread id first)`, `FN: chat.completions.stream, responses.parse and runTools` |

**Test-first.** I ran the new test files against a `git archive HEAD` copy of the sources. 27 of the 34 `FP:`/`FN:` cases failed there. The other 7 passed on `HEAD`, because the old rule either caught them by accident (Bedrock factory, `withOptions`/`super()`, Realtime client, a content-part array reported whole) or never looked at the shape at all (an Agents SDK constant, an `mkdtemp` path, a date in a developer turn). They are renamed `guard: …`.

**Existing tests moved** (each with a comment in the test file):

- 6 key-rule invalid cases used stand-ins (`'sk-proj-AAAA'`, `'sk-1'`, `'sk-2'`) or the unbound `createClient`. They moved to valid, and each mechanism is re-pinned with a key-shaped value.
- 3 browser-rule invalid cases constructed an `OpenAI` or `createOpenAI` that nothing imported. They moved to valid, and their gate cases are re-pinned with a bound client.
- The module-gate lock's load-form sweep now probes with the prompt rule. See the Anthropic note for why.

## Quint oracle (2026-10-12 follow-up)

`openai-security.no-hardcoded-api-key`, `.no-browser-api-key-exposure`, `.no-untrusted-content-in-prompt` (slots: instructions, system / developer turns, Responses `input`, Agents SDK) — 890 cases sampled, every combination of the model's dimensions. Run with `node benchmarks/quint/generate.mjs openai-security` and `npx vitest run --root benchmarks __tests__/quint-oracle.lock.test.ts`.

| Finding                                                                                 | FP/FN | Status | Test name                                                                 |
| --------------------------------------------------------------------------------------- | ----- | ------ | ------------------------------------------------------------------------- |
| Q-1: a key-shaped literal as the environment fallback was not reported — 16 model cases | FN    | fixed  | `FN: a literal key as the environment fallback is committed all the same` |

## Deferred

None.

## Gates (all four plugins: anthropic, openai, gemini, supabase)

Per package, for each of the four:

- `npx vitest run --coverage`: green, at the 100/100/100/100 threshold.
- `npm run typecheck`: clean.
- `npm run build`: clean.

Devkit: `npm run typecheck` and `npm run build` are clean. The changed devkit files (`sdk-flow.ts`, `sdk-api-key-rule.ts`, `browser-escape-hatch-rule.ts`, `system-prompt-injection-rule.ts`, `module-evidence.ts`) are at 100% line, branch and function coverage in the devkit suite. The devkit-wide coverage figure is below 100% on files outside this change.

From the repo root:

- lint:taxonomy, lint:name-inference, lint:detection-list-coverage, check:spellings, check:key-vocabulary, check:case-registry, lint:triage-sampling, rule-audit:gate, check:rule-cases, check:computed-keys, check:name-vocabulary: pass.
- `check:corpus-coverage`, `recall-gate`, `lint:severity-consistency`: pass.
- `scripts/__tests__/documented-options-exist` and `credential-fixture-shape`: pass.
- `vitest --root benchmarks`: pass.

Gate-driven edits outside the plugins:

- `.agent/computed-key-baseline.json`: 4 of these rules no longer go silent on `o['k']`, so they were removed (the file is shrink-only).
- `benchmarks/cases/registry.json`:
  - ILB-0146 is retired with a reason, because its code is fail-closed (see the Supabase note).
  - ILB-0165 (defect) and ILB-0166 (false-positive, expect silent) were added.
  - The baseline was updated with `--update`.
- Corpus fixtures:
  - `by-rule/{anthropic,openai}-security/*/vulnerable/case-01.js` and `by-rule/gemini-security/no-disabled-safety-settings/vulnerable/case-01.js` were re-derived from the key-shaped / SafetySetting-shaped cases.
  - `CWE-287` (Supabase) was revised; see the Supabase note.
