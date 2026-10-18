---
title: no-hardcoded-api-key
description: Forbid a literal API key in the OpenAI client options
tags: ['security', 'openai']
category: security
severity: critical
cwe: CWE-798
autofix: false
---

# no-hardcoded-api-key

> Forbid a literal API key in the OpenAI client options.

- **CWE:** [CWE-798 — Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)
- **OWASP:** A07:2021 — Identification and Authentication Failures
- **CVSS:** 9.1 (Critical) · **Recommended:** `error`

## Why

A key written into source is committed, pushed, mirrored into every clone and CI cache, and is billable by anyone who reads it. Because rotating it means a code change, leaked keys tend to stay live far longer than they should.

The rule is gated on the OpenAI SDK (`openai` and the `@openai/` scope, where the Agents SDK lives) being imported, so it stays silent in files that do not construct the client. `openai-edge` is a different package with a different client and does not open the gate. It covers `apiKey`, `adminAPIKey` and `webhookSecret`, the Agents SDK's `new OpenAIProvider({ apiKey })`, and its process-wide `setDefaultOpenAIKey('…')`. A spread whose source this file cannot see makes the options unreadable rather than guessed at.

## What counts as a hardcoded key

- **Only the SDK's own client.** The callee must resolve, through its import or `require()`, to the SDK — a constructor, a factory the SDK exports, `client.withOptions(...)`, a same-file subclass (`super(...)` included), or a same-file wrapper that passes its options parameter straight into the client. `new Pinecone({ apiKey })` in the same file, a test matcher such as `expect.objectContaining({ apiKey })`, and the Vercel AI SDK's provider factories (owned by `vercel-ai-security`) are not this rule's.
- **Key-shaped values only.** A credential is a generated token: at least 20 characters, no whitespace, letters and digits mixed. Stand-ins the SDKs' own tests and docs use — `'My API Key'`, `'test-key'`, `'...'`, `'ollama'`, `'<YOUR_API_KEY>'`, `'sk-xxxxxxxx…'` — are not reported.
- **Followed within the file.** A key written as an environment fallback (`process.env.KEY ?? 'sk-…'`, `|| 'sk-…'`, or a ternary branch) is committed exactly like a bare one and is reported. A key held in a `const`, an options object held in a `const`, shorthand `{ apiKey }`, and a same-file spread (`{ ...base }`) are read. A reassigned `let`, a parameter, or an import is not followed.

Nothing in `eslint-plugin-secure-coding` reports this shape — measured, not assumed. The generic credential rules look for password-shaped names and connection strings; an SDK's client options are a different shape.

## Incorrect

```ts
import OpenAI from 'openai';
const client = new OpenAI({ apiKey: 'sk-proj-...' });
```

## Correct

```ts
import OpenAI from 'openai';
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
```
