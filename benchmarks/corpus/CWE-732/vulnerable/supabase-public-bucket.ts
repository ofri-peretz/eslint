// CWE-732: Incorrect Permission Assignment — storage bucket created public
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-09-09
// This MUST be detected
// A public bucket serves every object in it to anyone holding the URL: no
// session, no RLS check, no expiry. Object names are guessable far more often
// than teams expect — sequential ids, e-mail addresses, original filenames.
import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export async function setup() {
  await db.storage.createBucket('user-documents', { public: true });
}
