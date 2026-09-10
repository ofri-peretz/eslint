// CWE-287: Safe — the error is taken and acted on
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-09-09
// This MUST NOT be flagged
import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

export async function requireUser() {
  const { data, error } = await db.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('not signed in');
  return data.user;
}
