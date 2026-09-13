// CWE-913: Safe — branch to a literal call rather than computing the name
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-09-09
// This MUST NOT be flagged
// The allowlist form (`const fn = FN[kind]; db.rpc(fn)`) is also safe but IS
// reported — see the rule's Known limitation. This is the shape that satisfies
// both the rule and the reader.
import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

export async function query(kind: 'profile' | 'orders', id: string) {
  if (kind === 'profile') return db.rpc('get_user_profile', { id });
  return db.rpc('get_user_orders', { id });
}
