# Design — `node-security/no-modulo-biased-random`

**Intent:** [intent.md](./intent.md) · **Status:** built in the PR that adds this file, for review

## Requirements

1. Report `x % n` where `x` is an element of a cryptographically random collection, the result
   picks a position or becomes text, and `n` is not known to divide the element's range.
2. Follow the value from its source by structure; proximity in the file is not evidence.
3. Stay silent on rejection sampling, on divisors that divide the range, and on a `%` used for
   anything other than a position or text.

## Design

- **Sources**, resolved with devkit's `resolveModuleBinding`: `randomBytes` from `crypto` /
  `node:crypto` (default, namespace, named or `require`d), range 256; `getRandomValues` from
  `crypto.webcrypto` or the undeclared global `crypto` (`globalThis.` / `window.` / `self.`
  prefixes), ranged by its typed-array argument: `Uint8Array` and `Uint8ClampedArray` 256,
  `Uint16Array` 65536, `Uint32Array` 2^32. Signed arrays have no unsigned range and are skipped.
- **Collections:** the source call, `await` of it, a once-bound variable holding it,
  `Array.from(c)`, `[...c]`, `c.slice()`, `c.subarray()`, and a typed array whose variable is
  passed as the first argument of `getRandomValues`.
- **Elements:** `c[i]`; `c.readUInt8|16|32(BE|LE)()` with its own range; the `for…of` variable
  over `c`; the first parameter of a callback to `c.map` / `flatMap` / `forEach` / `filter` /
  `some` / `every` / `find` / `findIndex` or to `Array.from(c, cb)`; a variable initialised with
  an element.
- **Use:** the computed property of a member access, the first argument of `charAt` / `at` /
  `charCodeAt` / `codePointAt` / `fromCharCode`, `String.fromCharCode(base + x)`, a template
  expression, the global `String(x)`, or `x.toString()`.
- **Divisor:** a number literal, a `const` bound to one, or `.length` of a `const` string
  (literals, expression-free templates and their `+` concatenations) is evaluated. Silent when it
  divides the range or is at least the range. Any other divisor is reported with a message that
  says the bias depends on it.
- **Rejection sampling:** the same variable, or the same element expression, as an operand of
  `<`, `<=`, `>` or `>=` anywhere in the enclosing function.
- **Severity / preset.** `strict` only, CWE-330, CVSS 5.3 (stated in the message and docs).

## Evidence

- RuleTester: 68 cases, all pass on ESLint and oxlint. The ToolJet shape before #19245 reports
  with the measured skew ("the first 46 of 70 results each come up 4 times in 256, the other 24
  only 3 times"); the code after #19245, pkce-challenge's rejection sampling, and a `% 16` hex
  pick do not.
- Fidelity model `node-security/no_modulo_biased_random`: 7 sources × 4 accesses × 5 divisors ×
  2 uses × 2 guards = 560 inputs. An exhaustive local run over all 560 agrees with the model.
- `node_modules` scan, 2026-11-25 (260 files that mention `randomBytes` or `getRandomValues`):
  0 reports, which matches the intent's hand count of 0 true cases among the 26 nearby `%`
  shapes.
- Corpus: `benchmarks/corpus/CWE-330` gains two vulnerable fixtures (ToolJet's password, a
  six-digit code) and two safe twins (`crypto.randomInt`, rejection sampling).

## Rejected alternatives

- **Reporting any `%` near a random call.** The intent's scan found 26 such shapes and none was
  biased: 20 are big-number arithmetic in decimal.js, bignumber.js and Prisma.
- **A bias threshold** (report only when the skew passes some ratio). Any non-divisor makes
  some characters likelier; the message states the exact skew so the reader can judge it.
- **Owning `Math.floor(Math.random() * n)`.** `no-math-random-crypto` already reports that
  source; reporting it twice would split one fix across two rules.
- **Following collections across calls** (a helper that returns the bytes). That needs
  inter-procedural flow; listed under Known False Negatives.

## Non-goals

- Auto-fix: `crypto.randomInt` changes the code's shape (one call per pick), and rejection
  sampling changes its loop.
- `browser-security` duplication: the global `crypto.getRandomValues` is covered here, since
  the rule reads no Node-only API beyond `randomBytes`.
