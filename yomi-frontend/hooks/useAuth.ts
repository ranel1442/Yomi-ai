import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // משיכת המשתמש הראשוני מיד כשהעמוד עולה
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setLoading(false);
    };
    fetchSession();

    // האזנה אקטיבית לשינויי מצב (אם המשתמש מתחבר או מתנתק)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
