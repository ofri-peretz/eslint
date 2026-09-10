// CWE-287: Safe — the whole result is kept, so nothing was omitted
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-09-09
// This MUST NOT be flagged
// The decoy for a rule that keyed on "an auth call whose error is not checked
// on the next line" rather than on what the declaration actually binds.
import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

export async function requireUser() {
  const result = await db.auth.getUser();
  if (result.error) throw result.error;
  return result.data.user;
}
