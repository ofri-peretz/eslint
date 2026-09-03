# Rule corpus - `postgresql-security/no-unsafe-copy-from` (CWE-73)

## What the rule owns

The SOURCE of a `COPY … FROM` statement.

`COPY t FROM '/path'` opens the file **on the database host, as the postgres OS
user** — not in the application process. A dynamic path is therefore an
arbitrary read of anything the database account can open, and
`COPY t FROM PROGRAM '…'` is a shell command on the same host, which is remote
code execution rather than a read.

Two findings, two severities:

- `dynamicPath` (CRITICAL) — the source cannot be proved constant
- `hardcodedPath` (MEDIUM) — the source is constant, but the server is still
  reading a file the application never saw. Suppressed with
  `allowHardcodedPaths` or `allowedPaths` for admin and migration scripts.

## The line this rule has to walk

`COPY` is a statement VERB and the corpus is built to force the rule to read it
as one, because the two-words-in-order test fails in both directions:

- `COPY (SELECT … FROM orders) TO '/srv/x.csv'` is an EXPORT. The `FROM` belongs
  to the subquery. (`safe/03`, `safe/10`)
- `SELECT * FROM jobs WHERE kind = 'copy' AND id IN (SELECT id FROM users …)`
  is not a COPY at all. (`safe/04`)
- A multi-line `COPY` — the way every migration writes it — is the same
  statement. (`vulnerable/06`, `vulnerable/08`)

The remediation is `COPY … FROM STDIN`: the bytes travel over the client
connection and the server opens nothing. Half the safe fixtures are STDIN in a
different spelling, because a rule that reports the fix is a rule nobody runs.

## What each fixture proves

| fixture | proves |
|---|---|
| `vulnerable/01` | a bulk-import route taking the path from the request body |
| `vulnerable/02` | `+` concatenation with hand-rolled quoting |
| `vulnerable/03` | `FROM PROGRAM` — a shell command, not a file read |
| `vulnerable/04` | TS: path through one binding, statement through another |
| `vulnerable/05` | a concise-arrow builder |
| `vulnerable/06` | a **multi-line** constant path (the `.`-vs-newline defect) |
| `vulnerable/07` | the `execute` spelling of the sink |
| `vulnerable/08` | lowercase keywords split across lines |
| `vulnerable/09` | `path.join(DIR, name)` — joining does not constrain |
| `vulnerable/10` | a block-bodied `function` builder returning a concatenation |
| `vulnerable/11` | **wave 2** `String.raw` |
| `vulnerable/12` | **wave 2** the COPY inside a `BEGIN; … COMMIT;` block |
| `vulnerable/13` | **wave 2** a column list in parens, then `FROM PROGRAM` |
| `vulnerable/14` | **wave 2** a safe default path overwritten from the request |
| `safe/01` | **the remediation** — `FROM STDIN` with pg-copy-streams |
| `safe/02` | a dynamic TABLE with a STDIN source — a different rule's finding |
| `safe/03` | `COPY (SELECT … FROM …) TO` — an export, not a read |
| `safe/04` | COPY and FROM as ordinary words in a SELECT |
| `safe/05` | lowercase STDIN split across lines |
| `safe/06` | a retired COPY left behind as a `--` comment |
| `safe/07` | the whole statement quoted as DATA in an INSERT |
| `safe/08` | a string that reads like SQL, handed to something that is not a sink |
| `safe/09` | **wave 2** the STDIN statement reached through a binding |
| `safe/10` | **wave 2** a COPY TO whose target query nests two paren levels |
| `safe/11` | **wave 2** a `sql` tagged template (postgres.js) |
| `safe/12` | **wave 2** a SELECT segment before the COPY segment |

Every fixture, safe and vulnerable, imports a PostgreSQL client.

## Deliberately out of scope

- **`COPY … TO`.** A write, a different direction, a different weakness.
  `safe/03` and `safe/10` pin it.
- **A dynamic TABLE name with a STDIN source.** That is identifier injection
  and it belongs to `no-unsafe-query`. This rule owns the SOURCE. `safe/02`
  pins the boundary; scoring both rules on the same fixture would measure the
  partition rather than either rule.
- **Where the path came from.** A constant path is still a server-side file
  read and is reported at MEDIUM. Whether that is acceptable is a project
  decision, which is what the two options are for.
- **`client.query(copyFrom('…'))`** — the pg-copy-streams wrapper. `copyFrom`
  is an import, so its body is not in this file and the rule does not guess at
  it. `safe/01` and `safe/05` carry the shape.

## Adversarial wave

Wave 1 (`vulnerable/07–10`, `safe/05–08`) held at 100% against the rewrite.
Wave 2 (`vulnerable/11–14`, `safe/09–12`) was written afterwards to break it and
found `String.raw` silent, the same defect the other two rules in this package
had. It also surfaced a second, quieter one while writing the locks: `staticText`
read `quasis[].value.raw`, so a template written with `\n` escapes carried a
literal backslash into the text and `^\s*COPY` failed on statements the server
reads as perfectly ordinary multi-line SQL. Both are locked in
`src/rules/no-unsafe-copy-from/regression.test.ts`.
