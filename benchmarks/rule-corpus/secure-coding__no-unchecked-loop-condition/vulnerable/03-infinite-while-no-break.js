/**
 * VULNERABLE - `while (true)` with no `break` anywhere in the body. The only
 * exits are a thrown error or the process dying.
 */
import { pollQueue } from '../lib/queue.js';

export async function drainQueue() {
  let processed = 0;
  while (true) {
    const message = await pollQueue();
    processed += message ? 1 : 0;
  }
}
