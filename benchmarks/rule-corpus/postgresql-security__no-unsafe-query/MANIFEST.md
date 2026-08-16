# Rule corpus - `postgresql-security/no-unsafe-query` (CWE-89)

The MIRROR of `secure-coding__no-sql-injection`: byte-for-byte the same eight
vulnerable shapes and six safe ones, with the local `../lib/db` import replaced
by a real `pg` import.

That swap is the whole point. `secure-coding/no-sql-injection` abstains in a
file that imports a driver, and this rule abstains in a file that does not, so
each corpus measures the half its rule OWNS. Scoring either plugin on the other
half measures the partition, not the rule.

## What the corpus proved

The rule scored **75.0% F1** (6 TP / 2 FP / 2 FN) against sonarjs' 61.5%.

Four defects, in both directions:

| | defect |
|---|---|
| FN | the sink set was `query` alone, so `db.execute('DELETE FROM …' + id)` walked past |
| FN | SQL assembled by a LOCAL builder was invisible — the sink saw a CallExpression, which is neither a concatenation nor a template |
| FP | `const TABLE = 'users'; db.query(`SELECT * FROM ${TABLE}`)` was an injection finding. Nothing there can change |
| FP | `analytics.query(`event:${req.query.name}`)` was reported because the METHOD shared a name with the pg sink |

## Adversarial wave

Written after the rule reached 100%. It found three more real defects:

- only a CONCISE arrow builder body was substituted, so every builder written
  the ordinary way — `function build(t) { return 'SELECT … ' + t; }` — stayed
  silent
- a `function` DECLARATION is a `FunctionName` definition with no initialiser,
  so it resolved to nothing at all
- `vulnerable/09-object-form` — node-postgres' documented `{ text, values }`
  config object. The SQL is interpolated exactly as in the string form, and only
  the first argument was ever read as a string. The identical gap was found
  independently on `no-transaction-on-pool`.

The rule's own coverage suite also caught the new SQL-shape gate costing recall
on `let q = 'SELECT 1'; q += ` AND id = ${id}``, so a bare projection with no
FROM clause is recognised too.
