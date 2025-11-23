
import { createClient } from '@supabase/supabase-js';

// ====================================================================================
// HOW TO GET YOUR KEYS:
// 1. Go to https://supabase.com/dashboard
// 2. Select your project -> Settings (Cog Icon) -> API
// 3. Copy "Project URL" and paste it into SUPABASE_URL below
// 4. Copy "anon public" key and paste it into SUPABASE_ANON_KEY below
//    (DO NOT USE the service_role/secret key!)
// ====================================================================================

// REPLACE THE VALUES INSIDE THE QUOTES BELOW
const SUPABASE_URL: string = 'https://jhlizehwrpfxlcrjoeqb.supabase.co';
const SUPABASE_ANON_KEY: string = 'sb_publishable_rh-XCh-Mo2McXBdkqwpc6Q_5DHHLLWM';

// This helper checks if you have replaced the placeholders
export const isConfigured = 
  SUPABASE_URL !== 'https://YOUR_PROJECT_ID.supabase.co' && 
  !SUPABASE_URL.includes('YOUR_PROJECT_ID') &&
  SUPABASE_ANON_KEY !== 'YOUR_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
