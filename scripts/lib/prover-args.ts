/**
 * argv handling for scripts/prove-locks.mts, kept out of the script so it can
 * be asserted without spawning the prover from inside a lock the prover runs.
 */

/** Reads `--flag=<value>` and the `--flag <value>` spelling the usage documents. */
export function readFlag(argv: string[], flag: string): string | undefined {
  const eq = argv.find((a) => a.startsWith(`${flag}=`));
  if (eq !== undefined) return eq.slice(flag.length + 1);
  const i = argv.indexOf(flag);
  return i === -1 ? undefined : argv[i + 1];
}

/**
 * `--update` banks the whole baseline, so it may never run against a subset:
 * `--file=x --update` would rewrite the file with x's result alone and drop
 * every other entry, which the shrink-only check would then read as progress.
 */
export function scopedUpdate(argv: string[]): boolean {
  return argv.includes('--update') && readFlag(argv, '--file') !== undefined;
}
