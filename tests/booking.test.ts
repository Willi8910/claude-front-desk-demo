import { describe, expect, it } from "vitest";
import { defaultKnowledge } from "@/config/demo";
import {
  availability,
  book,
  cancel,
  reschedule,
  qatarDate,
  type State,
} from "@/lib/booking";
const state = (): State => ({
  knowledge: defaultKnowledge,
  bookings: [],
  now: "2026-10-29T05:00:00Z",
});
const input = {
  name: "Sample Guest",
  phone: "+97455551234",
  service: "Manicure",
  date: "2026-10-31",
  start_time: "13:00",
};
describe("booking tools", () => {
  it("returns a 30-minute grid that fits service duration inside hours", () => {
    const slots = availability(state(), {
      date: input.date,
      service: "Manicure",
    }).slots;
    expect(slots[0]).toBe("10:00");
    expect(slots.at(-1)).toBe("17:00");
    expect(slots).not.toContain("17:30");
  });
  it("closes on Friday and rejects invalid dates, services and hours", () => {
    expect(
      availability(state(), { date: "2026-10-30", service: "Haircut" }).slots,
    ).toEqual([]);
    expect(
      availability(state(), { date: "2026-02-30", service: "Haircut" }).error,
    ).toBeTruthy();
    expect(
      availability(state(), { date: input.date, service: "Unknown" }).error,
    ).toBeTruthy();
    expect(book(state(), { ...input, start_time: "09:30" }).error).toBeTruthy();
    expect(book(state(), { ...input, start_time: "17:30" }).error).toBeTruthy();
  });
  it("detects partial overlaps but allows exact boundaries", () => {
    const first = book(state(), input);
    expect(first.booking?.reference).toMatch(/^LUM-/);
    const next = { ...state(), bookings: first.bookings };
    expect(book(next, { ...input, start_time: "13:30" }).error).toContain(
      "unavailable",
    );
    expect(book(next, { ...input, start_time: "12:30" }).error).toContain(
      "unavailable",
    );
    expect(book(next, { ...input, start_time: "14:00" }).booking).toBeDefined();
    expect(state().bookings).toEqual([]);
  });
  it("requires name and phone; rejects past and off-grid slots", () => {
    expect(book(state(), { ...input, name: "" }).error).toBeTruthy();
    expect(book(state(), { ...input, phone: "" }).error).toBeTruthy();
    expect(book(state(), { ...input, phone: "-------" }).error).toBeTruthy();
    expect(book(state(), { ...input, start_time: "13:15" }).error).toBeTruthy();
    expect(
      book({ ...state(), now: "2026-11-01T00:00:00Z" }, input).error,
    ).toBeTruthy();
  });
  it("uses current knowledge for hours and duration", () => {
    const edited = {
      ...state(),
      knowledge: defaultKnowledge
        .replace("Manicure | QAR 80 | 45", "Manicure | QAR 95 | 90")
        .replace("Saturday: 10:00-18:00", "Saturday: 12:00-14:00"),
    };
    expect(
      availability(edited, { service: "Manicure", date: input.date }).slots,
    ).toEqual(["12:00", "12:30"]);
  });
  it("reschedules only with matching identity; preserves reference and original on conflict", () => {
    const a = book(state(), input);
    const b = book(
      { ...state(), bookings: a.bookings },
      { ...input, start_time: "15:00" },
    );
    const s = { ...state(), bookings: b.bookings };
    const reference = a.booking!.reference;
    expect(
      reschedule(s, {
        reference,
        phone: "+97400000000",
        date: input.date,
        start_time: "16:00",
      }).error,
    ).toBeTruthy();
    const conflict = reschedule(s, {
      reference,
      phone: input.phone,
      date: input.date,
      start_time: "15:00",
    });
    expect(conflict.bookings).toEqual(s.bookings);
    expect(conflict.error).toBeTruthy();
    const moved = reschedule(s, {
      reference,
      phone: input.phone,
      date: input.date,
      start_time: "16:00",
    });
    expect(moved.booking?.reference).toBe(reference);
    expect(moved.booking?.start_time).toBe("16:00");
    expect(moved.bookings).toHaveLength(2);
  });
  it("cancels with normalized matching phone and reference", () => {
    const result = book(state(), input);
    const s = { ...state(), bookings: result.bookings };
    const reference = result.booking!.reference;
    expect(cancel(s, { reference, phone: "+97400000000" }).error).toBeTruthy();
    expect(
      cancel(s, { reference: reference.toLowerCase(), phone: "+974 5555 1234" })
        .bookings,
    ).toEqual([]);
  });
  it("resolves tomorrow across midnight in Qatar", () => {
    expect(qatarDate("2026-10-29T22:00:00Z")).toBe("2026-10-30");
    expect(qatarDate("2026-10-29T22:00:00Z", 1)).toBe("2026-10-31");
  });
});

it("produces reproducible bookings without mutating passed-in state", () => {
  const s = state();
  const before = JSON.stringify(s);
  expect(book(s, input)).toEqual(book(s, input));
  expect(JSON.stringify(s)).toBe(before);
});
