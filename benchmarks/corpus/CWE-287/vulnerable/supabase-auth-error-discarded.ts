// CWE-287: Improper Authentication — the auth result trusted through its container
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-12
// This MUST be detected
// `getUser()` reports a missing, expired or forged token by RETURNING
// `{ data: { user: null }, error }`, not by throwing. `data` is an object on
// that path too, so branching on `data` grants the signed-in path to a failed
// authentication. (Revised 2026-10-12: the previous fixture guarded
// `data.user`, which is fail-closed and now lives in safe/.)
import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

export async function dashboardRoute() {
  const { data } = await db.auth.getUser();
  if (data) return 'dashboard';
  return 'login';
}
