/**
 * SAFE - The destination goes through a helper. A value passed INTO a function
 * is not the value that comes back out, so the call result is opaque and the
 * rule must not claim to know its origin.
 */
import { toSafeRedirect } from './redirects';

window.location.href = toSafeRedirect(location.search);
