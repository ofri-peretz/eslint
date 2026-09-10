// CWE-798: Safe — service_role in a module the client cannot reach
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-09-09
// This MUST NOT be flagged
// `server-only` makes the build fail if a client component imports this file,
// so reading the privileged key here is the correct thing to do.
import 'server-only';
import { createClient } from '@supabase/supabase-js';

export const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
