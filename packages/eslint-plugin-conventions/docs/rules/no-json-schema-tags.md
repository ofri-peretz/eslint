---
title: no-json-schema-tags
description: Disallow JSON Schema keywords (e.g. @minimum, @maximum, @pattern, @format) used as JSDoc tags.
tags: ['conventions', 'jsdoc', 'documentation']
category: quality
autofix: suggestions
---

> **Keywords:** no-json-schema-tags, JSDoc, JSON Schema, @minimum, @maximum, @pattern, @format, TSDoc, DefinitelyTyped, ESLint rule

<!-- @rule-summary -->
Disallow JSON Schema keywords (e.g. `@minimum`, `@maximum`, `@pattern`, `@format`) used as JSDoc tags. These keywords are valid in OpenAPI / JSON Schema documents but not in JSDoc; they fail in projects with strict tag validation (e.g. DefinitelyTyped, TSDoc-strict CI).
<!-- @/rule-summary -->

This rule is part of [`eslint-plugin-conventions`](https://www.npmjs.com/package/eslint-plugin-conventions).

## Quick Summary

| Aspect         | Details                                                                         |
| -------------- | ------------------------------------------------------------------------------- |
| **Severity**   | Medium (Quality)                                                                |
| **Auto-Fix**   | 💡 Suggestions                                                                  |
| **Category**   | Conventions                                                                     |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                                         |
| **Best For**   | Libraries published to npm; codebases that publish TypeScript types externally  |

## Why these tags don't belong in JSDoc

JSDoc and TSDoc define a finite tag vocabulary (`@param`, `@returns`, `@throws`, `@deprecated`, …). JSON Schema keywords like `@minimum`, `@maximum`, `@pattern` and `@format` look like JSDoc tags but are not recognized by:

- The TypeScript compiler's strict TSDoc mode (`tsdoc.json` → `noStandardTags`).
- DefinitelyTyped's lint suite (`dtslint`).
- IDE tooling that ships type-aware JSDoc autocomplete.

They originate from people generating OpenAPI specs from TypeScript types and leaking constraint annotations into the source. The constraint belongs in the description prose, not in a synthetic tag.

## Examples

### ❌ Incorrect

```ts
/**
 * @param age The user's age.
 * @minimum 0
 * @maximum 150
 */
function setAge(age: number) {}

/**
 * @param email Contact email.
 * @format email
 */
function setEmail(email: string) {}
```

### ✅ Correct

```ts
/**
 * @param age The user's age. Must be in the range [0, 150].
 */
function setAge(age: number) {}

/**
 * @param email Contact email. Must be a valid RFC 5322 address.
 */
function setEmail(email: string) {}
```

## Error Message Format

```text
⚠️ CONVENTIONS | @minimum is a JSON Schema keyword, not a valid JSDoc tag | MEDIUM
   Fix: Move the constraint into the @param description, or move the entire validation to a schema layer (zod, valibot, ajv).
```

## What the rule reads

The rule reports a forbidden keyword written as a block tag in a JSDoc comment
(`/** … */`): first on a line after the optional ` * ` gutter, or first in a
one-line `/** @format email */`.

Forbidden by default: `minimum`, `maximum`, `exclusiveMinimum`,
`exclusiveMaximum`, `minLength`, `maxLength`, `minItems`, `maxItems`,
`minProperties`, `maxProperties`, `multipleOf`, `pattern`, `uniqueItems`,
`format`, `contentMediaType`, `contentEncoding`.

It does not report:

- `@enum` and `@const` — JSON Schema keywords, but also tags JSDoc itself
  defines (TypeScript reads `@enum` in JavaScript).
- An `@keyword` inside prose (`team@format.io`, `Range note: @minimum 1`):
  it is description text, not a tag.
- A plain block comment (`/* … */`) or a line comment: no JSDoc tool reads
  them as carrying tags.

## Options

| Option                    | Type       | Default | Description                                         |
| ------------------------- | ---------- | ------- | --------------------------------------------------- |
| `additionalForbiddenTags` | `string[]` | `[]`    | More tag names to report, on top of the default set |

```js
{
  rules: {
    'conventions/no-json-schema-tags': ['warn', { additionalForbiddenTags: ['openapi'] }],
  },
}
```

## Known False Negatives

- Project-specific tag allowlists in `tsdoc.json` are not consulted: a tag is
  reported only when it is in the default set or `additionalForbiddenTags`.
