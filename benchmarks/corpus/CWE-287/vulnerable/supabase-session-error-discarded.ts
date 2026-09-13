// CWE-287: Improper Authentication — the same omission on getSession
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-09-09
// This MUST be detected
import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

export async function currentSession() {
  const { data } = await db.auth.getSession();
  return data.session;
}
