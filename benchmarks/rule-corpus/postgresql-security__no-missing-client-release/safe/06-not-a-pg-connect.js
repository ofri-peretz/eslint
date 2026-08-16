/**
 * SAFE - `connect()` on things that are not PostgreSQL pools. A websocket and a
 * message broker both have one, and neither has a `release()` to call.
 */
import { Pool } from 'pg';
import { broker } from '../lib/broker';
import { WebSocket } from 'ws';

export const pool = new Pool();

export async function subscribe() {
  const channel = await broker.connect();
  const socket = await WebSocket.connect('wss://events.internal');
  return { channel, socket };
}
