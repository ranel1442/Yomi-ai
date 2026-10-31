import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export function useStreak(user: any) {
  const [streak, setStreak] = useState(0);
  const [justUpdated, setJustUpdated] = useState(false);

  useEffect(() => {
    if (!user) return;

    const checkAndUpdateStreak = async () => {
      // מקבלים את התאריך של היום בפורמט YYYY-MM-DD
      const today = new Date().toISOString().split('T')[0];
      const metadata = user.user_metadata || {};
      const lastLogin = metadata.last_login_date;
      let currentStreak = metadata.current_streak || 0;

      // אם הוא כבר נכנס היום, אין מה לעדכן (רק נציג את הרצף הקיים)
      if (lastLogin === today) {
        setStreak(currentStreak);
        return;
      }

      // חישוב הרצף החדש
      if (lastLogin) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastLogin === yesterdayStr) {
          // נכנס אתמול? מגדילים את הרצף!
          currentStreak += 1;
        } else {
          // פספס יום? מאפסים את הרצף
          currentStreak = 1;
        }
      } else {
        // פעם ראשונה אי פעם
        currentStreak = 1;
      }

      // מעדכנים את מסד הנתונים של Supabase עם הנתונים החדשים
      await supabase.auth.updateUser({
        data: { current_streak: currentStreak, last_login_date: today }
      });

      setStreak(currentStreak);
      setJustUpdated(true); // מדליק את הפופ-אפ!
    };

    checkAndUpdateStreak();
  }, [user]);

  return { streak, justUpdated, setJustUpdated };
}