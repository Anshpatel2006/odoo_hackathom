const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_KEY in environment variables');
}
if (!supabaseServiceKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in environment variables — required for write operations');
}

// Client for general use (respects RLS) — use for SELECT operations
const supabase = createClient(supabaseUrl, supabaseKey);

// Admin client ( service role key) — bypasses RLS for server-side writes
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log('[Supabase] Clients initialized. Admin key role:', supabaseServiceKey ? 'service_role ✓' : 'MISSING ✗');

module.exports = {
  supabase,
  supabaseAdmin
};
