import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

const ENV_ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [isPro, setIsPro] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const resolveEntitlements = async (currentUser: any) => {
      if (!currentUser) {
        if (mounted) {
          setIsPro(false);
          setIsAdmin(false);
        }
        return;
      }

      const emailIsAdmin = Boolean(
        currentUser.email && ENV_ADMIN_EMAILS.includes(currentUser.email.toLowerCase())
      );

      let profile: { is_pro?: boolean; is_admin?: boolean } | null = null;

      // Primary source of truth: `profiles` table (`is_pro`, `is_admin`)
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('is_pro, is_admin')
        .eq('user_id', currentUser.id)
        .limit(1);

      if (profileError && profileError.message?.includes('is_admin')) {
        // Fallback if SQL migration adding `is_admin` hasn't been executed yet
        const { data: fallbackProfiles } = await supabase
          .from('profiles')
          .select('is_pro')
          .eq('user_id', currentUser.id)
          .limit(1);
        profile = fallbackProfiles && fallbackProfiles.length > 0 ? fallbackProfiles[0] : null;
      } else if (!profileError) {
        profile = profiles && profiles.length > 0 ? profiles[0] : null;
      } else {
        console.error('Profile Error:', profileError);
      }

      const resolvedIsAdmin = Boolean(profile?.is_admin === true || emailIsAdmin);
      const resolvedIsPro = Boolean(profile?.is_pro === true || resolvedIsAdmin);

      if (mounted) {
        setIsAdmin(resolvedIsAdmin);
        setIsPro(resolvedIsPro);
      }
    };

    const fetchSession = async () => {
      try {
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          const oauthCode = url.searchParams.get('code');
          if (oauthCode && !url.pathname.startsWith('/auth/callback')) {
            await supabase.auth.exchangeCodeForSession(oauthCode).catch(() => null);
            url.searchParams.delete('code');
            window.history.replaceState({}, '', url.pathname + url.search + url.hash);
          }
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        const currentUser = session?.user || null;
        if (mounted) setUser(currentUser);

        await resolveEntitlements(currentUser);
      } catch (error) {
        console.error('Critical Auth Error:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user || null;
      if (mounted) setUser(nextUser);
      resolveEntitlements(nextUser);
    });

    const fallbackTimeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 3000);

    return () => {
      mounted = false;
      clearTimeout(fallbackTimeout);
      subscription?.unsubscribe();
    };
  }, []);

  return { user, isPro, isAdmin, loading };
}
