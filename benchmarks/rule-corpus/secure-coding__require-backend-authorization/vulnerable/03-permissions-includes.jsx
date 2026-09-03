/**
 * VULNERABLE - The same client-side gate, written the way permission systems
 * are actually written: a membership test against a permissions array rather
 * than an equality test against a role string. `Casbin`, `CASL`, Auth0 and
 * Clerk all produce this shape in the browser.
 */
import React from 'react';

import { useCurrentUser } from './useCurrentUser';

export function BillingSettings() {
  const currentUser = useCurrentUser();

  if (currentUser.permissions.includes('billing:write')) {
    return <button onClick={() => fetch('/api/billing/plan', { method: 'PUT' })}>Change plan</button>;
  }

  return null;
}
