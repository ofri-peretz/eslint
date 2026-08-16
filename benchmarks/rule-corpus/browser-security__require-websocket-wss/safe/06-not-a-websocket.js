/**
 * SAFE FOR THIS RULE - Not the WebSocket constructor. The cleartext URL is
 * still reported by `no-insecure-websocket`; the autofix this rule offers would
 * be wrong on an unknown constructor.
 */
import { ReconnectingSocket } from './reconnecting-socket';

export const socket = new ReconnectingSocket('ws://live.acme-corp.io/feed');
