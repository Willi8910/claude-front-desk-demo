import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
import {
  createCheckoutSession,
  parseStripeWebhook,
} from "@/lib/integrations/stripe";
import { sendEmail } from "@/lib/integrations/email";
import { sendSms } from "@/lib/integrations/sms";
import { POST } from "@/app/api/webhooks/stripe/route";

beforeEach(() => {
  for (const key of [
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "RESEND_API_KEY",
    "EMAIL_FROM",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_FROM_NUMBER",
    "APP_URL",
  ])
    vi.stubEnv(key, "");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
describe("integration mock modes", () => {
  it("provides a checkout session and sends mock messages without any network call", async () => {
    const network = vi.spyOn(globalThis, "fetch");
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    expect(
      await createCheckoutSession({ priceId: "price_demo" }),
    ).toMatchObject({
      mock: true,
      url: "http://localhost:3000/items?checkout=success",
    });
    expect(
      await sendEmail({
        to: "demo@example.com",
        subject: "Hello",
        text: "Demo",
      }),
    ).toMatchObject({ mock: true });
    expect(await sendSms({ to: "+15005550006", body: "Hello" })).toMatchObject({
      mock: true,
    });
    expect(log).toHaveBeenCalledTimes(2);
    expect(network).not.toHaveBeenCalled();
  });
  it("acknowledges mock webhooks and rejects malformed payloads", async () => {
    const request = (body: string) =>
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body,
      });
    expect(
      await (
        await POST(request('{"type":"checkout.session.completed"}'))
      ).json(),
    ).toEqual({ received: true, mock: true });
    expect((await POST(request("{"))).status).toBe(400);
    expect((await POST(request("{}"))).status).toBe(400);
  });
  it("never accepts unsigned live events or silently falls back for partial Stripe config", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_demo");
    expect(() => parseStripeWebhook("{}", null)).toThrow("Configure both");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_demo");
    expect(() => parseStripeWebhook("{}", null)).toThrow(
      "Missing Stripe signature",
    );
    expect(() => parseStripeWebhook("{}", "bad-signature")).toThrow(
      "Invalid Stripe signature",
    );
  });
  it("verifies a signed Stripe event using the unmodified body", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_demo");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_demo");
    const stripe = new Stripe("sk_test_demo");
    const body = JSON.stringify({
      id: "evt_demo",
      type: "checkout.session.completed",
      data: { object: {} },
    });
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: body,
      secret: "whsec_demo",
    });
    expect(parseStripeWebhook(body, signature)).toMatchObject({
      mock: false,
      type: "checkout.session.completed",
      event: { id: "evt_demo" },
    });
    expect(() => parseStripeWebhook(`${body} `, signature)).toThrow(
      "Invalid Stripe signature",
    );
  });
});
