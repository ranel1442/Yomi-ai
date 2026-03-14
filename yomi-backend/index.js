const express = require('express');
const cors = require('cors');
require('dotenv').config();

const storiesRoutes = require('./routes/stories');
const audioRoutes = require('./routes/audio');
const flashcardsRoutes = require('./routes/flashcards'); // <--- ייבוא ראוטר הכרטיסיות
const webhookRoutes = require('./routes/webhook');  // <--- ייבוא ראוט ה-webhook החדש

const app = express();

app.use(cors());
app.use('/api/webhook', webhookRoutes); // <--- הוספת ראוט ה-webhook לפני כל שאר הראוטים
app.use(express.json());

app.use('/api/stories', storiesRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/flashcards', flashcardsRoutes); // <--- שימוש בראוטר הכרטיסיות

app.get('/', (req, res) => {
  res.send('Yomi-AI Backend is running!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});






// הוסף את השורה הזו למעלה איפה שכל שאר ה-require שלך
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    // הוספנו פה את ה-userEmail
    const { priceId, userId, userEmail } = req.body; 

    const session = await stripe.checkout.sessions.create({
      customer_email: userEmail, // 🌟 השורה החדשה שאומרת לסטרייפ מי הלקוח!
      payment_method_types: ['card'],
      allow_promotion_codes: true, // 🌟 השורה שמוסיפה את שדה הקופון!
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `http://localhost:3000/?success=true`,
      cancel_url: `http://localhost:3000/pricing?canceled=true`,
      client_reference_id: userId, 
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =========================================================================
// 🌟 הפונקציה החדשה שפותחת את אזור הניהול האישי של הלקוח בסטרייפ!
// =========================================================================
app.post('/api/create-portal-session', async (req, res) => {
  try {
    const { stripeCustomerId } = req.body;

    if (!stripeCustomerId) {
      return res.status(400).json({ error: 'Stripe Customer ID is missing' });
    }

    // יצירת קישור מאובטח לפורטל הניהול של סטרייפ
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: 'http://localhost:3000/pricing', // לאן הלקוח יחזור כשיסיים בפורטל
    });

    // מחזירים לפרונטאנד את הקישור לפורטל הלקוחות
    res.json({ url: portalSession.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: error.message });
  }
});