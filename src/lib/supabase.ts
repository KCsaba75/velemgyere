import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://ygdvpnxtxdnueoizltzk.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnZHZwbnh0eGRudWVvaXpsdHprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxMzIyODUsImV4cCI6MjEwNzcwODI4NX0.HaRHhVqmTKmAIzwnZTMVNCuZEmKUGPyBwpoaTALRWR4';

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) || DEFAULT_SUPABASE_ANON_KEY;

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

// supabase-js functions.invoke() throws FunctionsHttpError on a non-2xx
// response WITHOUT parsing the body -- `data` comes back null, the JSON
// error our edge functions send (e.g. {"error": "..."}) only lives on
// `error.context` (the raw Response). Call this to surface it instead of a
// generic fallback string.
export async function extractFunctionErrorMessage(error: unknown, fallback: string): Promise<string> {
  const context = (error as { context?: unknown } | null)?.context;
  if (context && typeof (context as Response).json === 'function') {
    try {
      const body = await (context as Response).json();
      if (body && typeof body.error === 'string') return body.error;
    } catch {
      // nem JSON valasz -- esik a fallback-re
    }
  }
  return fallback;
}
