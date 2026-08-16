/**
 * SAFE FOR THIS RULE - A `ws://` endpoint in a config map is not a constructor
 * argument. `no-insecure-websocket` owns it.
 */
export const SOCKETS = { live: 'ws://live.acme-corp.io/feed' };
