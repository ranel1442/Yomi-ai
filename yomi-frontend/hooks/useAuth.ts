import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  // 🌟 משתנה חדש ששומר את סטטוס הפרו של המשתמש
  const [isPro, setIsPro] = useState<boolean>(false); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // משיכת המשתמש והפרופיל הראשוני מיד כשהעמוד עולה
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user || null;
      setUser(currentUser);

      // 🌟 אם יש משתמש מחובר, מושכים את סטטוס הפרו שלו מהטבלה החדשה!
      if (currentUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_pro')
          .eq('user_id', currentUser.id)
          .single();
        
        setIsPro(profile?.is_pro === true);
      } else {
        setIsPro(false);
      }
      
      setLoading(false);
    };
    
    fetchSession();

    // האזנה אקטיבית לשינויי מצב
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      
      // 🌟 מעדכנים את סטטוס הפרו גם כשהמשתמש מתחבר/מתנתק
      if (currentUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_pro')
          .eq('user_id', currentUser.id)
          .single();
        
        setIsPro(profile?.is_pro === true);
      } else {
        setIsPro(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 🌟 עכשיו ה-hook מחזיר גם את isPro לכל האתר!
  return { user, isPro, loading };
}