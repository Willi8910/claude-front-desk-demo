import "server-only";

type EmailInput = { to: string; subject: string; text: string };
export async function sendEmail(input: EmailInput) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    console.info("[email:mock]", input);
    return { id: `mock_email_${crypto.randomUUID()}`, mock: true as const };
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...input, from }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok)
    throw new Error(`Email provider returned ${response.status}.`);
  const result = (await response.json()) as { id: string };
  return { id: result.id, mock: false as const };
}
