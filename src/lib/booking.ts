import { z } from "zod";

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (d) =>
      !Number.isNaN(Date.parse(d)) &&
      new Date(d).toISOString().slice(0, 10) === d,
    "Use a valid YYYY-MM-DD date",
  );
export const timeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
export const bookingSchema = z.object({
  reference: z.string().min(1).max(60),
  name: z.string().trim().min(1).max(80),
  phone: z
    .string()
    .regex(/^\+?[\d ()-]{7,25}$/)
    .refine((value) => {
      const count = value.replace(/\D/g, "").length;
      return count >= 7 && count <= 15;
    }, "Use a phone number with 7–15 digits"),
  service: z.string().min(1).max(80),
  date: dateSchema,
  start_time: timeSchema,
  duration: z.number().int().min(1).max(480),
});
export type Booking = z.infer<typeof bookingSchema>;
export type State = { knowledge: string; bookings: Booking[]; now: string };
export const slotSchema = z.object({
  date: dateSchema,
  service: z.string().min(1).max(80),
});
export const bookSchema = slotSchema.extend({
  name: bookingSchema.shape.name,
  phone: bookingSchema.shape.phone,
  start_time: timeSchema,
});
export const identitySchema = z.object({
  reference: z.string().min(1).max(60),
  phone: bookingSchema.shape.phone,
});
export const rescheduleSchema = identitySchema.extend({
  date: dateSchema,
  start_time: timeSchema,
});
export const handoffSchema = z.object({ reason: z.string().min(1).max(300) });
export const minutes = (t: string) =>
  Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
const clock = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
export function qatarDate(now: string, offset = 0) {
  return new Date(new Date(now).getTime() + 3 * 3600000 + offset * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function services(knowledge: string) {
  return knowledge.split("\n").flatMap((line) => {
    const match = line.match(/^([^|\n]+)\s*\|\s*([^|\n]+)\s*\|\s*(\d+)\s*$/);
    return match && +match[3] > 0 && +match[3] <= 480
      ? [{ name: match[1].trim(), price: match[2].trim(), duration: +match[3] }]
      : [];
  });
}
export function availability(
  state: State,
  raw: unknown,
): { slots: string[]; error?: string } {
  const parsed = slotSchema.safeParse(raw);
  if (!parsed.success)
    return { slots: [], error: "Use a valid service and date (YYYY-MM-DD)." };
  const { date, service } = parsed.data;
  const item = services(state.knowledge).find(
    (s) => s.name.toLowerCase() === service.toLowerCase(),
  );
  if (!item)
    return {
      slots: [],
      error: "Service is not in the business knowledge. Please ask staff.",
    };
  const day = new Date(`${date}T12:00:00+03:00`).toLocaleDateString("en-US", {
    timeZone: "Asia/Qatar",
    weekday: "long",
  });
  const line = state.knowledge
    .split("\n")
    .find((l) => l.toLowerCase().startsWith(`${day.toLowerCase()}:`));
  const hours = line?.match(/(\d{2}:\d{2})-(\d{2}:\d{2})/);
  if (
    !hours ||
    !timeSchema.safeParse(hours[1]).success ||
    !timeSchema.safeParse(hours[2]).success
  )
    return {
      slots: [],
      error: line?.toLowerCase().includes("closed")
        ? "The studio is closed that day."
        : "Opening hours are unavailable; please ask staff.",
    };
  const slots: string[] = [];
  for (
    let m = Math.ceil(minutes(hours[1]) / 30) * 30;
    m + item.duration <= minutes(hours[2]);
    m += 30
  ) {
    if (Date.parse(`${date}T${clock(m)}:00+03:00`) <= Date.parse(state.now))
      continue;
    if (
      !state.bookings.some(
        (b) =>
          b.date === date &&
          m < minutes(b.start_time) + b.duration &&
          m + item.duration > minutes(b.start_time),
      )
    )
      slots.push(clock(m));
  }
  return { slots };
}
export function book(state: State, raw: unknown) {
  const p = bookSchema.safeParse(raw);
  if (!p.success)
    return {
      error:
        "Provide name, phone, service, date and start_time in valid formats.",
      bookings: state.bookings,
    };
  const a = availability(state, p.data);
  if (!a.slots.includes(p.data.start_time))
    return {
      error: a.error || "That slot is unavailable. Please choose another time.",
      bookings: state.bookings,
    };
  // Derive references from supplied state so tools remain pure and reproducible.
  const prefix = `LUM-${Date.parse(state.now).toString(36).toUpperCase()}`;
  let sequence = state.bookings.length + 1;
  while (state.bookings.some((b) => b.reference === `${prefix}-${sequence}`))
    sequence++;
  const reference = `${prefix}-${sequence}`;
  const booking: Booking = {
    ...p.data,
    reference,
    duration: services(state.knowledge).find(
      (s) => s.name.toLowerCase() === p.data.service.toLowerCase(),
    )!.duration,
  };
  return { booking, bookings: [...state.bookings, booking] };
}
const digits = (s: string) => s.replace(/\D/g, "");
function identify(state: State, reference: string, phone: string) {
  return state.bookings.find(
    (b) =>
      b.reference.toUpperCase() === reference.toUpperCase() &&
      digits(b.phone) === digits(phone),
  );
}
export function cancel(state: State, raw: unknown) {
  const p = identitySchema.safeParse(raw);
  const found = p.success && identify(state, p.data.reference, p.data.phone);
  if (!found)
    return {
      error: "Booking reference and phone do not match.",
      bookings: state.bookings,
    };
  return {
    reference: found.reference,
    bookings: state.bookings.filter((b) => b !== found),
  };
}
export function reschedule(state: State, raw: unknown) {
  const p = rescheduleSchema.safeParse(raw);
  const found = p.success && identify(state, p.data.reference, p.data.phone);
  if (!found || !p.success)
    return {
      error: "Booking reference and phone do not match.",
      bookings: state.bookings,
    };
  const remaining = state.bookings.filter((b) => b !== found);
  const result = availability(
    { ...state, bookings: remaining },
    { service: found.service, date: p.data.date },
  );
  if (!result.slots.includes(p.data.start_time))
    return {
      error: result.error || "That slot is unavailable.",
      bookings: state.bookings,
    };
  const booking = {
    ...found,
    date: p.data.date,
    start_time: p.data.start_time,
    duration: services(state.knowledge).find(
      (s) => s.name.toLowerCase() === found.service.toLowerCase(),
    )!.duration,
  };
  return { booking, bookings: [...remaining, booking] };
}
export function handoff(raw: unknown) {
  const p = handoffSchema.safeParse(raw);
  return p.success
    ? { handedOff: true, reason: p.data.reason }
    : { handedOff: false, error: "A reason is required." };
}
export function seedBookings(now: string): Booking[] {
  const openDates: string[] = [];
  for (let offset = 0; openDates.length < 3; offset++) {
    const date = qatarDate(now, offset);
    if (new Date(`${date}T12:00:00+03:00`).getUTCDay() !== 5)
      openDates.push(date);
  }
  return [0, 1, 1, 2].map((day, i) => ({
    reference: `LUM-DEMO${i + 1}`,
    name: ["Amira S.", "Noura A.", "Sara M.", "Maya K."][i],
    phone: `+9745555000${i}`,
    service: i % 2 ? "Manicure" : "Haircut",
    duration: i % 2 ? 45 : 60,
    date: openDates[day],
    start_time: ["10:00", "13:00", "15:00", "11:00"][i],
  }));
}
