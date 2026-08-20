/**
 * SAFE - A real cookie-consent gate: the tracker initialises only inside the
 * branch where the consent manager reported analytics consent.
 */
import { useEffect } from 'react';

export function Analytics({ consent }) {
  useEffect(() => {
    if (consent.analyticsAllowed) {
      analytics.page(window.location.pathname);
    }
  }, [consent.analyticsAllowed]);
  return null;
}
