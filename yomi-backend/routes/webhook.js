const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

// 👑 יצירת חיבור "מנהל"
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('⚠️ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      
      // 1. הלקוח שילם! מתחילים מנוי.
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.client_reference_id; 
        const stripeCustomerId = session.customer;

        if (userId) {
          console.log(`💰 Payment successful for user ${userId}. Upgrading to PRO...`);
          
          // א. הפיכה ל-PRO במטא-דאטה (כדי שהפרונטאנד יזהה מיד)
          await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { user_metadata: { is_pro: true, stripe_customer_id: stripeCustomerId } }
          );

          // ב. שמירת החיבור בטבלת הפרופילים כדי שנדע לזהות אותו בעתיד!
          await supabaseAdmin.from('profiles').upsert([
            { user_id: userId, stripe_customer_id: stripeCustomerId }
          ]);

          console.log('✅ User upgraded to PRO and saved to profiles successfully!');
        }
        break;
      }

      // 2. המנוי של הלקוח הסתיים סופית (נגמרה השנה ששילם עליה)
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const stripeCustomerId = subscription.customer;

        console.log(`❌ Subscription ended for Stripe Customer: ${stripeCustomerId}`);
        
        // א. מחפשים איזה משתמש זה לפי טבלת הפרופילים שיצרנו
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('user_id')
          .eq('stripe_customer_id', stripeCustomerId)
          .single();

        // ב. מצאנו את המשתמש? מורידים לו את ה-PRO!
        if (profile && profile.user_id) {
          console.log(`Found user ${profile.user_id}, removing PRO status...`);
          
          await supabaseAdmin.auth.admin.updateUserById(
            profile.user_id,
            { user_metadata: { is_pro: false, stripe_customer_id: stripeCustomerId } }
          );
          console.log('✅ PRO status removed successfully.');
        } else {
          console.log('⚠️ User not found in profiles table.');
        }
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Error processing webhook event:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;