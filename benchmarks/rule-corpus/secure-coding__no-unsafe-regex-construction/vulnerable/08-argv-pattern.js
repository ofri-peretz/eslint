/**
 * VULNERABLE - A CLI that compiles an argv value. Same sink, non-HTTP taint
 * root: `process.argv` is as attacker-controlled as a query string when the CLI
 * runs inside CI on a pull-request branch name.
 */
export function makeExcluder() {
  return new RegExp(process.argv[3], 'm');
}
