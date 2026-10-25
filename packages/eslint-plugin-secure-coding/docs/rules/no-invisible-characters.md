---
title: no-invisible-characters
description: Disallows invisible letters such as the Hangul fillers (U+3164, U+FFA0), which hide identifiers, values and comment text from code review (CWE-1007)
tags: ['security', 'core']
category: security
severity: medium
cwe: CWE-1007
autofix: false
---

> **Keywords:** invisible backdoor, Hangul filler, U+3164, U+FFA0, invisible characters, Unicode security, code review bypass, supply chain, CWE-1007, eslint-plugin-security, detect-invisible-characters

<!-- @rule-summary -->

Disallows invisible letters such as the Hangul fillers (U+3164, U+FFA0), which hide identifiers, values and comment text from code review (CWE-1007)
<!-- @/rule-summary -->

**CWE:** [CWE-1007](https://cwe.mitre.org/data/definitions/1007.html)
**OWASP:** [A08:2021 Software and Data Integrity Failures](https://owasp.org/Top10/A08_2021-Software_and_Data_Integrity_Failures/)

Some characters are letters as far as JavaScript is concerned and nothing at all as far as
your editor is concerned. This rule is part of
[`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding),
and is the drop-in for `eslint-plugin-security`'s `detect-invisible-characters`.

## Quick Summary

| Aspect            | Details                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| **CWE Reference** | [CWE-1007](https://cwe.mitre.org/data/definitions/1007.html) (Insufficient Visual Distinction of Homoglyphs) |
| **Severity**      | Medium (CVSS 5.3)                                                                                            |
| **Auto-Fix**      | ❌ No — a suggestion removes the character, because only the author knows whether it was intended            |
| **Category**      | Security                                                                                                     |

## Vulnerability and Risk

**Vulnerability:** `U+3164 HANGUL FILLER` renders as blank space, yet it is a valid
identifier character. Placed inside a name it creates a second binding that looks exactly
like the first; placed on its own it is a whole identifier that reads as whitespace. The
second form is the "invisible backdoor": a hidden destructured parameter or array element
that carries attacker input into a sink while the diff shows nothing.

```js
// The second `admin` contains U+3164 between "adm" and "in" — two different variables.
const admin = false;
const admin = true;
```

**Risk:** Code review is the control, and it is defeated. Unlike
[Trojan Source](https://trojansource.codes/) bidi overrides, these characters reorder
nothing — they simply are not drawn, so there is nothing for a reviewer to notice.

## Rule Details

The rule scans the source text — identifiers, strings, template literals, regular
expressions and comments — for six characters:

| Code point | Name                    |
| ---------- | ----------------------- |
| `U+115F`   | HANGUL CHOSEONG FILLER  |
| `U+1160`   | HANGUL JUNGSEONG FILLER |
| `U+17B4`   | KHMER VOWEL INHERENT AQ |
| `U+17B5`   | KHMER VOWEL INHERENT AA |
| `U+3164`   | HANGUL FILLER           |
| `U+FFA0`   | HALFWIDTH HANGUL FILLER |

Each is a Unicode default-ignorable code point **and** a letter or mark, which is the
combination that makes it dangerous: it draws as nothing and it is still legal inside a
JavaScript name. `eslint-plugin-security` covers `U+3164` and `U+FFA0`; the other four
are the same class.

The set is a list, not a range. The neighbouring characters in each block — `U+3131`,
`U+314F`, `U+FFA1`, the conjoining jamo that compose a syllable, visible Khmer — are real
letters of real scripts, and Korean or Khmer text is never reported.

What this rule deliberately leaves to its siblings, so that one character never gets two
findings:

- bidi controls (`U+202A`–`U+202E`, `U+2066`–`U+2069`) → [`no-bidi-characters`](./no-bidi-characters.md);
- zero-width and other format characters (`U+200B`, `U+2060`, `U+FEFF`, …) in strings →
  [`no-homoglyph-identifiers`](./no-homoglyph-identifiers.md);
- variation selectors and `U+200D` ZWJ are not reported anywhere by default: they are a
  required part of ordinary emoji.

A finding in a comment gets its own message, because the risk differs: in code the
character changes what runs, in a comment it changes what the reviewer reads.

Each finding offers a `removeInvisibleCharacter` suggestion that deletes exactly that
character. It is a suggestion, not a `--fix`, because removing a character from an
identifier renames it.

## Examples

### ❌ Incorrect

Every example below is shown with the invisible character as `<U+3164>`, because the
real character would print as nothing on this page.

```js
var adm<U+3164>in = 1;                // a second identifier that reads as `admin`
var greeting = "hello<U+3164>world";  // a different string than the one you see

const { timeout, <U+3164> } = req.query; // a hidden parameter taken from the request…
exec(<U+3164>);                          // …and executed

const checkCommands = [
  'ping -c 1 google.com',
  'curl -s http://example.com/',<U+3164> // a hidden extra array element
];

// hidden<U+3164>comment
```

### ✅ Correct

```js
// Plain identifiers and strings.
const admin = false;
const greeting = 'hello world';

// Korean and Khmer text is text.
const hello = '안녕하세요';

// A deliberate filler, written as an escape so review can see it.
const BLANK_NAME = '\u3164';
```

## Options

This rule has no options. To ban further characters across the whole source, use
`no-bidi-characters`' `additionalCharacters` option.

## Error Message Format

```
🔒 CWE-1007 OWASP:A08-Software CVSS:5.3 | U+3164 HANGUL FILLER found in code. It renders as nothing but is a real character: inside a name it makes a different identifier, inside a string a different value, and alone it is an identifier a reviewer cannot see. | MEDIUM
   Fix: Remove the character. If a string genuinely needs it, write it as an escape (\u3164) so it is visible in review. | https://certitude.consulting/blog/en/invisible-backdoor/
```

```
🔒 CWE-1007 OWASP:A08-Software CVSS:5.3 | U+3164 HANGUL FILLER found in a comment. It renders as nothing, so the comment a reviewer reads is not the text that is there. | MEDIUM
   Fix: Remove the character. | https://certitude.consulting/blog/en/invisible-backdoor/
```

## Known False Negatives

### Characters outside the six

**Why**: The set is limited to invisible letters no sibling rule reports. Other blank or
near-blank characters — `U+2800 BRAILLE PATTERN BLANK`, `U+034F COMBINING GRAPHEME
JOINER` — have legitimate uses in text and are not in it.

**Mitigation**: Add them through `no-bidi-characters`' `additionalCharacters`, which scans
the whole source the same way.

### Invisible characters built at runtime

**Why**: `String.fromCharCode(0x3164)` or `'\u3164'` produce the character only when the
code runs. The source a reviewer reads shows it plainly, which is the property this rule
protects.

**Mitigation**: None needed for review; validate untrusted identifiers at runtime if your
application accepts them.

## When Not To Use It

A Korean-language codebase that uses `U+3164` as a deliberate blank placeholder (for
example, an empty-looking display name) will see those uses reported. Write them as the
`\u3164` escape instead of disabling the rule: the escape is visible, and the rule stays
on for the place an attacker would put one.

## Further Reading

- **[The Invisible JavaScript Backdoor](https://certitude.consulting/blog/en/invisible-backdoor/)** — the attack this rule closes
- **[CWE-1007](https://cwe.mitre.org/data/definitions/1007.html)** — Insufficient Visual Distinction of Homoglyphs Presented to User
- **[Unicode TR39: Security Mechanisms](https://www.unicode.org/reports/tr39/)** — default-ignorable and confusable characters

## Related Rules

- [`no-bidi-characters`](./no-bidi-characters.md) — bidi controls (Trojan Source)
- [`no-homoglyph-identifiers`](./no-homoglyph-identifiers.md) — lookalike letters and zero-width characters
