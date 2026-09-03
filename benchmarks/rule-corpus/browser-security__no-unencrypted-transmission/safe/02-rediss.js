/**
 * SAFE - `rediss://` is the TLS spelling.
 */
import { createClient } from 'redis';

export const cache = createClient({ url: 'rediss://cache.acme-corp.io:6379' });
