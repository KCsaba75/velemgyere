import { createClient } from '@supabase/supabase-js';

// Provided credentials with environment variable fallback
export const SUPABASE_URL = 
  import.meta.env.VITE_SUPABASE_URL || 'https://ovzhrecxshroinnfqkxl.supabase.co';

export const SUPABASE_ANON_KEY = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92emhyZWN4c2hyb2lubmZxa3hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMjA2MDcsImV4cCI6MjEwNjY5NjYwN30.-z6lDZGSGBeItBAVM5SxmHBWn2qwjrkhGOZHAi75d3E';

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && 
  SUPABASE_ANON_KEY && 
  !SUPABASE_URL.includes('placeholder')
);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
