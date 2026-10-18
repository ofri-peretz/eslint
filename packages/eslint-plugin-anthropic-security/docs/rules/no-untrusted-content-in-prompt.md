---
title: no-untrusted-content-in-prompt
description: Disallow untrusted content built into the Anthropic system prompt
tags: ['security', 'anthropic']
category: security
severity: high
cwe: CWE-1427
autofix: false
---

# no-untrusted-content-in-prompt

> Disallow untrusted content built into the Anthropic system prompt.

- **CWE:** [CWE-1427 — Improper Neutralization of Input Used for LLM Prompting](https://cwe.mitre.org/data/definitions/1427.html)
- **OWASP:** A03:2021 — Injection · **LLM Top 10:** LLM01 Prompt Injection
- **CVSS:** 8.1 (High) · **Preset:** `strict` only

## Why

A system prompt is instruction text. Whatever is spliced into it is read by the model as _instructions_, not as data — so anyone who controls that value controls the agent's rules. The model has no way to tell "this part of my instructions came from a stranger" once the string is assembled.

This is the same argument as `mcp-sdk-security/no-tool-description-injection`, one layer down: tool descriptions and system prompts are both model-facing instruction surfaces, and both must be static.

## What it reads

`system` as a string or as an array of text blocks (the prompt-caching form, `[{ type: 'text', text, cache_control }]`), and a `role: 'system'` turn in `messages`. Request paths: `messages.create`, `messages.stream`, `messages.parse` and the beta `messages.toolRunner`, plus each `params` body of a `messages.batches.create` request list (an array literal or an `items.map(…)`).

## What counts as static

Text this file fixes is static, and is followed within the file (bounded, never across files):

- a string literal, an interpolation-free template or tagged template (`` dedent`…` ``), and concatenations, `[…].join()` and string methods over those;
- a `const` holding any of the above, a member of a same-file object literal of prompts (`PROMPTS[kind]`), a ternary between static branches, and a same-file helper whose every `return` is static;
- an imported constant (`RECOMMENDED_PROMPT_PREFIX`) and an environment read — module code and operator configuration, not request data;
- a value that can only print digits or a fixed format: a date (`new Date().toISOString()`), a count (`.length`), arithmetic, a comparison, or a parameter typed `number` / `boolean`.

**A whole-value identifier the file cannot see into still counts as static** — a parameter (`system: systemPrompt` inside a wrapper) or a global. Inside a template or a concatenation the same value is the dynamic half, and that is what gets reported, at the place it is spliced in. A request object or a message list held in a `const` is read the same way as one written inline.

## Not this rule

- **The Vercel AI SDK.** `generateText({ system })` and `streamText({ system })` belong to [`vercel-ai-security/no-dynamic-system-prompt`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security). This rule gates on Anthropic's own request paths, so no line is ever reported by both.
- **User turns.** ``{ role: 'user', content: `${input}` }`` is the _remediation_, not the bug — a user message is where runtime values belong, because the model reads them as data.

## Known limitations

- The gate is file-level: once the Anthropic SDK is imported, any call whose member path matches a request path is inspected, unless this file shows the receiver is something else (an object literal, or a `new X()` of a class that does not extend the SDK). A receiver that is a parameter, an import or a call result is inspected — clients are passed around, and resolving every one back to its construction would take cross-file analysis.

## Incorrect

```ts
await client.messages.create({
  system: `You are an assistant for ${tenantName}.`,
  messages,
});
```

## Correct

```ts
await client.messages.create({
  system: 'You are a helpful assistant.',
  messages: [{ role: 'user', content: `Tenant: ${tenantName}` }],
});
```
