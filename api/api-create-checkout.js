// api/create-checkout.js
// Called when user clicks "Start free trial" — redirects them to Stripe's payment page

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Replace these with your actual Price IDs from Stripe dashboard
// Stripe Dashboard → Products → Your product → Price ID (starts with price_)
const PLANS = {
  studio: process.env.STRIPE_PRICE_STUDIO,   // e.g. price_1ABC...
  agency: process.env.STRIPE_PRICE_AGENCY,   // e.g. price_1DEF...
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { plan, email } = req.body;

  if (!PLANS[plan]) {
    return res.status(400).json({ error: 'Invalid plan' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email || undefined,   // pre-fills email if you have it
      line_items: [
        {
          price: PLANS[plan],
          quantity: 1,
        },
      ],
      // Where to send the user after payment
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/#pricing`,

      // Collect billing address (helps with tax)
      billing_address_collection: 'auto',

      // Give them a 14-day free trial
      subscription_data: {
        trial_period_days: 14,
      },
    });

    // Send Stripe's checkout URL back to the browser
    res.status(200).json({ url: session.url });

  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: err.message });
  }
}
