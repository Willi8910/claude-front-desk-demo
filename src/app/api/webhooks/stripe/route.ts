import { NextResponse } from "next/server";
import {
  parseStripeWebhook,
  StripeWebhookError,
} from "@/lib/integrations/stripe";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    // Signature verification requires the original body, never request.json().
    const result = parseStripeWebhook(
      await request.text(),
      request.headers.get("stripe-signature"),
    );
    if (!result.mock && result.type === "checkout.session.completed") {
      // Add idempotent fulfillment here using result.event.id as the unique key.
      console.info("[stripe] Checkout completed", result.event.id);
    }
    return NextResponse.json({ received: true, mock: result.mock });
  } catch (error) {
    const status =
      error instanceof StripeWebhookError
        ? error.status
        : error instanceof SyntaxError
          ? 400
          : 500;
    const message =
      error instanceof StripeWebhookError
        ? error.message
        : status === 400
          ? "Invalid JSON payload."
          : "Webhook processing failed.";
    return NextResponse.json({ error: { message } }, { status });
  }
}
