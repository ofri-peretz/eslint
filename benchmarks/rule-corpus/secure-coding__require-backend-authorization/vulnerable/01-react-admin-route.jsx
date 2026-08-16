/**
 * VULNERABLE - CWE-602 in its textbook form. A React route component decides,
 * in the browser, whether the caller is an admin. The decision is made from a
 * value the browser already holds, so a user who edits it in devtools gets the
 * panel and the endpoints behind it.
 */
import React from 'react';

import { AdminPanel } from './AdminPanel';
import { useSession } from './useSession';

export function AdminRoute() {
  const { user } = useSession();

  if (user.role === 'admin') {
    return <AdminPanel />;
  }

  return <p>Not authorised.</p>;
}
