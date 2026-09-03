/**
 * SAFE - a template literal with no substitutions is just a string written out
 * in full; backticks are a quoting style, not runtime assembly.
 */
import { spawnSync } from 'node:child_process';

export function diskUsage() {
  return spawnSync('sh', ['-c', `df -h | tail -n +2`], { encoding: 'utf8' });
}
