/**
 * SAFE - execa's array form escapes nothing because there is nothing to escape:
 * `repoUrl` is one argv element, never re-parsed as a command line.
 */
import { execa } from 'execa';

export async function mirrorRepository(repoUrl, destination) {
  await execa('git', ['clone', '--mirror', repoUrl, destination], {
    stdio: 'inherit',
  });
}
