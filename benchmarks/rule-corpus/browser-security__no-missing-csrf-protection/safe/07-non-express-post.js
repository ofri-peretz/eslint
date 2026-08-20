/** SAFE - `post` on a message bus. The receiver is not an Express app or
 *  router, so there is no route and no middleware slot. */
import { channel } from './bus';

export function announce(event) {
  channel.post('analytics.events', { type: event, at: Date.now() });
}
