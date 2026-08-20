/**
 * VULNERABLE (adversarial) - `promisify(execFile)` is the form Node's own docs
 * show. The binding is a plain const; only the call-site spelling changed.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

export async function archiveBucket(bucket) {
  const { stdout } = await run('bash', ['-c', `aws s3 sync s3://${bucket} ./backup`]);
  return stdout;
}
