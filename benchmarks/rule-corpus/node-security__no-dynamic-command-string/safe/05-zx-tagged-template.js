/**
 * SAFE - zx's plain `$` tag quotes every interpolated value. It is `$.raw`
 * that opts out; this is the form the library documents as the safe default.
 */
import { $ } from 'zx';

export async function reapContainers(names) {
  for (const name of names) {
    await $`docker rm --force ${name}`;
  }
}
