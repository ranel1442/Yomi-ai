import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [isPro, setIsPro] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    console.log("1. useAuth Started");

    const fetchSession = async () => {
      try {
        console.log("2. Fetching session from Supabase...");
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        const currentUser = session?.user || null;
        console.log("3. Current user identified:", currentUser?.id || "No user");
        
        if (mounted) setUser(currentUser);

        if (currentUser) {
          console.log("4. Fetching PRO status from profiles table...");
          const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('is_pro')
            .eq('user_id', currentUser.id);

          if (profileError) {
            console.error("Profile Error:", profileError);
          }

          // התיקון פה: עטפנו ב-Boolean() כדי שתמיד נקבל אמת או שקר מוחלטים
          const isUserPro = Boolean(profiles && profiles.length > 0 && profiles[0].is_pro === true);
          console.log("5. Is user PRO status:", isUserPro);
          
          if (mounted) setIsPro(isUserPro);
        } else {
          if (mounted) setIsPro(false);
        }
      } catch (error) {
        console.error("6. Critical Auth Error:", error);
      } finally {
        console.log("7. Shutting down loader");
        if (mounted) setLoading(false);
      }
    };

    fetchSession();

    // מאזין לשינויים
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("Auth event triggered:", _event);
      if (mounted) setUser(session?.user || null);
    });

    // כלי נשק סודי: מכבה את הלואדר בכוח אחרי 3 שניות אם משהו נתקע!
    const fallbackTimeout = setTimeout(() => {
      console.log("8. Fallback Timeout Triggered!");
      if (mounted) setLoading(false);
    }, 3000);

    return () => {
      mounted = false;
      clearTimeout(fallbackTimeout);
      subscription?.unsubscribe();
    };
  }, []);

  return { user, isPro, loading };
}