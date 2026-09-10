// CWE-732: Incorrect Permission Assignment — an existing bucket flipped public
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-09-09
// This MUST be detected
import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export async function migrate() {
  await db.storage.updateBucket('invoices', { public: true });
}
