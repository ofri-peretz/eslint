# Rule corpus - `postgresql-security/no-select-all` (CWE-1049)

## What the rule owns

A **select list whose column set is decided by the schema rather than by the
query**. `SELECT *` and `SELECT u.*` both ship every column that happens to
exist today: the 40kB blob somebody adds next quarter, the `password_hash` the
next migration introduces, and the column ordering that an `INSERT INTO archive
SELECT *` will silently write into the wrong slot the day the two tables
diverge.

The remediation is an explicit column list.

## The defects this corpus exposed

The rule read **only a plain string `Literal`** and then pattern-matched the raw
text. Both halves were wrong:

- Multi-line SQL is a template literal, `query({ text, values })` is the
  documented config form, and a repository hoists its statements to module
  constants. All three were invisible — five of eight first-wave vulnerable
  fixtures.
- The raw text includes the comments and string literals inside it, so a star
  left behind in a `-- was: SELECT * …` comment reported, and an audit query
  searching *for* the text `'SELECT * FROM users'` reported.
- `SELECT u.*` — the form that actually appears in joins — was not matched at
  all, and `DISTINCT ON (...)` between the keyword and the star broke the match.

## What each fixture proves

| fixture | proves |
|---|---|
| `vulnerable/01` | the canonical `pool.query('SELECT * FROM users …')` |
| `vulnerable/02` | multi-line SQL as a template literal |
| `vulnerable/03` | the `{ text, values }` config object, typed |
| `vulnerable/04` | a table-qualified star in a join (`u.*`) |
| `vulnerable/05` | the star inside a CTE |
| `vulnerable/06` | lowercase keywords and irregular whitespace |
| `vulnerable/07` | the statement hoisted to a module constant (one binding hop) |
| `vulnerable/08` | `INSERT INTO … SELECT *` |
| `vulnerable/09` | `DISTINCT ON (...)` between the keyword and the star |
| `vulnerable/10` | a template literal **with** an interpolation |
| `vulnerable/11` | the config object with a **quoted** key |
| `vulnerable/12` | a qualified star after a `''`-escaped quote |
| `safe/01` | the remediation: an explicit column list |
| `safe/02` | `count(*)` — the star means rows, not columns |
| `safe/03` | `EXISTS (SELECT * …)` — a select list Postgres never evaluates |
| `safe/04` | `SELECT * FROM unnest(...)` — the batch-insert remediation |
| `safe/05` | a star left in a `--` comment |
| `safe/06` | a star inside a single-quoted literal, typed |
| `safe/07` | `quantity * unit_price` — the multiplication operator |
| `safe/08` | a star inside a `/* … */` block comment |
| `safe/09` | `json_to_recordset` / `generate_series` — set-returning functions |
| `safe/10` | a star in a LIKE pattern, and `pool.on(...)` — not the sink |
| `safe/11` | a literal containing **both** a `--` and a `*` |
| `safe/12` | an unbalanced apostrophe inside a `--` comment |
| `safe/13` | a dollar-quoted literal, alongside `$1` placeholders |

`safe/11` and `safe/12` are a matched pair and the reason the SQL is scanned in
one pass rather than by a chain of replaces. Strip comments before literals and
the `--` inside `'-- * --'` eats the rest of the statement; strip literals first
and the apostrophe in `don't` does the same. Neither order works.

## Judgement calls, and why

- **`count(*)` is not a finding.** The star there means "every row", not "every
  column"; Postgres reads no columns for it. It is the most common star in real
  SQL, so reporting it is the fastest way to get the rule switched off.
- **`EXISTS (SELECT *)` is not a finding.** Postgres documents that the select
  list of an EXISTS subquery is never evaluated — `SELECT *`, `SELECT 1` and
  `SELECT 1/0` all produce the same plan. There is no implicit column set to
  make explicit. An outer star in the same statement still reports
  (`vulnerable`-side proof: the lock test in `no-select-all.test.ts`).
- **A star in a subquery or CTE IS a finding.** Unlike EXISTS, a CTE is
  materialised with every column, so the cost and the schema coupling are
  identical to a top-level star.
- **A star over a set-returning function is not a finding.** In `SELECT * FROM
  unnest($1::int[], $2::text[])` and `SELECT * FROM json_to_recordset($1) AS
  x(sku text, cents int)` the shape is fixed by the call — by the function's
  signature or by the column-definition list right there — so schema drift
  cannot reach it. This generalises the hard-coded `unnest` exception the rule
  already carried, and `unnest` is the batch-insert remediation this plugin
  recommends in `no-batch-insert-loop`.
- **Migrations and admin scripts get no exemption.** There is no AST evidence
  that a file is a migration; the only signal is its path, and deciding a
  verdict from a path substring is name inference by another route. It also
  produced cwd-dependent verdicts the last time this ecosystem tried it.

[cwd]: the same file reporting differently from two directories

## Deliberately out of scope

- **A reassigned binding, a parameter, an alias, a built string.** What reaches
  the driver is not knowable, so the rule abstains rather than guessing.
- **`SELECT * FROM (SELECT …) x`** — a star over a derived table whose own
  select list is explicit. Not reported and not in the corpus.
- **A `SELECT *` inside a dollar-quoted function body.** The body is opaque text
  to the driver; the statement this file sends is a `CREATE FUNCTION`.

## Adversarial wave

Fixtures `vulnerable/09–12` and `safe/11–13` were written after the rule first
scored 100% on the first wave, specifically to break the new SQL scanner: the
two comment/literal ordering traps, dollar quoting against `$1` placeholders,
`DISTINCT ON`, the quoted config key, and a `''` escape sitting between the
scanner and a real finding. The rule held at **100%**. The scanner's
end-of-input paths (an unterminated comment, an unterminated dollar quote) are
locked in `no-select-all.test.ts` rather than the corpus, because a fixture of
malformed SQL is not code anybody writes.

## Score

| | TP | FP | FN | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|---:|
| before | 3 | 2 | 5 | 60.0% | 37.5% | 46.2% |
| after | 12 | 0 | 0 | 100% | 100% | **100%** |
