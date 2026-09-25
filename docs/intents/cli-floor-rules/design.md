# Design — the lint half of burgee's F3, O3 and P1

Intent: [`intent.md`](./intent.md). **Status:** review.

---

## Requirements

- **R1** One per-file model of the program (`src/utils/hosts.ts`) that every rule reads: the
  commands, their host, description, examples, handler, and whether each fact is present,
  absent or unreadable.
- **R2** A call counts only when its receiver resolves by binding to a host export: commander
  (`commander`, `@commander-js/extra-typings`, `burgee/commander`), yargs (`yargs`,
  `yargs/yargs`, `burgee/yargs`), burgee (`defineCommand`, `defineProgram`, `definePlugin`).
  A parameter annotated with the host's `Command` / `Argv` type counts; a computed destructuring
  key with a static string counts.
- **R3** `require-command-description` reports `absent` only; `unknown` abstains; hidden commands
  and dispatch-only roots are not reported.
- **R4** `require-command-example` reports a runnable command with no example, and an example
  command line containing a line break (yargs and burgee; commander's help text is prose).
- **R5** `no-console-in-command` reports global `console.*` lexically inside a proven handler.
- **R6** `no-prompt-without-flag` reports a prompt-library call (by import) inside a proven handler
  that no guard reading the handler's inputs makes skippable. `strict` only.

## Design

The model walks the file once (cached per `Program`), resolving receivers through
`resolveModuleBinding` and a chain of `this`-returning methods. yargs registrations are found in
passes, so a command registered inside a builder is attributed once its parent's builder is
known. Facts are ranked (present > unknown > absent) so visit order cannot change a verdict.

`no-prompt-without-flag` reads "backed by a flag" structurally: the prompt is the right operand of
`??`/`||`, inside an `if`/conditional, after an exiting `if`, or a destructuring default, where the
guarding expression reads a handler parameter, a name destructured from one, `this` in a
`function` handler, or `.opts()` on a proven command — or inquirer's prefill / `when`. It never
matches a result variable to an option by spelling.

## Verification

- `npm test -w eslint-plugin-cli-floor` — RuleTester suites per rule, `index.test.ts`, and
  `module-gate.lock.test.ts` (host imported but the receiver is something else → silent).
- Mutation: deleting each rule's decisive check, or the receiver-provenance check in `hosts.ts`,
  turns named cases red.

## Rejected alternatives

- **Rules in `eslint-plugin-operability`.** Its declared surface is `language` — "no external
  SDK" — and every rule here fires only when commander, yargs or burgee is installed. AGENTS.md's
  decisive test puts an SDK-gated rule in that SDK's own plugin.
- **Name-based anchors** (`.action(` anywhere), as burgee's original intent for this plugin
  proposed. That is the defect class this repository gates; provenance is used instead.
- **Matching the prompt's variable name to an option name** to prove a flag backs it — a
  name-inference verdict.
- **Checking commander `addHelpText` for single-line examples.** It is a prose block by design;
  the check would report every well-formatted help epilogue.

## Out of scope

- Following a handler, prompt or `console` call into a helper defined elsewhere, or reading a
  command declared in another file.
- The other rules burgee's intent lists (`require-json-output`, `exit-code-constant`,
  `env-option-documented`, …): D-124 moved only F3, O3 and P1.
- citty, oclif and cac idioms.
