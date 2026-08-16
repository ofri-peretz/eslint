/**
 * SAFE - The React shell, done correctly: a build-time constant, not a prop.
 */
import { useEffect } from 'react';

const SW_URL = '/service-worker.js';

export function ServiceWorkerBoot() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(SW_URL, { scope: '/' });
    }
  }, []);
  return null;
}
