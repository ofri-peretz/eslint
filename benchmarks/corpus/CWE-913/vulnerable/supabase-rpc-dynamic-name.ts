// CWE-913: Improper Control of Dynamically-Managed Code Resources — computed RPC name
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-09-09
// This MUST be detected
// `.rpc(name)` executes a Postgres function by name over PostgREST. When the
// name is caller-supplied, the caller chooses which function runs — and a
// project's exposed schema routinely holds `delete_user` beside the intended one.
import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

export async function run(req) {
  return db.rpc(req.query.fn, req.body);
}
