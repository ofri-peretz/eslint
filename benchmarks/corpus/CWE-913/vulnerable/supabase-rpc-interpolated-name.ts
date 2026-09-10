// CWE-913: Improper Control of Dynamically-Managed Code Resources — interpolated RPC name
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-09-09
// This MUST be detected
import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

export async function fetchFor(kind: string) {
  return db.rpc(`get_${kind}`, {});
}
