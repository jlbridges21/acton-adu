import { createClient } from "@supabase/supabase-js";

/**
 * Supabase connection — credentials come from your local .env file.
 * Never commit real keys; copy .env.example to .env and fill in values.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key",
);
