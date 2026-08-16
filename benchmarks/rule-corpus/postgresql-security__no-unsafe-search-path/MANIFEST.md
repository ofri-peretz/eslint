# Rule corpus - `postgresql-security/no-unsafe-search-path` (CWE-426)

## What the rule owns

A `SET search_path` statement whose value this file cannot prove safe.

`search_path` decides which schema an unqualified name resolves against. An
attacker who chooses it prepends a schema of their own and shadows every
function, operator and table the rest of the session touches — including the
ones inside SECURITY DEFINER functions. Nothing is injected and nothing is
quoted wrong; the statement is perfectly formed and resolves somewhere else.

## The line this rule has to walk

**PostgreSQL does not accept a bind parameter here.** `SET search_path TO $1`
is a syntax error, so the ordinary remediation for a dynamic SQL value is not
available. That is exactly why this rule exists, and it is why its answer to
"how do I fix this" differs from every other injection rule in the package:

| remediation | fixes CWE-89 | fixes CWE-426 |
|---|---|---|
| `$1` placeholder | yes | **not available** |
| `escapeIdentifier(x)` / `format('%I', x)` | yes | **no** |
| allowlist check before the call | yes | **yes** |

A quoted schema name is still a schema name the attacker picked. So a CALL is
treated as a raw value here, which is the deliberate opposite of
`no-unsafe-query` — and `vulnerable/04` and `vulnerable/10` are in the corpus
to pin that decision rather than let it drift.

The corresponding obligation is that the rule must recognise the remediation it
DOES accept: `safe/03` and `safe/07` are the allowlist guard in its two real
spellings, and both must stay quiet. Reporting a developer who did the right
thing is how a security rule gets switched off.

## What each fixture proves

| fixture | proves |
|---|---|
| `vulnerable/01` | the canonical multi-tenant route, schema from the URL |
| `vulnerable/02` | the same hijack spelled as `+` concatenation |
| `vulnerable/03` | `SET LOCAL` — transaction scope does not make the value safe |
| `vulnerable/04` | `format('… %I', schema)` — escaping is the wrong fix here |
| `vulnerable/05` | TS: `as string` cast, value AND statement through bindings |
| `vulnerable/06` | a block-bodied `function` builder assembling the statement |
| `vulnerable/07` | lowercase keywords, irregular whitespace, a leading comment |
| `vulnerable/08` | the `execute` spelling of the sink |
| `vulnerable/09` | a concise-arrow builder plus a one-hop value |
| `vulnerable/10` | `escapeIdentifier` — correctly quoted, still hijackable |
| `vulnerable/11` | **wave 2** `String.raw` |
| `vulnerable/12` | **wave 2** the allowlist guard runs AFTER the sink |
| `vulnerable/13` | **wave 2** the guard logs and falls through |
| `vulnerable/14` | **wave 2** a constant binding overwritten from the request |
| `vulnerable/15` | **wave 2** the SET is the second statement in the string |
| `safe/01` | a hardcoded resolution order set at connect time |
| `safe/02` | an interpolation that folds to a literal |
| `safe/03` | **the remediation** — a `Set` allowlist with a throwing guard |
| `safe/04` | a dynamic `SET TIME ZONE` / `statement_timeout` — different knob |
| `safe/05` | `RESET search_path` and `SET search_path TO DEFAULT` |
| `safe/06` | a multi-line static template |
| `safe/07` | **the remediation** — an allowlist with an early-return guard |
| `safe/08` | the phrase inside a quoted string on an INSERT |
| `safe/09` | concatenation of two literals |
| `safe/10` | a local builder that returns a constant |
| `safe/11` | **wave 2** a `sql` tagged template (postgres.js) |
| `safe/12` | **wave 2** the phrase inside a block comment |
| `safe/13` | **wave 2** `format(…)` with every argument constant |
| `safe/14` | **wave 2** a template interpolating another constant template |

Every fixture, safe and vulnerable, imports a PostgreSQL client. A safe fixture
that is quiet because the module gate never opened measures the gate, not the
rule.

## Deliberately out of scope

- **`SELECT set_config('search_path', $1, false)`.** The function form does
  take a bind parameter, so the statement is well-formed and the question
  becomes purely "is this value trusted" — a data-flow question with no SQL
  evidence in the statement at all. The rule owns the `SET` statement.
- **A dynamic value in any other `SET`.** `SET TIME ZONE ${tz}` is not a
  privilege boundary. `safe/04` pins that.
- **A member expression as the value** — `SET search_path TO ${cfg.schema}` is
  REPORTED. A `const` object is still mutable, and proving it is never written
  needs whole-file alias analysis. This is the rule's one deliberately
  conservative call; an allowlist guard (`safe/03`) silences it.
- **`COPY`, injection, and credentials.** Other rules in this package.

## Adversarial wave

Fixtures `vulnerable/07–10` and `safe/07–10` were written before the rewrite
and the rewrite scored 100% on them. Wave 2 (`vulnerable/11–15`, `safe/11–14`)
was written AFTER that 100%, aimed squarely at the new implementation, and it
found a real defect: `String.raw` was silent in all three rules in this
package. Fixing it required unwrapping tagged templates for `String.raw` ONLY —
unwrapping every tag would report `sql`…`` from postgres.js and slonik, which
bind every interpolation as a parameter and are the safest clients available.
`safe/11` pins that boundary.
