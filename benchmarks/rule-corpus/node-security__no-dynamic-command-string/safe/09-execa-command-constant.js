/**
 * SAFE - `execaCommand` with a fully written-out command line. The API is
 * unescaped, but there is no interpolation to escape.
 */
import { execaCommand } from 'execa';

export async function porcelainStatus(cwd) {
  const { stdout } = await execaCommand('git status --porcelain', { cwd });
  return stdout.split('\n').filter(Boolean);
}
