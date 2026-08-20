/**
 * VULNERABLE - One binding hop. The role comparison is lifted into a `const`
 * before the branch, which is what every linter-clean React codebase does. The
 * exposure is identical to fixture 01; only the statement boundary moved.
 */
import React from 'react';

import { ExportButton } from './ExportButton';
import { useSession } from './useSession';

export function MemberList() {
  const { user } = useSession();
  const canExport = user.role === 'owner';

  if (canExport) {
    return <ExportButton endpoint="/api/members/export" />;
  }

  return null;
}
