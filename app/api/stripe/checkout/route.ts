// POST /api/stripe/checkout
// creates a stripe checkout session for the $5/month subscription plan
// returns { url } — the client redirects to it
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Stripe from 'stripe';
import { connectDB } from '@/lib/db/mongo';
import { UserProfile } from '@/lib/db/schemas';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2026-02-25.clover',
});

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const priceId = process.env.STRIPE_PRICE_ID;

  if (!priceId || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'stripe not configured' }, { status: 500 });
  }

  await connectDB();

  // reuse existing stripe customer if the user has one
  const profile = await UserProfile.findOne(
    { clerkUserId: userId },
    { stripeCustomerId: 1 },
  ).lean();

  const existingCustomerId = profile?.stripeCustomerId;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/user`,
    // pass clerkUserId so the webhook can look up the right user
    metadata: { clerkUserId: userId },
    ...(existingCustomerId ? { customer: existingCustomerId } : {}),
  });

  return NextResponse.json({ url: session.url });
}
