/**
 * VULNERABLE - A third-party realtime client. Not `new WebSocket`, so the
 * constructor rule declines it — and it is still a cleartext channel.
 */
import { ReconnectingSocket } from './reconnecting-socket';

export const socket = new ReconnectingSocket('ws://live.acme-corp.io/feed');
