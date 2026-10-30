import { expect, it } from "vitest";
import { fallback, type Message } from "@/lib/fallback";
import { defaultKnowledge } from "@/config/demo";
import type { State } from "@/lib/booking";
const state: State = {
  knowledge: defaultKnowledge,
  bookings: [],
  now: "2026-10-30T06:00:00Z",
};
const ask = (content: string): Message => ({ role: "user", content });
it("answers edited prices and hours from knowledge", () => {
  expect(
    fallback(
      { ...state, knowledge: defaultKnowledge.replace("QAR 120", "QAR 150") },
      [ask("How much is a haircut?")],
    ).reply,
  ).toContain("QAR 150");
  expect(fallback(state, [ask("Opening hours?")]).reply).toContain(
    "Friday: closed",
  );
});
it("books in multiple turns, only after details and confirmation", () => {
  let history = [ask("Book a manicure tomorrow afternoon")];
  let result = fallback(state, history);
  expect(result.reply).toContain("13:00");
  expect(result.bookings).toEqual([]);
  history = [
    ...history,
    { role: "assistant", content: result.reply },
    ask("13:00"),
  ];
  result = fallback(state, history);
  expect(result.reply).toContain("name:");
  history = [
    ...history,
    { role: "assistant", content: result.reply },
    ask("name: Sample Guest, phone: +97455551234"),
  ];
  result = fallback(state, history);
  expect(result.reply).toContain("Reply yes");
  expect(result.bookings).toEqual([]);
  history = [
    ...history,
    { role: "assistant", content: result.reply },
    ask("yes"),
  ];
  result = fallback(state, history);
  expect(result.bookings).toHaveLength(1);
  expect(result.reply).toContain("LUM-");
  expect(result.offline).toBe(true);
});
it("rechecks conflicts at confirmation time", () => {
  const input = {
    name: "Guest",
    phone: "+97455551234",
    service: "Manicure",
    date: "2026-10-31",
    start_time: "13:00",
  };
  const history: Message[] = [
    { role: "assistant", content: `[CONFIRM book ${JSON.stringify(input)}]` },
    ask("yes"),
  ];
  const first = fallback(state, history);
  const conflict = fallback({ ...state, bookings: first.bookings }, history);
  expect(conflict.reply).toContain("unavailable");
  expect(conflict.bookings).toHaveLength(1);
});
it("hands unknown knowledge to staff without inventing facts", () => {
  const result = fallback(state, [ask("Do you offer laser treatments?")]);
  expect(result.handedOff).toBe(true);
  expect(result.reply).toContain("does not notify real staff");
  expect(
    fallback({ ...state, knowledge: "" }, [ask("Opening hours?")]).handedOff,
  ).toBe(true);
});
it("responds in Arabic", () => {
  expect(fallback(state, [ask("هل تتحدث العربية؟")]).reply).toContain("نعم");
});
it("supports cancellation and rescheduling through the same tools", () => {
  const booking = {
    reference: "LUM-TEST",
    name: "Guest",
    phone: "+97455551234",
    service: "Haircut",
    date: "2026-10-31",
    start_time: "13:00",
    duration: 60,
  };
  const s = { ...state, bookings: [booking] };
  for (const operation of ["cancel", "reschedule"]) {
    const history: Message[] = [
      ask(`${operation} LUM-TEST phone: +97455551234, 2026-10-31 15:00`),
    ];
    const pending = fallback(s, history);
    const result = fallback(s, [
      ...history,
      { role: "assistant", content: pending.reply },
      ask("yes"),
    ]);
    if (operation === "cancel") expect(result.bookings).toHaveLength(0);
    else expect(result.bookings[0].start_time).toBe("15:00");
  }
});

it("can cancel a newly created reference and then start a fresh booking", () => {
  const input = {
    name: "Guest",
    phone: "+97455551234",
    service: "Manicure",
    date: "2026-10-31",
    start_time: "13:00",
  };
  const created = fallback(state, [
    { role: "assistant", content: `[CONFIRM book ${JSON.stringify(input)}]` },
    ask("yes"),
  ]);
  const s = { ...state, bookings: created.bookings };
  const cancelHistory: Message[] = [
    ask(`cancel ${created.bookings[0].reference} phone: +97455551234`),
  ];
  const pending = fallback(s, cancelHistory);
  const cancelled = fallback(s, [
    ...cancelHistory,
    { role: "assistant", content: pending.reply },
    ask("yes"),
  ]);
  expect(cancelled.bookings).toHaveLength(0);
  const next = fallback({ ...state, bookings: cancelled.bookings }, [
    ...cancelHistory,
    { role: "assistant", content: cancelled.reply },
    ask("Book a haircut tomorrow"),
  ]);
  expect(next.reply).toContain("Available for Haircut");
});

it("answers the cancellation policy as knowledge rather than a cancel request", () => {
  expect(
    fallback(state, [ask("What is your cancellation policy?")]).reply,
  ).toContain("24 hours");
});
it("books from natural phrasing after an earlier price question", () => {
  const history: Message[] = [];
  let current = state;
  for (const text of [
    "How much is a haircut?",
    "Book a manicure tomorrow at 3pm",
    "My name is Sara, phone 55512345",
    "yes",
  ]) {
    history.push(ask(text));
    const result = fallback(current, history);
    current = { ...current, bookings: result.bookings };
    history.push({ role: "assistant", content: result.reply });
  }
  const booked = current.bookings.at(-1);
  expect(booked).toMatchObject({
    service: "Manicure",
    start_time: "15:00",
    name: "Sara",
    phone: "55512345",
  });
});
