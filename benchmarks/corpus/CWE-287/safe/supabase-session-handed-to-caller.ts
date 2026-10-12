// CWE-287: Improper Authentication — the session handed to the caller
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-12
// This MUST NOT be flagged
// The session (null on failure) is returned; the caller makes the decision this
// function cannot see. Formerly a vulnerable fixture; moved 2026-10-12.
import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

export async function currentSession() {
  const { data } = await db.auth.getSession();
  return data.session;
}
