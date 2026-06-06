// api/stripe-webhook.js
// Stripe calls this URL automatically when a payment event happens
// Set this URL in: Stripe Dashboard → Developers → Webhooks → Add endpoint
// URL to add: https://yourdomain.com/api/stripe-webhook
// Events to listen for: checkout.session.completed, customer.subscription.deleted

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // use service key here (not public anon key)
);

export const config = {
  api: { bodyParser: false }  // IMPORTANT: Stripe needs raw body to verify signature
};

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET  // from Stripe Dashboard → Webhooks → Signing secret
    );
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ── PAYMENT SUCCEEDED ──────────────────────────────────────
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_email;
    const customerId = session.customer;

    // Figure out which plan they bought
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    const priceId = subscription.items.data[0].price.id;
    const plan = priceId === process.env.STRIPE_PRICE_AGENCY ? 'agency' : 'studio';

    // Upsert into your Supabase users table
    const { error } = await supabase
      .from('users')
      .upsert({
        email,
        plan,
        stripe_customer_id: customerId,
        stripe_subscription_id: session.subscription,
        plan_started_at: new Date().toISOString(),
        briefs_used: 0,
      }, { onConflict: 'email' });

    if (error) console.error('Supabase upsert error:', error);
    else console.log(`✅ Upgraded ${email} to ${plan}`);
  }

  // ── SUBSCRIPTION CANCELLED ─────────────────────────────────
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const customer = await stripe.customers.retrieve(subscription.customer);

    const { error } = await supabase
      .from('users')
      .update({ plan: 'free', briefs_used: 0 })
      .eq('email', customer.email);

    if (error) console.error('Supabase downgrade error:', error);
    else console.log(`⬇️ Downgraded ${customer.email} to free`);
  }

  res.status(200).json({ received: true });
}
