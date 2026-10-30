# Upwork demo starter

A reusable, working client-demo template: Next.js App Router + TypeScript, Tailwind CSS,
shadcn/ui, an example items workflow, and optional service integrations. It runs with
seeded data and no accounts, keys, or database. Personalize the landing page in
[`src/config/demo.ts`](src/config/demo.ts).

## Make a new demo in 5 steps

1. **Copy the template.** Create a repository from this template (or clone and change the
   Git remote), then run `npm install`. Use Node.js 22 LTS (>=22.13).
2. **Edit `src/config/demo.ts`.** Set `clientName`, `projectTitle`, `summary`, and `features`.
   The landing page, navigation, and metadata pick them up automatically.
3. **Rename the items feature.** Copy/rename `src/app/items`, `src/components/items`,
   `src/app/api/items`, and `src/lib/schemas/item.ts`. Update the repository interface
   in `src/lib/db.ts`, seed records in `src/lib/seed.ts`, schema in `src/db/schema.ts`,
   navigation links, and matching tests. Build the client's single most useful workflow.
4. **Run locally.** `npm run dev`, then visit `/` and `/items`. Optionally copy
   `.env.example` to `.env.local`. Run `npm run build`, `npm run lint`, and `npm test`
   before sharing the demo.
5. **Deploy when ready.** Run `vercel --prod` from the new demo repository. Add optional
   environment variables in Vercel project settings before deploying integrations.

## Structure

```text
src/config/demo.ts          Client copy and feature highlights
src/app/page.tsx            Landing page
src/app/items/              Working example workspace
src/components/items/      Table, create/edit form, delete confirmation
src/components/ui/         Editable shadcn/ui primitives (including form and Sonner)
src/app/api/items/          Collection and individual REST routes
src/lib/schemas/item.ts     Shared Zod create, patch, form, and ID schemas
src/lib/db.ts               Repository interface, memory adapter, lazy adapter selection
src/lib/seed.ts             Starter records
src/db/                    Drizzle Postgres schema and repository adapter
src/lib/integrations/       Server-only Stripe, email, and SMS helpers
src/app/api/webhooks/stripe Stripe webhook endpoint
tests/                    Repository, schema, route, and integration tests
```

## Scripts

| Command              | Purpose                                                      |
| -------------------- | ------------------------------------------------------------ |
| `npm run dev`        | Start the development server at localhost:3000               |
| `npm run build`      | Build the production app and check Next.js types             |
| `npm start`          | Serve the production build                                   |
| `npm run lint`       | Run ESLint                                                   |
| `npm run typecheck`  | Check TypeScript without emitting files                      |
| `npm test`           | Run Vitest once                                              |
| `npm run test:watch` | Run Vitest in watch mode                                     |
| `npm run db:push`    | Apply the Drizzle schema to the configured Postgres database |

npm is the selected package manager; commit `package-lock.json` and use `npm ci` in CI.

## Data and API

`getItemRepository()` selects seeded memory storage by default. The module caches one
repository per Node process, including across development hot reloads. Data is ephemeral:
restarts, cold starts, and separate Vercel instances have separate stores. Changes can
disappear or differ between requests on Vercel. Use Postgres when a demo needs durable,
consistent data. The app never silently falls back to memory on a database error.

To enable Postgres, set `DATABASE_URL` in `.env.local`, run `npm run db:push` against a
dedicated demo database, and restart the app. The config reads `.env.local` using Next's
environment loader. The Postgres store starts empty; create records through the UI.
The adapter uses a small postgres.js pool and disables prepared statements for pooled
connections. Set the provider's required SSL options in your connection URL.

| Method | Route             | Behavior                                              |
| ------ | ----------------- | ----------------------------------------------------- |
| GET    | `/api/items`      | List items, newest first                              |
| POST   | `/api/items`      | Create; `name` required, description/status defaulted |
| GET    | `/api/items/[id]` | Get one UUID-addressed item                           |
| PATCH  | `/api/items/[id]` | Update at least one field                             |
| DELETE | `/api/items/[id]` | Delete; returns 204 with no body                      |

Success responses use `{ "data": ... }`; errors use
`{ "error": { "message": "...", "issues": [] } }` (`issues` only for validation failures).
Invalid JSON, IDs, or data return 400; missing items return 404; unexpected failures
return a generic 500 without connection details. Names are trimmed and limited to 100
characters, descriptions to 1000. Status is `planned`, `in_progress`, or `done`.
Unknown fields are rejected. These demo APIs are intentionally unauthenticated; add
access control before using them with real customer data.

```sh
curl -X POST http://localhost:3000/api/items \
  -H 'Content-Type: application/json' \
  -d '{"name":"Review the demo","status":"planned"}'
```

## Optional environment variables

Every optional variable is listed in `.env.example`. Keep real values in `.env.local`
or your hosting environment; `.env*` is ignored except for `.env.example`.

| Variable                | Purpose / missing-value behavior                                           |
| ----------------------- | -------------------------------------------------------------------------- |
| `DATABASE_URL`          | Postgres URL; blank selects seeded memory                                  |
| `APP_URL`               | Canonical origin for Stripe redirects; defaults to `http://localhost:3000` |
| `STRIPE_SECRET_KEY`     | Stripe test/live key; blank makes checkout return a mock session           |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret; live verification needs both Stripe values         |
| `RESEND_API_KEY`        | Resend API key; email logs to console if this or sender is absent          |
| `EMAIL_FROM`            | Verified Resend sender, e.g. `Demo <demo@example.com>`                     |
| `TWILIO_ACCOUNT_SID`    | Twilio account SID; SMS logs if any Twilio value is absent                 |
| `TWILIO_AUTH_TOKEN`     | Twilio auth token                                                          |
| `TWILIO_FROM_NUMBER`    | Twilio sender in E.164 format                                              |

## Integration examples

Call these helpers from server code only. Missing credentials do not make any network
calls. Mock email/SMS log their input, so use sample data. Configured providers can
return errors; catch them at your calling route or action.

```ts
import { createCheckoutSession } from "@/lib/integrations/stripe";
import { sendEmail } from "@/lib/integrations/email";
import { sendSms } from "@/lib/integrations/sms";

const checkout = await createCheckoutSession({ priceId: "price_from_stripe" });
// Redirect to checkout.url. In mock mode it is a local success URL, not a payment.
await sendEmail({
  to: "client@example.com",
  subject: "Your demo",
  text: "Ready to explore.",
});
await sendSms({ to: "+15005550006", body: "Your demo is ready." });
```

`POST /api/webhooks/stripe` verifies the original request text with Stripe's signing
secret when configured. With neither Stripe variable set it acknowledges mock events
with a string `type`; partial configuration returns 503, and invalid signatures return 400. The route is a stub: it logs verified completed checkouts but does not fulfill
orders or send messages. Implement durable event-ID deduplication and fulfillment before
accepting payments. Use Stripe test keys and a test price while developing.

```sh
curl -X POST http://localhost:3000/api/webhooks/stripe \
  -H 'Content-Type: application/json' \
  -d '{"type":"checkout.session.completed"}'
```

Reference docs: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation),
[shadcn/ui](https://ui.shadcn.com/docs/installation/next),
[Drizzle Postgres](https://orm.drizzle.team/docs/get-started-postgresql),
[Stripe signature verification](https://docs.stripe.com/webhooks/signature).
