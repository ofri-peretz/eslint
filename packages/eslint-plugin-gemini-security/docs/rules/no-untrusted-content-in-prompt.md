---
title: no-untrusted-content-in-prompt
description: Disallow untrusted content built into the Gemini system prompt
tags: ['security','gemini']
category: security
severity: high
cwe: CWE-1427
autofix: false
---

# no-untrusted-content-in-prompt

> Disallow untrusted content built into the Gemini system prompt.

- **CWE:** [CWE-1427 — Improper Neutralization of Input Used for LLM Prompting](https://cwe.mitre.org/data/definitions/1427.html)
- **OWASP:** A03:2021 — Injection · **LLM Top 10:** LLM01 Prompt Injection
- **CVSS:** 8.1 (High) · **Preset:** `strict` only

## Why

A system prompt is instruction text. Whatever is spliced into it is read by the model as *instructions*, not as data — so anyone who controls that value controls the agent's rules. The model has no way to tell "this part of my instructions came from a stranger" once the string is assembled.

This is the same argument as `mcp-sdk-security/no-tool-description-injection`, one layer down: tool descriptions and system prompts are both model-facing instruction surfaces, and both must be static.

## What counts as static

A string literal, a template with no interpolations, or a concatenation of those. **A bare identifier also counts** — `systemInstruction: SYSTEM_PROMPT` is the correct pattern and by far the most common one, and following it is the data-flow analysis this rule deliberately avoids. The interpolation is where the injection is visible in one place, and that is what gets reported.

## Not this rule

- **The Vercel AI SDK.** `generateText({ system })` and `streamText({ system })` belong to [`vercel-ai-security/no-dynamic-system-prompt`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security). This rule gates on Gemini's own request paths, so no line is ever reported by both.
- **User turns.** `` { role: 'user', content: `${input}` } `` is the *remediation*, not the bug — a user message is where runtime values belong, because the model reads them as data.

## Known limitations

- The gate is file-level: once the Gemini SDK is imported anywhere in the file,
  any call whose member path matches a request path is inspected. An unrelated
  object that happens to expose the same path — `ai.models.generateContent` on
  something that is not a Gemini client — is a false positive. Resolving the
  callee back to the import would need the cross-scope data-flow analysis these
  rules deliberately avoid; the trade is a rule that stays fast and predictable,
  and it is why this rule ships in `strict` only until the corpus run measures
  the real rate.
- A system prompt assembled before the call (`const p = base + role;` then
  `systemInstruction: p`) is a false negative, for the same reason a bare identifier counts
  as static.

## Incorrect

```ts
await ai.models.generateContent({ systemInstruction: `Answer as ${persona}.`, contents });
```

## Correct

```ts
await ai.models.generateContent({
  systemInstruction: 'You are a helpful assistant.',
  contents: [{ role: 'user', parts: [{ text: `Persona: ${persona}` }] }],
});
```
