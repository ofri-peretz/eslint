/**
 * VULNERABLE - The page-view fires on mount, before any banner has been shown.
 */
import { useEffect } from 'react';

export function PricingPage() {
  useEffect(() => {
    analytics.page('Pricing');
  }, []);
  return <h1>Pricing</h1>;
}
