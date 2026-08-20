/**
 * SAFE - A supervisor loop driven by a state flag that the body clears. This is
 * how every worker, poller and game loop is written, and the flag is why it
 * terminates rather than a reason to suspect it does not.
 */
import { drainOnce, shouldKeepRunning } from '../lib/worker.js';

export async function supervise() {
  let isActive = true;
  while (isActive) {
    const drained = await drainOnce();
    isActive = drained > 0 && shouldKeepRunning();
  }
  return 'stopped';
}
