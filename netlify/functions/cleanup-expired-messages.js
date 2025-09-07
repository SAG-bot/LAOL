// netlify/functions/cleanup-expired-messages.js
import { createClient } from '@supabase/supabase-js';

export default async () => {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing Supabase env vars' }), { status: 500 });
  }

  const supabase = createClient(url, serviceKey);

  // Hard delete messages where expires_at <= now()
  const { error } = await supabase
    .from('messages')
    .delete()
    .lte('expires_at', new Date().toISOString());

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true, deleted_expired: true }), { status: 200 });
};