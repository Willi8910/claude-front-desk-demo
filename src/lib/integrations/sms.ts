import "server-only";

type SmsInput = { to: string; body: string };
export async function sendSms(input: SmsInput) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) {
    console.info("[sms:mock]", input);
    return { id: `mock_sms_${crypto.randomUUID()}`, mock: true as const };
  }
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: input.to, From: from, Body: input.body }),
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok)
    throw new Error(`SMS provider returned ${response.status}.`);
  const result = (await response.json()) as { sid: string };
  return { id: result.sid, mock: false as const };
}
