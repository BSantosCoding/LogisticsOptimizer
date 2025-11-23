
import { createClient } from '@supabase/supabase-js';

// ====================================================================================
// HOW TO GET YOUR KEYS:
// 1. Go to https://supabase.com/dashboard
// 2. Select your project -> Settings (Cog Icon) -> API
// 3. Copy "Project URL" and paste it into SUPABASE_URL below
// 4. Copy "anon public" key and paste it into SUPABASE_ANON_KEY below
//    (DO NOT USE the service_role/secret key!)
// ====================================================================================

// Read from environment variables
const SUPABASE_URL: string = import.meta.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY: string = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// This helper checks if environment variables are set
export const isConfigured =
  SUPABASE_URL !== '' &&
  SUPABASE_ANON_KEY !== '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
