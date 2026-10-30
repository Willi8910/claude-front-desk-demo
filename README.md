# Claude AI front desk — demo

A one-page, fictional **Lumen Beauty Studio (sample business)** demo: customers ask questions in a website chat, check availability, and book, reschedule or cancel appointments. The front desk panel updates immediately. Editable business knowledge is sent on every request. All names, addresses and appointments are sample data.

## Run locally

Use Node.js **22.13+** (or a newer supported LTS).

```sh
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. No credentials are required to try the offline flow.

| Variable             | Purpose                                                    |
| -------------------- | ---------------------------------------------------------- |
| `AI_MODEL`           | Gateway model ID; defaults to `anthropic/claude-haiku-4.5` |
| `AI_GATEWAY_API_KEY` | Optional Vercel AI Gateway key for local development       |

On Vercel, AI Gateway uses the deployment's automatic OIDC authentication. No provider-specific Anthropic key is used. The server uses the latest stable AI SDK installed in the lockfile; SDK 7 uses `tool({ inputSchema, execute })` and `isStepCount(5)` for multi-step calls. Credentials stay on the server.

If the gateway fails or has no credentials/quota, a small deterministic responder takes over and displays **offline demo mode**. It supports English hours/prices and a guided booking flow, plus basic Arabic responses. Claude handles broader multilingual conversations; the offline parser is deliberately limited and asks for structured English field names for booking data.

Try this offline conversation:

1. “Book a manicure tomorrow afternoon” (if tomorrow is closed, choose a Saturday–Thursday date).
2. Choose an offered time in 24-hour format, e.g. `13:00`.
3. Send `name: Sample Guest, phone: +97455551234`.
4. Check the summary and reply `yes`.
5. Use the returned reference with `cancel LUM-… phone: +97455551234`, then confirm; or `reschedule LUM-… phone: +97455551234, YYYY-MM-DD 15:00`.

Use **Reset demo** to restore sample bookings, knowledge and chat. Bookings and knowledge persist in this browser; the conversation resets on reload. Use fictional contact details: this public sample is not intended to store customer records.

## How it works

`POST /api/chat` accepts `{ messages, knowledge, bookings, now }`, returning `{ reply, bookings, handedOff, offline }`. State travels with each request, so the route requires no database and works on serverless deployments. Bookings and knowledge live in client state/localStorage. Tools validate inputs with Zod and return fresh booking arrays. There is a single shared appointment resource: overlapping appointments are blocked across all services, on a 30-minute start grid, with duration, opening hours and past-time checks in Asia/Qatar.

Service rows use `Name | Price | Duration in minutes`; hours use `Monday: 09:00-18:00` or `Friday: closed`. Edit these rows in **Business knowledge** to change both answers and scheduling. Unknown services/hours fail closed. Other knowledge can be plain text. Existing appointment durations remain unchanged when the knowledge is edited; a rescheduled appointment uses the current service duration.

The assistant is instructed to ask for name and phone, summarize details, obtain confirmation, answer only from knowledge and hand unknown questions to staff. Handoff is a visible demo flag; it sends no notification. Reference plus matching phone is required to change/cancel a booking. The fallback also requires a confirmation turn. Failed AI generations discard partial tool changes before falling back.

Requests retain at most 20 messages, each capped at 1,000 characters. Knowledge, booking count and request size are bounded. Output is limited to about 600 tokens per generation step, with at most five steps. There is a friendly 20 requests / 10 minute per-IP limiter. Its in-memory counters are best effort per server instance, reset on cold starts, and are not a distributed abuse defense. Use a trusted proxy that sets `x-forwarded-for` when deploying. On rate limit the UI displays the message without changing bookings.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Vitest covers availability grids, opening hours, conflicts, invalid/past appointments, knowledge changes, identity checks, reschedule/cancel, fallback confirmation, Arabic greeting and gateway-failure responses.

## Next steps (not implemented)

- Embed the chat in a real website widget or connect a WhatsApp Business API webhook, with verified channel identity and conversation persistence.
- Connect Google Calendar or Calendly using server-side credentials; make availability and booking writes atomic to prevent concurrent double bookings.
- Load approved knowledge from the business's data source, add staff notifications for handoffs, and apply the studio's cancellation policies in the scheduling adapter.
- Replace client-supplied bookings/time with trusted server data, add proper customer verification and durable storage, and use a distributed rate limiter before handling real customers. The browser-owned state, reference/phone matching and prompt-based policy checks here are demonstration mechanics.

Built by William Lie · https://github.com/Willi8910
