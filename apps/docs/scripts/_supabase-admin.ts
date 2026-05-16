import { createClient, type SupabaseClient } from '@supabase/supabase-js';

if (process.env.VERCEL) {
  throw new Error('_supabase-admin.ts must never load inside a Vercel runtime — service-role key would leak.');
}

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url) throw new Error('SUPABASE_URL is not set');
if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');

export const supabaseAdmin: SupabaseClient = createClient(url, serviceKey, {
  auth: { persistSession: false },
});
