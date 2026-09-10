// CWE-732: Safe — private bucket, access handed out per object
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-09-09
// This MUST NOT be flagged
import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export async function setup() {
  await db.storage.createBucket('user-documents');
}

export async function link(path: string) {
  return db.storage.from('user-documents').createSignedUrl(path, 60);
}
