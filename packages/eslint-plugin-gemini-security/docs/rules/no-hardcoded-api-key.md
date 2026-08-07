---
title: no-hardcoded-api-key
description: Forbid a literal API key in the Gemini client construction
tags: ['security','gemini']
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

Gemini is the one SDK of the three where the key is commonly a **positional** argument: the legacy `@google/generative-ai` client is constructed as `new GoogleGenerativeAI(apiKey)`, with no options object to inspect. The current `@google/genai` client takes `{ apiKey }` like the others. Both shapes are checked.

The rule is gated on the SDK being imported, so it stays silent in files that do not construct the client. An empty string is treated as a placeholder, not a credential, and a spread (`{ ...base }`) makes the options unreadable rather than guessed at.

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
