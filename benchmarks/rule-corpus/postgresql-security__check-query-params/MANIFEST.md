# Rule corpus - `postgresql-security/check-query-params` (CWE-20)

## What the rule owns

A `$n` placeholder count that disagrees with the values array bound to it.

PostgreSQL numbers bind parameters; it does not count occurrences. The
statement demands as many parameters as its HIGHEST index, and the extended
protocol rejects the whole statement when the array does not supply exactly
that many. Both directions are hard runtime failures:

```
bind message supplies 1 parameters, but prepared statement "" requires 2
bind message supplies 3 parameters, but prepared statement "" requires 2
```

## The three judgement calls, and why

**1. Is a SURPLUS a finding, or only a shortfall?** A finding. The server
rejects it just as loudly, and the way it happens is ordinary: a WHERE clause is
deleted and its value is left behind in the array (`vulnerable/16`). Detecting
only the shortfall halves the rule for no gain in precision.

The surplus direction fires only when the statement contains at least one `$n`,
and that guard is load-bearing rather than cosmetic. A statement with no `$n`
carries no evidence of a PostgreSQL bind at all — and a service that reads from
`pg` and writes to a legacy MySQL replica in the same file has
`legacy.query('UPDATE u SET email = ? WHERE id = ?', [email, id])` sitting right
there. Counting `$n` against THAT array reports a mismatch that does not exist.
`safe/07` is that file.

**2. `[...values]` and `rows.map(…)`?** Abstain. `[orgId, ...ids]` binds one
value plus however many the caller passes; `.map()` returns whatever the data
had. A count invented from an array the file cannot see is a report on evidence
that does not exist. `safe/05`, `safe/06`, `safe/14`, `safe/16`.

**3. Is a template literal with no expressions analysable?** Yes, and the old
rule missed it entirely by requiring `Literal`. That is not an edge case: a
statement long enough to have a parameter-count bug is written across several
lines, and several lines means a template literal. It was the single largest
source of missed findings. A template WITH expressions is a different matter and
still abstains — an interpolated fragment can contain placeholders of its own,
so the count is genuinely unknowable (`safe/10`).

## What each fixture proves

| fixture | proves |
|---|---|
| `vulnerable/01` | the canonical shortfall in an Express route |
| `vulnerable/02` | a **multi-line template** with no interpolation |
| `vulnerable/03` | the `query({ text, values })` config-object form |
| `vulnerable/04` | TS: a **surplus** — one placeholder, two values |
| `vulnerable/05` | the statement in a module constant (the repository shape) |
| `vulnerable/06` | a gap left by deleting a clause without renumbering |
| `vulnerable/07` | `$10` is the tenth parameter, not `$1` and a zero |
| `vulnerable/08` | the statement returned by a local builder |
| `vulnerable/09` | the `execute` spelling of the sink |
| `vulnerable/10` | the statement split across a `+` concatenation of literals |
| `vulnerable/11` | the values array in a named binding |
| `vulnerable/12` | **wave 2** `String.raw` |
| `vulnerable/13` | **wave 2** computed string keys — `{ ['text']: … }` |
| `vulnerable/14` | **wave 2** shorthand properties, config through one more hop |
| `vulnerable/15` | **wave 2** a repeated two-digit index |
| `vulnerable/16` | **wave 2** a surplus left by a removed clause |
| `safe/01` | the correct shape |
| `safe/02` | `$1` referenced twice binds one value |
| `safe/03` | `'$1'` inside a string constant is data |
| `safe/04` | `$2` / `$3` left behind in `--` and `/* */` comments |
| `safe/05` | a spread element makes the length unknowable |
| `safe/06` | `.map()` is not an array literal |
| `safe/07` | **a mysql2 `?` statement in the same file** — no `$n` evidence |
| `safe/08` | a `$$ … $$` plpgsql body full of placeholder-looking text |
| `safe/09` | `"$1"` is a quoted identifier, not a parameter |
| `safe/10` | a template WITH interpolation, count still correct |
| `safe/11` | a callback as the second argument |
| `safe/12` | **wave 2** a `sql` tagged template (postgres.js) binds its own |
| `safe/13` | **wave 2** a named prepared statement with no `values` at all |
| `safe/14` | **wave 2** `values` arriving as a function parameter |
| `safe/15` | **wave 2** a named `$body$` dollar-quote tag |
| `safe/16` | **wave 2** a values binding rebuilt conditionally |

Every fixture, safe and vulnerable, imports a PostgreSQL client.

## Deliberately out of scope

- **Whether the values are the RIGHT values.** Types and order are not knowable
  from the statement text.
- **Statements assembled with interpolation.** `safe/10`. The interpolated
  fragment can carry placeholders; abstaining is the only honest answer.
- **`pg-promise`'s `db.one` / `db.any` / `db.none` and named `$<name>` /
  `$/name/` parameters.** A different placeholder grammar on a different sink
  surface; mixing them in would make the `$n` count meaningless.
- **Whether the array is reachable at all.** This rule counts; it does not
  taint-track.

## Adversarial wave

Wave 1 (`vulnerable/07–11`, `safe/08–11`) held at 100% against the rewrite. Wave
2 (`vulnerable/12–16`, `safe/12–16`) was written afterwards to break it and found
two real defects: `String.raw` (silent in all three rules in this package) and
computed property keys — `{ ['text']: … }` is the same object as
`{ text: … }`, and it is what a codegen or minifier emits for free. This package
has previously shipped a valid-case comment reading "computed key (ignored by
rule for now)", which is the same evasion written down as if it were a decision.
Both are locked in `src/rules/check-query-params/regression.test.ts`.
