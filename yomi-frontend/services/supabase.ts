import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing in environment variables.');
}

/**
 * Dynamically resolves the current browser origin (`http://localhost:3000` in local dev,
 * or the live Vercel domain in production) so OAuth / Auth redirects NEVER bounce
 * localhost sessions back to an old production URL.
 */
export function getAuthRedirectUrl(path: string = '/auth/callback'): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${window.location.origin}${cleanPath}`;
  }
  return path;
}

// יצירת הקליינט שישמש אותנו להתחברות והרשמה
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
