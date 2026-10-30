import "server-only";
import Stripe from "stripe";

export type CheckoutInput = {
  priceId: string;
  quantity?: number;
  successUrl?: string;
  cancelUrl?: string;
};
export async function createCheckoutSession(input: CheckoutInput) {
  const origin = process.env.APP_URL || "http://localhost:3000";
  const successUrl = input.successUrl || `${origin}/items?checkout=success`;
  const cancelUrl = input.cancelUrl || `${origin}/items?checkout=cancelled`;
  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      id: `mock_cs_${crypto.randomUUID()}`,
      url: successUrl,
      mock: true as const,
    };
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: input.priceId, quantity: input.quantity ?? 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
  return { id: session.id, url: session.url, mock: false as const };
}

export class StripeWebhookError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function parseStripeWebhook(body: string, signature: string | null) {
  if (!process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_WEBHOOK_SECRET) {
    // Mock payloads are only acknowledged; they never trigger a business action.
    const event: unknown = JSON.parse(body);
    if (
      !event ||
      typeof event !== "object" ||
      !("type" in event) ||
      typeof event.type !== "string"
    ) {
      throw new StripeWebhookError(400, "A mock event must include a type.");
    }
    return { mock: true as const, type: event.type };
  }
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    throw new StripeWebhookError(
      503,
      "Configure both Stripe secret and webhook keys to receive live events.",
    );
  }
  if (!signature)
    throw new StripeWebhookError(400, "Missing Stripe signature.");
  try {
    const event = new Stripe(
      process.env.STRIPE_SECRET_KEY,
    ).webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
    return { mock: false as const, type: event.type, event };
  } catch {
    throw new StripeWebhookError(400, "Invalid Stripe signature or payload.");
  }
}
