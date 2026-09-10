// CWE-798: Hardcoded Credentials — Supabase service_role key reaching the client
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-09-09
// This MUST be detected
// `service_role` bypasses Row Level Security entirely, and the NEXT_PUBLIC_
// prefix exists to inline the value into the browser bundle at build time.
import { createClient } from '@supabase/supabase-js';

export const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
);
