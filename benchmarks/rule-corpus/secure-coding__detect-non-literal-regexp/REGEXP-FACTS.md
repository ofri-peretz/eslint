# What a non-literal `RegExp` actually is, executed on Node 24

Measured 2026-08-19 over the 20-repository corpus: **176 findings across 112
distinct cases.** Every single one carries the same messageId — `regexpReDoS`.

That is the first thing to settle, because it is not a tuning question.

## The rule proves "not a literal" and reports "ReDoS"

`detect-non-literal-regexp` establishes that a pattern is not a literal. Its
message tells the reader the pattern is vulnerable to catastrophic backtracking.
Those are different claims, and the second does not follow from the first:
`new RegExp(escapeRegExp(name))` is not a literal and cannot backtrack
catastrophically, while `/(x+x+)+y/` is a literal and does.

The ecosystem already has a rule that establishes the second claim properly.
`no-redos-vulnerable-regex` decides it with `recheck`, an independent oracle, at
98.1% precision. A rule that asserts the same weakness without the oracle is not
a second opinion — it is the same claim with the evidence removed.

## Class B: cloning a RegExp, 7 cases / 10 findings

```js
const ret = new RegExp(regexp.source, regexp.flags);   // Automattic/mongoose
const regexp = new RegExp(source.source, source.flags); // webpack/webpack
const regex = new RegExp(PLACEHOLDER_REGEX.source, 'g'); // n8n-io/n8n
```

`.source` is a string the **engine** produced from an already-compiled RegExp,
not one a caller supplied. Cloning cannot introduce backtracking the original
did not have. Executed against the oracle rather than argued:

```
  /(x+x+)+y/        original=vulnerable  clone=vulnerable  IDENTICAL
  /^\d+$/           original=safe        clone=safe        IDENTICAL
  /(a|a)*b/i        original=vulnerable  clone=vulnerable  IDENTICAL
  /^[a-z]{1,10}$/gm original=safe        clone=safe        IDENTICAL
```

4/4 byte-identical, oracle verdict included. So a finding here is one of two
things, and neither is useful: a **duplicate**, when the original is a literal in
the same file that `no-redos-vulnerable-regex` already reports; or a
**misattribution**, pointing the reader at the copy instead of the pattern.

The probe is `scripts/` — reproduce with the snippet above under `recheck`.

### What is deliberately NOT exempted

`new RegExp(re.source + '$', re.flags)` — nestjs/nest — is concatenation, not a
clone. Appending a literal is usually harmless, but a literal may itself carry a
quantifier (`re.source + '+'`), and "usually" is not a contract. Only the pure
`X.source` form is provably a clone, so only that form is claimed.

## Class A: escaped interpolation, 12 cases / 24 findings — a NAMED dead end

```js
new RegExp(`{{\\s*?${escapeStringRegexp(relationVar)}\\s*?}}`)  // directus
new RegExp(escapeRegex(query), ignoreCase ? 'i' : '')           // n8n
new RegExp(`^#{1,3} ${escVersion}(\\s|$)`, 'm')                 // knex
```

If the interpolated text is escaped, it contributes no metacharacter, so it
cannot add a quantifier or an alternation and cannot create backtracking the
surrounding literal did not already have. That reasoning is sound and the class
is real — and this rule **cannot act on it**, for a reason worth naming rather
than working around.

Recognising these means deciding from the callee's NAME: `escapeRegExp`,
`escapeStringRegexp`, `escapeRegex`, `escVersion`. That is precisely the defect
`lint:name-inference` exists to gate, and the doctrine is not negotiable for
convenience — a project with a helper called `escapeRegExp` that does not escape
would be silently unprotected, and one whose escaper is called `q` gets no
credit. The evidence-based version requires knowing what the function RETURNS,
which is interprocedural: **L1**.

Recorded as a known gap, not fixed by an allowlist.

## Class C: the remainder, 93 cases / 142 findings

```js
const regex = new RegExp(keyword, "i");        // louislam/uptime-kuma
const re = new RegExp(grader.pattern, 'i');    // n8n-io/n8n
return new RegExp(String(value));              // directus/directus
new RegExp(sch.regex)                          // Unitech/pm2
```

These are genuinely non-literal and the rule is correct about that. Whether each
is *actionable* is the effective-FP question and is not answered here — it needs
the reachability work the seal record already lists as unmet.

## Corpus hygiene

32 of the 176 findings (14 of 112 cases) land in vendored or bundled files —
`.yarn/releases/yarn-4.13.0.cjs` and similar. No consumer edits those. They
should not count toward a precision figure in either direction, and they are
excluded from the class counts above where they were the only example.
