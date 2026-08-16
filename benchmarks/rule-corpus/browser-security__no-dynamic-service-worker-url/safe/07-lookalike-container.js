/**
 * SAFE - ADVERSARIAL. A plugin host with its OWN `serviceWorker` field. The
 * property name matched; the receiver is what makes it the browser's container.
 */
import { pluginHost } from './plugin-host';

const { serviceWorker } = pluginHost;

export function boot(descriptor) {
  serviceWorker.register(descriptor);
}
