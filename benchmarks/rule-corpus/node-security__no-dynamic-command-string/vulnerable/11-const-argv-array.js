/**
 * VULNERABLE (adversarial) - the argv vector is built one statement above the
 * call. Nothing about the injection changed; only the AST shape at the call
 * site did.
 */
import { spawnSync } from 'node:child_process';

export function killTree(pid) {
  const argv = ['-c', `pkill -TERM -P ${pid}`];
  return spawnSync('sh', argv, { encoding: 'utf8' });
}
