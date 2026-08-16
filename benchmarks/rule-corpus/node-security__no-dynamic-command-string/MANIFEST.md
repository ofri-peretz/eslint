# Rule corpus — `node-security/no-dynamic-command-string` (CWE-77)

Written from CWE-77 semantics and real Node idiom, **not** from the rule's own
test file. The point is independent evidence: a corpus derived from the tests
can only re-derive what the author already thought of.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet.

The sink family is "a string that a shell re-parses as a command line": an
interpreter invoked with a command flag (`bash -c`, `cmd /C`, `powershell
-Command`), or a library entry point that takes a whole command line and does
not escape it (`execaCommand`, `` $.raw`…` ``).

## Wave 1 — the shapes a maintainer would think of

| Fixture | Shape |
|---|---|
| `vulnerable/01-express-bash-c.js` | Express route → `spawn('bash', ['-c', \`convert ${file}\`])`, CJS require |
| `vulnerable/02-node-prefix-sh.js` | `node:child_process` + `sh -c` with `+` concatenation |
| `vulnerable/03-namespace-abs-path.js` | namespace import `cp.spawn`, absolute `/usr/bin/zsh` |
| `vulnerable/04-execa-command.js` | `execaCommand(\`git clone ${url}\`)` — unescaped command line |
| `vulnerable/05-zx-raw-tagged.js` | `` $.raw`docker rm ${name}` `` — zx's documented no-escape tag |
| `vulnerable/06-powershell-command-flag.js` | `execFileSync('powershell.exe', ['-NoProfile','-Command', script])` |
| `vulnerable/07-cmd-exe-slash-c.js` | Windows `cmd.exe /C` |
| `vulnerable/08-ts-cast-argv.ts` | TypeScript: `req.query.target as string` into `bash -c` |
| `vulnerable/09-fake-sanitizer.js` | partial mitigation — a "sanitiser" that strips only `;` |
| `safe/01-execfile-argv.js` | the remediation: `execFile('convert', [...])`, no shell |
| `safe/02-shell-static-script.js` | `bash -c` with a command line written out in full |
| `safe/03-allowlist-argv.js` | allowlist table of `{bin, args}`; the request picks a key |
| `safe/04-execa-array-form.js` | execa's array form |
| `safe/05-zx-tagged-template.js` | plain `` $`…` `` — zx quotes interpolations |
| `safe/06-git-dash-c-is-config.js` | `git -c user.name=…` — `-c` is not universally a command flag |
| `safe/07-static-template-command.js` | template literal with no substitutions |
| `safe/08-mentions-shell-in-text.js` | `bash -c` / `execaCommand` only in a comment and a string |
| `safe/09-execa-command-constant.js` | `execaCommand('git status --porcelain')` |
| `safe/10-docker-dash-c-not-shell.js` | `docker run -c <cpu-shares>` — dynamic value after a `-c`, no interpreter |

Wave 1 scored **100% F1** (9 TP / 0 FP / 0 FN), which is exactly why wave 2 exists.

## Wave 2 — adversarial

Written to break the rule, not to confirm it. Took the score from 100% to
**66.7% F1** (9 TP / 2 FP / 7 FN).

| Fixture | Attack |
|---|---|
| `vulnerable/10-const-shell-path.js` | interpreter path behind a `const` |
| `vulnerable/11-const-argv-array.js` | argv vector hoisted one statement up |
| `vulnerable/12-clustered-login-flag.js` | `bash -lc` — clustered POSIX options |
| `vulnerable/13-execa-shell-argv.js` | `execa('bash', ['-c', …])` — the "safe" API pointed at a shell |
| `vulnerable/14-sudo-wraps-shell.js` | the shell is inside argv, not argv[0] |
| `vulnerable/15-docker-exec-sh-c.js` | `docker exec … sh -c <line>` |
| `vulnerable/16-promisified-execfile.js` | `const run = promisify(execFile)` |
| `safe/11-const-script-alias.js` | a command line hoisted to a module constant |
| `safe/12-script-table-member.js` | `const SCRIPTS = Object.freeze({…}); SCRIPTS.build` |
| `safe/13-dynamic-options-static-command.js` | everything dynamic is in the options object |
| `safe/14-bash-runs-a-script-file.js` | `bash <file>` — no command flag, nothing re-parsed |
| `safe/15-interpolated-argv-element.js` | interpolation into a jq filter — an argv element, not a command line |
| `safe/16-shell-names-as-data.js` | `bash`/`zsh` as apt-get argv data, with an unrelated `-c` |

## What this corpus proved

Seven false negatives and two false positives, all fixed structurally
(`packages/eslint-plugin-node-security/src/rules/no-dynamic-command-string/index.ts`),
each locked by a regression case that fails on the unfixed rule:

1. **Only a `Literal` could be the interpreter.** `const SHELL = '/bin/bash'`
   made the whole check inapplicable. Now resolved through the binding
   (`resolveConstantString`).
2. **Only an inline `ArrayExpression` could be the argv vector.** A vector
   built one line above the call was invisible. Now resolved via
   `constInitializerOf`.
3. **Command flags were matched as exact strings.** `-lc` and `-euc` are the
   same flag with the options clustered — the spelling CI runners use so that
   nvm/rbenv shims are on PATH. A POSIX-only cluster test (`/^-[a-zA-Z]*c$/`,
   `c` last because it consumes the next argument) now covers them, while
   `cmd`/PowerShell keep their exact sets.
4. **`execa` was not in the argv-function set.** Its array form is the API
   execa documents as safe, and it is safe *because no shell is involved* —
   `execa('bash', ['-c', line])` puts the escape hatch back and passes review.
5. **The shell had to be argv[0].** `sudo bash -c …` and
   `docker exec <id> sh -c …` are how provisioning and container tooling are
   normally written. The scan now also looks for a shell *inside* the vector,
   starting the flag search after it — which is what keeps `docker run -c
   <cpu-shares>` and `git -c user.name=…` quiet.
6. **A promisified binding was a different name.** `promisify(execFile)` is the
   form Node's own docs show.
7. **Every bare identifier in command position was reported.** That was a
   deliberate decision for *unverifiable* identifiers, but a `const` bound to a
   literal — or a property of a `const` object literal, including the
   `Object.freeze({…})` spelling — is verifiable, and hoisting command lines
   into a script table is ordinary style rather than obfuscation.

Not fixed, reported instead: `spawn('node', ['-e', src])` and
`spawn('python', ['-c', src])` are the same "an interpreter re-parses the next
argument" shape, but the consequence is CWE-94 code injection rather than
CWE-77 command injection, and the rule's message would be wrong for them.
