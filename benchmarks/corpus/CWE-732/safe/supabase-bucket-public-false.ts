// CWE-732: Safe — `public` present and explicitly false
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-09-09
// This MUST NOT be flagged
// The decoy for a rule that matched the `public` key rather than its value.
import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export async function setup() {
  await db.storage.createBucket('user-documents', {
    public: false,
    fileSizeLimit: 1024,
  });
}
