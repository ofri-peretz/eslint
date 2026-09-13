// CWE-287: Improper Authentication — the auth error is never read
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-09-09
// This MUST be detected
// `getUser()` reports a missing, expired or forged token by RETURNING `error`,
// not by throwing. Destructuring only `data` makes an auth failure and an
// anonymous request indistinguishable: `user` is null on both paths.
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
