/**
 * SAFE - a non-cryptographic `random` on a completely different receiver, used
 * for UI jitter. Nothing here derives a secret.
 */
import _ from 'lodash';

export const retryDelay = (attempt) => 2 ** attempt * 100 + _.random(0, 250);
