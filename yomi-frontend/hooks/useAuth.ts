import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [isPro, setIsPro] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true; // מונע עדכוני סטייט אחרי שהקומפוננטה נסגרת

    const fetchSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user || null;
        
        if (mounted) setUser(currentUser);

        if (currentUser) {
          // משיכת הפרופיל בזהירות
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_pro')
            .eq('user_id', currentUser.id)
            .single();

          if (mounted) setIsPro(profile?.is_pro === true);
        } else {
          if (mounted) setIsPro(false);
        }
      } catch (error) {
        console.error("Auth error:", error); // אם תהיה בעיה אמיתית, עכשיו נראה אותה!
      } finally {
        // החלק הכי חשוב: לא משנה מה קרה בדרך, תמיד תכבה את הטעינה!
        if (mounted) setLoading(false);
      }
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user || null;
      if (mounted) setUser(currentUser);

      if (currentUser) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_pro')
            .eq('user_id', currentUser.id)
            .single();

          if (mounted) setIsPro(profile?.is_pro === true);
        } catch (err) {
          // מתעלמים משגיאות שקטות כאן
        }
      } else {
        if (mounted) setIsPro(false);
      }
      
      // מכבה טעינה גם בשינוי מצב התחברות
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  return { user, isPro, loading };
}