// CWE-287: Improper Authentication — the session used with no check at all
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-12
// This MUST be detected
// Neither `error` nor the session is checked: on a failed refresh the session
// is null and the request runs on with no identity behind it. (Revised
// 2026-10-12: the previous fixture returned the session to its caller, which
// decides — that shape now lives in safe/.)
import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

export async function myOrders() {
  const {
    data: { session },
  } = await db.auth.getSession();
  return db.from('orders').select().eq('user_id', session.user.id);
}
