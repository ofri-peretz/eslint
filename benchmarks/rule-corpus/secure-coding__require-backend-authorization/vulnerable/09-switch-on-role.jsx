/**
 * VULNERABLE - ADVERSARIAL. The client-side authorisation decision is a
 * `switch`, not an `if`. This is the normal way to fan a role out to more than
 * two destinations, and the enforcement is exactly as client-side as fixture 01.
 */
import React from 'react';

import { AdminHome } from './AdminHome';
import { BillingHome } from './BillingHome';
import { MemberHome } from './MemberHome';
import { useSession } from './useSession';

export function Home() {
  const { user } = useSession();

  switch (user.role) {
    case 'admin':
      return <AdminHome />;
    case 'billing':
      return <BillingHome />;
    default:
      return <MemberHome />;
  }
}
