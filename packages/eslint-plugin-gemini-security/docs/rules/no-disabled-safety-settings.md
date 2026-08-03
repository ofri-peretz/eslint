---
title: no-disabled-safety-settings
description: Forbid disabling Gemini harm-category filters
tags: ['security','gemini']
category: security
severity: high
cwe: CWE-693
autofix: false
---

# no-disabled-safety-settings

> Forbid disabling Gemini harm-category filters.

- **CWE:** [CWE-693 — Protection Mechanism Failure](https://cwe.mitre.org/data/definitions/693.html)
- **OWASP:** A04:2021 — Insecure Design
- **CVSS:** 7.4 (High) · **Recommended:** `error`

## Why

`threshold: BLOCK_NONE` (or `OFF`) switches off the model's content filter for that harm category. Where output reaches users — or feeds another system — that removes the only server-side control over what the model may emit. Each disabled category is reported separately.

Both the string form and the enum form (`HarmBlockThreshold.BLOCK_NONE`) are detected.

## Incorrect

```ts
import { GoogleGenAI } from '@google/genai';

const config = {
  safetySettings: [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
  ],
};
```

## Correct

```ts
const config = {
  safetySettings: [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  ],
};
```

## When not to use it

Red-teaming or eval harnesses that deliberately probe unfiltered output. Disable the rule for those files specifically rather than globally.
