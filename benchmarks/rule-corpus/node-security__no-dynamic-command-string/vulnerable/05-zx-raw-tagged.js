/**
 * VULNERABLE - `$.raw` is zx's documented escape hatch: it is the ONE tag that
 * does not quote interpolated values. Container names come from the API payload.
 */
import { $ } from 'zx';

export async function reapContainers(names) {
  for (const name of names) {
    await $.raw`docker rm --force ${name}`;
  }
}
