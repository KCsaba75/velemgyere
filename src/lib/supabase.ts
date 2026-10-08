import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://ovzhrecxshroinnfqkxl.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92emhyZWN4c2hyb2lubmZxa3hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMjA2MDcsImV4cCI6MjEwNjY5NjYwN30.-z6lDZGSGBeItBAVM5SxmHBWn2qwjrkhGOZHAi75d3E';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('placeholder') &&
  !supabaseUrl.includes('example.com')
);

// Fallback dummy client if no Supabase credentials provided, to prevent crashes
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://mock-velemgyere.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy');

