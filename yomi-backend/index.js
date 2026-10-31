const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// הגדרת חיבור לסופהבייס כדי שהוובהוק יוכל לעדכן משתמשים
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const storiesRoutes = require('./routes/stories');
const audioRoutes = require('./routes/audio');
const flashcardsRoutes = require('./routes/flashcards');
const songsRouter = require('./routes/songs');
const analyzeRoutes = require('./routes/analyze');
const dialoguesRoutes = require('./routes/dialogues');
const importerRoutes = require('./routes/importer');
const trainerRoutes = require('./routes/trainer');

const app = express();

app.use(cors());

// =========================================================================
// 🌟 הוובהוק של Lemon Squeezy (חייב להיות לפני express.json!)
// =========================================================================
app.post('/api/webhook/lemonsqueezy', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
    const hmac = crypto.createHmac('sha256', secret);
    const digest = Buffer.from(hmac.update(req.body).digest('hex'), 'utf8');
    const signature = Buffer.from(req.get('X-Signature') || '', 'utf8');

    // אימות חתימה לוודא שהבקשה אכן הגיעה מ-Lemon Squeezy
    if (!crypto.timingSafeEqual(digest, signature)) {
      console.log('❌ חתימה לא תקינה');
      return res.status(401).send('Invalid signature');
    }

    const payload = JSON.parse(req.body);
    const eventName = payload.meta.event_name;
    
    // שליפת מזהה המשתמש שהעברנו מהפרונטאנד בקישור התשלום
    const userId = payload.meta.custom_data?.user_id;

    if (!userId) {
      console.log('⚠️ לא נמצא מזהה משתמש בבקשה');
      return res.status(400).send('No user_id found');
    }

    console.log(`✅ התקבל אירוע ${eventName} עבור משתמש ${userId}`);

    // טיפול באירועי יצירת מנוי או עדכון מנוי
    if (eventName === 'subscription_created' || eventName === 'subscription_updated') {
      const status = payload.data.attributes.status; 
      const isPro = status === 'active' || status === 'on_trial';

      let updateQuery = supabase
        .from('profiles')
        .update({ is_pro: isPro })
        .eq('user_id', userId);

      // Never downgrade an admin account via webhook status changes
      if (!isPro) {
        updateQuery = updateQuery.eq('is_admin', false);
      }

      const { error } = await updateQuery;
        
      if (error) {
        console.error('❌ שגיאה בעדכון סופהבייס:', error);
        throw error;
      }
      console.log(`👑 משתמש ${userId} עודכן לסטטוס PRO: ${isPro}`);
    }

    // 🌟 הוספנו: טיפול בפקיעת מנוי או ביטול סופי (לעולם לא משנמך משתמש עם is_admin = true)
    if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
      const { error } = await supabase
        .from('profiles')
        .update({ is_pro: false }) // מחזירים למשתמש חינמי (אלא אם הוא Admin)
        .eq('user_id', userId)
        .eq('is_admin', false);
        
      if (error) {
        console.error('❌ שגיאה בהסרת סטטוס PRO:', error);
        throw error;
      }
      console.log(`🔻 עובד אירוע פקיעת/ביטול מנוי עבור משתמש ${userId} (חשבונות Admin מוגנים)`);
    }

    res.status(200).send('Webhook processed successfully');
  } catch (error) {
    console.error('❌ שגיאת שרת בוובהוק:', error.message);
    res.status(500).send('Webhook error');
  }
});

// =========================================================================
// שאר הראוטים הרגילים של המערכת
// =========================================================================
app.use(express.json({ limit: '2mb' }));

app.use('/api/stories', storiesRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/flashcards', flashcardsRoutes);
app.use('/api/songs', songsRouter);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/dialogues', dialoguesRoutes);
app.use('/api/importer', importerRoutes);
app.use('/api/trainer', trainerRoutes);

app.get('/', (req, res) => {
  res.send('Yomi-AI Backend is running smoothly with Lemon Squeezy!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});