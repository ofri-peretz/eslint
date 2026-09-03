/**
 * VULNERABLE - ADVERSARIAL, FALSE-NEGATIVE DIRECTION. The same client-side
 * enforcement as fixture 01, with the claim named `accessLevel` instead of
 * `role`. `accessLevel`, `tier`, `scope`, `grants` and `capabilities` are all
 * ordinary names for exactly this field; nothing about the exposure depends on
 * which one a team picked.
 */
import React from 'react';

import { BillingExport } from './BillingExport';
import { useSession } from './useSession';

export function FinanceTab() {
  const { user } = useSession();

  if (user.accessLevel === 'FINANCE_ADMIN') {
    return <BillingExport endpoint="/api/billing/export" />;
  }

  return null;
}
