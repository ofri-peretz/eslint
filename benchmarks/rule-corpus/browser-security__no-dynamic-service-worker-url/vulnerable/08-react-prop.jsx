/**
 * VULNERABLE - A React shell that registers whatever path its props carry.
 */
import { useEffect } from 'react';

export function ServiceWorkerBoot({ swPath }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(swPath);
    }
  }, [swPath]);
  return null;
}
