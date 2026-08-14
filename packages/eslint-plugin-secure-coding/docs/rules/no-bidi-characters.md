---
title: no-bidi-characters
description: Disallows Unicode bidirectional control characters, which let source render differently than it compiles (Trojan Source, CWE-1007)
tags: ['security', 'core']
category: security
severity: high
cwe: CWE-1007
autofix: false
---

> **Keywords:** Trojan Source, CWE-1007, bidi characters, bidirectional override, homoglyph, supply chain, code review bypass, RLO, LRO, ESLint rule, LLM-optimized

<!-- @rule-summary -->
Disallows Unicode bidirectional control characters, which let source render differently than it compiles (Trojan Source, CWE-1007)
<!-- @/rule-summary -->

**CWE:** [CWE-1007](https://cwe.mitre.org/data/definitions/1007.html)
**Reference:** [Trojan Source (Boucher & Anderson, 2021)](https://trojansource.codes/)

Bidirectional control characters are invisible. They tell a text renderer to reorder the
characters around them, so an editor, a terminal, and a GitHub diff can all display one
program while the compiler builds a different one. The reviewer approves what they see;
the build ships what is actually there.

This is the defect class behind [CVE-2021-42574](https://nvd.nist.gov/vuln/detail/CVE-2021-42574),
which affected essentially every language with Unicode source support.

## Rule details

Reports any of the Unicode bidi control characters appearing anywhere in the source —
string literals, comments, identifiers, or template contents.

Examples of **incorrect** code:

```js
// The comment below contains U+202E RIGHT-TO-LEFT OVERRIDE.
// Rendered, it reads as an early return. Compiled, it is not one.
if (accessLevel !== 'user‮ ⁦// Check if admin⁩⁦') {
  grantAdmin();
}
```

```js
const isAdmin = false; /*‮ } ⁦if (isAdmin)⁩ ⁦*/
```

Examples of **correct** code:

```js
// Plain ASCII: what is displayed is what is compiled.
if (accessLevel !== 'user') {
  grantAdmin();
}
```

```js
// Legitimate right-to-left TEXT needs no control characters —
// the characters carry their own direction.
const messages = { he: 'שלום', ar: 'مرحبا' };
```

## Why this rule reports what it does

The distinction that matters is **control characters versus script**. Hebrew, Arabic,
Persian and Urdu text is welcome and reports nothing — those characters have intrinsic
directionality. What is reported is the invisible *override*: `U+202A`–`U+202E`,
`U+2066`–`U+2069`, and the directional marks `U+200E`/`U+200F`.

## Options

| Option                  | Type       | Default | Description                                                              |
| ----------------------- | ---------- | ------- | ------------------------------------------------------------------------ |
| `additionalCharacters`  | `string[]` | `[]`    | Extra code points to treat as bidirectional control characters           |
| `allowDirectionalMarks` | `boolean`  | `false` | Permit `U+200E` / `U+200F` (LRM / RLM), which cannot reorder code         |

```js
{
  'secure-coding/no-bidi-characters': ['error', {
    additionalCharacters: [],
    allowDirectionalMarks: false,
  }],
}
```

**`allowDirectionalMarks`** — the two directional *marks* are occasionally load-bearing in
mixed-direction UI copy, where they fix punctuation placement in an otherwise correct
string. They cannot reorder code, only adjacent characters. Set this to `true` if your
localisation files legitimately use them; the overrides and isolates stay reported either way.

**`additionalCharacters`** — accepts code points as strings, for organisations with a
stricter Unicode policy than this rule's default set.

## Suggestions

The rule provides a `removeBidiCharacter` suggestion that deletes the offending character.
It is offered rather than auto-fixed deliberately: if the character is load-bearing in a
localisation string, silently removing it on `--fix` would corrupt the copy.

## When not to use it

If your build pipeline already rejects non-ASCII source outright, this rule is redundant.
Otherwise, keep it on — the cost is a single scan and the failure mode it prevents is a
code review that cannot be trusted.

## Related

- [`eslint-plugin-secure-coding/detect-object-injection`](./detect-object-injection.md)
- [`anti-trojan-source`](https://github.com/lirantal/anti-trojan-source) — the reference implementation of this check
