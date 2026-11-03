/**
 * `node:fs` globSync with the four options this repo used from the `glob`
 * package: `cwd`, `absolute`, `nodir`, `ignore`.
 *
 * Node 24's built-in glob has no `absolute`/`nodir` and calls `ignore`
 * `exclude`; everything else (braces, `**`, trailing `/` for directories)
 * behaves the same for the patterns in this repo. Results are sorted, so a
 * caller never depends on filesystem order.
 */
import { globSync as nodeGlobSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

export interface GlobOptions {
  cwd?: string;
  /** Return absolute paths instead of paths relative to `cwd`. */
  absolute?: boolean;
  /** Drop directories from the result. */
  nodir?: boolean;
  ignore?: string | readonly string[];
}

export function globSync(
  pattern: string,
  {
    cwd = process.cwd(),
    absolute = false,
    nodir = false,
    ignore = [],
  }: GlobOptions = {},
): string[] {
  const exclude = typeof ignore === 'string' ? [ignore] : [...ignore];
  return nodeGlobSync(pattern, { cwd, exclude })
    .filter((p) => !nodir || !statSync(resolve(cwd, p)).isDirectory())
    .map((p) => (absolute ? resolve(cwd, p) : p))
    .sort();
}
