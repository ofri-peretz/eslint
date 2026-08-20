/**
 * VULNERABLE - A cross-frame message body executed. postMessage has no eval rule
 * of its own, so the generic sink rule owns this site.
 */
import { useEffect } from 'react';

export function EmbedBridge() {
  useEffect(() => {
    window.addEventListener('message', (event) => {
      eval(event.data.command);
    });
  }, []);
  return null;
}
