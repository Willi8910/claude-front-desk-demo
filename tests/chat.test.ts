import { beforeEach, expect, it, vi } from "vitest";
vi.mock("ai", () => ({
  generateText: vi.fn(),
  tool: (definition: unknown) => definition,
  isStepCount: vi.fn(),
}));
import { generateText } from "ai";
import { POST } from "@/app/api/chat/route";
import { defaultKnowledge } from "@/config/demo";
const payload = {
  messages: [{ role: "user", content: "How much is a haircut?" }],
  knowledge: defaultKnowledge,
  bookings: [],
  now: "2026-10-30T06:00:00Z",
};
let count = 0;
function request(body: unknown, ip = `test-${++count}`) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.mocked(generateText).mockRejectedValue(new Error("No credentials"));
});
it("falls back on gateway failure with unchanged bookings", async () => {
  const response = await POST(request(payload));
  const data = await response.json();
  expect(response.status).toBe(200);
  expect(data.reply).toContain("QAR 120");
  expect(data.offline).toBe(true);
  expect(data.bookings).toEqual([]);
});
it("returns a successful gateway reply", async () => {
  vi.mocked(generateText).mockResolvedValueOnce({
    text: "A haircut is QAR 120.",
  } as Awaited<ReturnType<typeof generateText>>);
  const data = await (await POST(request(payload))).json();
  expect(data.offline).toBe(false);
  expect(data.reply).toContain("QAR 120");
});
it("caps history to 20 and rejects oversized message content", async () => {
  await POST(
    request({
      ...payload,
      messages: Array.from({ length: 30 }, () => payload.messages[0]),
    }),
  );
  expect(vi.mocked(generateText).mock.calls.at(-1)?.[0].messages).toHaveLength(
    20,
  );
  expect(
    (
      await POST(
        request({
          ...payload,
          messages: [{ role: "user", content: "x".repeat(1001) }],
        }),
      )
    ).status,
  ).toBe(400);
});
it("returns friendly errors for malformed input and a rate limit", async () => {
  expect((await POST(request({ messages: [] }))).status).toBe(400);
  for (let i = 0; i < 20; i++) await POST(request(payload, "limited-test"));
  const response = await POST(request(payload, "limited-test"));
  expect(response.status).toBe(429);
  expect((await response.json()).reply).toContain("10 minutes");
});
it("rejects oversized bodies before parsing", async () => {
  expect((await POST(request({ data: "a".repeat(150001) }))).status).toBe(413);
});
