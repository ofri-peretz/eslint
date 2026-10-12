// CWE-287: Improper Authentication — fail-closed without reading `error`
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-12
// This MUST NOT be flagged
// On failure `data.user` is null, so the guard denies: the documented Supabase
// pattern. Formerly the vulnerable fixture; moved 2026-10-12.
import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

export async function requireUser() {
  const { data } = await db.auth.getUser();
  if (!data.user) throw new Error('not signed in');
  return data.user;
}
