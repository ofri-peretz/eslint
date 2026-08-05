---
'@interlace/eslint-devkit': minor
'eslint-plugin-openai-security': minor
'eslint-plugin-gemini-security': minor
'eslint-plugin-anthropic-security': patch
---

`no-hardcoded-api-key` now covers all three raw inference SDKs.

The rule shipped on `eslint-plugin-anthropic-security` only. Its detection moved
into a shared `createSdkApiKeyRule` factory in `@interlace/eslint-devkit` and is
now instantiated for OpenAI and Gemini as well, at the same severity in every
preset — one rule with three module gates rather than three separate ones that
could drift.

Gemini adds a shape the other two do not have: the legacy
`new GoogleGenerativeAI(apiKey)` client takes the key as a **positional**
argument, with no options object to inspect. Both that and the current
`new GoogleGenAI({ apiKey })` form are checked.

Module matching is exact-or-subpath, not a prefix: `openai` opens the gate for
`openai` and `openai/resources`, and deliberately not for `openai-edge`, which
is a different package with a different client.

Anthropic's behaviour and its reported messages are unchanged; only the
implementation moved.
