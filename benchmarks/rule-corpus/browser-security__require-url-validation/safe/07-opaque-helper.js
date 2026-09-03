/**
 * SAFE - The destination goes through a validator whose source we do not have.
 * A value passed INTO a function is not the value that comes back out.
 */
import { toSafeExternalUrl } from './urls';

window.open(toSafeExternalUrl(location.search));
