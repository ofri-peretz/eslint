/**
 * VULNERABLE - `execaCommand()` takes a WHOLE command line and, unlike execa's
 * array form and its tagged template, performs no escaping of interpolated
 * values. The repo URL is parsed as shell words.
 */
import { execaCommand } from 'execa';

export async function mirrorRepository(repoUrl, destination) {
  await execaCommand(`git clone --mirror ${repoUrl} ${destination}`, {
    stdio: 'inherit',
  });
}
