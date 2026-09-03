/**
 * VULNERABLE - Session data over an unencrypted cache protocol. `rediss://` is
 * the encrypted spelling and is one character away.
 */
import { createClient } from 'redis';

export const cache = createClient({ url: 'redis://cache.acme-corp.io:6379' });
