/**
 * VULNERABLE - ADVERSARIAL. Identical client-side gate to fixture 01, written
 * with optional chaining because the session may not have loaded yet. Every
 * React codebase written after 2020 looks like this.
 */
import React from 'react';

import { DangerZone } from './DangerZone';
import { useSession } from './useSession';

export function WorkspaceSettings() {
  const { user } = useSession();

  if (user?.role === 'admin') {
    return <DangerZone />;
  }

  return null;
}
