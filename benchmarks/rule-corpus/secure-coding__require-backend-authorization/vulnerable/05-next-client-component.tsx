/**
 * VULNERABLE - A Next.js client component. The `'use client'` directive is the
 * strongest machine-readable statement in the ecosystem that this file runs in
 * the browser, and the authorisation decision is made inside it.
 */
'use client';

import React from 'react';

import { useSession } from 'next-auth/react';

export function ImpersonateButton(): React.ReactElement | null {
  const { data: session } = useSession();

  if (session?.user.isAdmin) {
    return <button onClick={() => fetch('/api/impersonate', { method: 'POST' })}>Impersonate</button>;
  }

  return null;
}
