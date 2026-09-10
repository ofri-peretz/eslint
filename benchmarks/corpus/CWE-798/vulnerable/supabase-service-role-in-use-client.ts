// CWE-798: Hardcoded Credentials — service_role read inside a client component
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-09-09
// This MUST be detected
// Anything a `"use client"` module reads ships to the browser with it.
'use client';
import { createClient } from '@supabase/supabase-js';

export const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
