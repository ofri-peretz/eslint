---
'eslint-plugin-node-security': patch
---

`detect-child-process` no longer reads `-c` as an eval flag for every binary.

`usesShell` treated any of `-c`, `-e`, `/c` in argv as proof that the next entry
is source text, whatever program was being run. But a flag only means what the
program parsing it says it means. Found on the 20-repository real-source corpus,
in n8n's `scripts/dev-up.mjs`:

```js
execFileSync('gh', ['codespace', 'ports', 'visibility', `${port}:org`, '-c', name])
```

`-c` there is gh's own `--codespace`. Every argv entry is a literal or a template
of literals, no shell is anywhere near it, and the rule reported CWE-78 command
injection at CVSS 9.8. Deciding by a token rather than by the program that parses
it is precisely what `lint:name-inference` exists to catch — committed by a
security rule.

Each binary now carries its OWN tokens, because a shared set is the same defect
one level up:

| | evaluates | does not |
|---|---|---|
| `php` | `-r` | `-e` — that is `--profile-info` |
| `deno` | `eval` (a subcommand) | `-e` — no such option |
| `node` / `bun` | `-e`, `--eval`, `-p`, `--print` | |
| `python` | `-c` | `-e` |
| `perl` | `-e`, `-E` | |
| `ruby`, `osascript` | `-e` | |

Shells are not in the table: a literal `sh`/`bash`/`cmd`/`powershell` command is
already treated as a shell before flags are consulted.

The gate only ever suppresses, and only when the command is a **literal** naming
a binary we can place. `execFileSync(bin, ['-c', name])` keeps the conservative
union, because an unnameable binary may well be a shell.

Real-source findings **7 → 5** over 21,394 files. `php -r`, `deno eval`,
`node -p` and `perl -E` now report where they previously did not.
