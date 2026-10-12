---
title: no-hardcoded-api-key
description: Forbid a literal API key in the Gemini client construction
tags: ['security', 'gemini']
category: security
severity: critical
cwe: CWE-798
autofix: false
---

# no-hardcoded-api-key

> Forbid a literal API key in the Gemini client construction.

- **CWE:** [CWE-798 — Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)
- **OWASP:** A07:2021 — Identification and Authentication Failures
- **CVSS:** 9.1 (Critical) · **Recommended:** `error`

## Why

A key written into source is committed, pushed, mirrored into every clone and CI cache, and is billable by anyone who reads it. Because rotating it means a code change, leaked keys tend to stay live far longer than they should.

Gemini is the one SDK of the three where the key is commonly a **positional** argument: the legacy `@google/generative-ai` client is constructed as `new GoogleGenerativeAI(apiKey)`, with no options object to inspect, and so are its server-side `GoogleAIFileManager` and `GoogleAICacheManager`. The current `@google/genai` client takes `{ apiKey }` like the others. Both shapes are checked. The positional constructors are recognised by the name the SDK exports, resolved through the import, so `import { GoogleGenerativeAI as G }` is still checked.

The rule is gated on the SDK being imported, so it stays silent in files that do not construct the client. A spread whose source this file cannot see makes the options unreadable rather than guessed at.

## What counts as a hardcoded key

- **Only the SDK's own client.** The callee must resolve, through its import or `require()`, to the SDK — a constructor, a factory the SDK exports, `client.withOptions(...)`, a same-file subclass (`super(...)` included), or a same-file wrapper that passes its options parameter straight into the client. `new Pinecone({ apiKey })` in the same file, a test matcher such as `expect.objectContaining({ apiKey })`, and the Vercel AI SDK's provider factories (owned by `vercel-ai-security`) are not this rule's.
- **Key-shaped values only.** A credential is a generated token: at least 20 characters, no whitespace, letters and digits mixed. Stand-ins the SDKs' own tests and docs use — `'fake-api-key'`, `'test-key'`, `'...'`, `'ollama'`, `'<YOUR_API_KEY>'`, `'sk-xxxxxxxx…'` — are not reported.
- **Followed within the file.** A key written as an environment fallback (`process.env.KEY ?? 'sk-…'`, `|| 'sk-…'`, or a ternary branch) is committed exactly like a bare one and is reported. A key held in a `const`, an options object held in a `const`, shorthand `{ apiKey }`, and a same-file spread (`{ ...base }`) are read. A reassigned `let`, a parameter, or an import is not followed.

## Incorrect

```ts
import { GoogleGenerativeAI } from '@google/generative-ai';
const client = new GoogleGenerativeAI('AIza...');
```

```ts
import { GoogleGenAI } from '@google/genai';
const client = new GoogleGenAI({ apiKey: 'AIza...' });
```

## Correct

```ts
import { GoogleGenerativeAI } from '@google/generative-ai';
const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
```

```ts
import { GoogleGenAI } from '@google/genai';
const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
```
