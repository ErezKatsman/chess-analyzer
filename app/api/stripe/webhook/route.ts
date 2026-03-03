// POST /api/stripe/webhook
// handles stripe subscription lifecycle events to keep UserProfile.plan in sync
// must read raw body — stripe signature verification requires the unmodified bytes
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { connectDB } from '@/lib/db/mongo';
import { UserProfile } from '@/lib/db/schemas';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2026-02-25.clover',
});

// next.js app router: opt out of body parsing so we can verify the stripe signature
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'webhook secret not configured' }, { status: 500 });
  }

  const sig = request.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'missing stripe-signature header' }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: 'invalid webhook signature' }, { status: 400 });
  }

  await connectDB();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const clerkUserId = session.metadata?.clerkUserId;
      const stripeCustomerId =
        typeof session.customer === 'string' ? session.customer : session.customer?.id;
      const stripeSubscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id;

      if (!clerkUserId) break;

      // upgrade user to paid plan — upsert in case profile doesn't exist yet
      await UserProfile.findOneAndUpdate(
        { clerkUserId },
        {
          $set: {
            plan: 'paid',
            ...(stripeCustomerId ? { stripeCustomerId } : {}),
            ...(stripeSubscriptionId ? { stripeSubscriptionId } : {}),
            updatedAt: new Date(),
          },
        },
        { upsert: false },
      );
      break;
    }

    case 'customer.subscription.deleted': {
      // subscription cancelled or payment failed — revert to free
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;

      await UserProfile.findOneAndUpdate(
        { stripeCustomerId: customerId },
        { $set: { plan: 'free', stripeSubscriptionId: undefined, updatedAt: new Date() } },
      );
      break;
    }

    default:
      // ignore unhandled events
      break;
  }

  return NextResponse.json({ received: true });
}
