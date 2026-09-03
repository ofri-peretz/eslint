/**
 * SAFE - A Next.js route handler. It runs on the server, it verifies the
 * session server-side, and it returns 403 when the caller is not an owner.
 * Exactly what the rule asks for.
 */
import { NextResponse } from 'next/server';

import { getServerSession } from '../lib/auth';

export async function DELETE(request: Request) {
  const session = await getServerSession(request);

  if (session.user.role !== 'owner') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  return new NextResponse(null, { status: 204 });
}
