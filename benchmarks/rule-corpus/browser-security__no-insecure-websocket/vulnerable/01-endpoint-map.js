/**
 * VULNERABLE - An endpoint table. Nothing constructs a socket in this file,
 * which is exactly why the constructor rule cannot see it.
 */
export const SOCKETS = {
  live: 'ws://live.acme-corp.io/feed',
  presence: 'wss://presence.acme-corp.io',
};
