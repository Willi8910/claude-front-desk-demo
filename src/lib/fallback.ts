import {
  availability,
  book,
  cancel,
  handoff,
  qatarDate,
  reschedule,
  services,
  type State,
} from "./booking";
export type Message = { role: "user" | "assistant"; content: string };
export function fallback(state: State, messages: Message[]) {
  const last = messages.at(-1)?.content || "";
  // Start a fresh intent after a completed mutation so old dates and actions cannot leak into the next booking.
  const completed = messages.findLastIndex(
    (m) =>
      m.role === "assistant" && /^(All set!|تم تنفيذ الطلب)/.test(m.content),
  );
  const active = messages.slice(completed + 1);
  const users = active
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n");
  const ar = /[\u0600-\u06ff]/.test(last);
  const say = (en: string, arabic: string) => (ar ? arabic : en);
  const response = (
    reply: string,
    bookings = state.bookings,
    handedOff = false,
  ) => ({ reply, bookings, handedOff, offline: true });
  if (/هل تتحدث|العربية/.test(last))
    return response(
      "نعم، أتحدث العربية! يمكنني مساعدتك في مواعيد العمل والأسعار والحجوزات. في الوضع التجريبي، اكتب بيانات الحجز بالإنجليزية: service, YYYY-MM-DD, HH:MM, name: الاسم, phone: الرقم.",
    );
  const confirmed = /^(yes|confirm|confirmed|نعم|تأكيد)[.!\s]*$/i.test(
    last.trim(),
  );
  const previous = messages.at(-2)?.content || "";
  const pending = previous.match(/\[CONFIRM (book|cancel|reschedule) (.+)\]/);
  if (confirmed && pending) {
    try {
      const input = JSON.parse(pending[2]);
      const result =
        pending[1] === "book"
          ? book(state, input)
          : pending[1] === "cancel"
            ? cancel(state, input)
            : reschedule(state, input);
      if (result.error)
        return response(say(result.error, `تعذر تنفيذ الطلب: ${result.error}`));
      const ref =
        "booking" in result
          ? result.booking?.reference
          : "reference" in result
            ? result.reference
            : "";
      return response(
        say(
          `All set! ${pending[1] === "cancel" ? "Cancelled" : "Confirmed"}: ${ref}. Keep this reference and phone number to manage your appointment.`,
          `تم تنفيذ الطلب. رقم الحجز: ${ref}. احتفظ بالرقم لإدارة موعدك.`,
        ),
        result.bookings,
      );
    } catch {
      return response("Please start the booking again with your details.");
    }
  }
  const operation = /\bcancel\b|إلغاء/i.test(users)
    ? "cancel"
    : /reschedul|change.*booking|تغيير/i.test(users)
      ? "reschedule"
      : "book";
  const isBooking =
    /book|appointment|reserve|manicure tomorrow|حجز|موعد|\bcancel\b|reschedul/i.test(
      last,
    ) ||
    confirmed ||
    /name\s*:|phone\s*:|\d{2}:\d{2}|\d{4}-\d{2}-\d{2}/i.test(last);
  if (isBooking) {
    const service = services(state.knowledge).find((s) =>
      users.toLowerCase().includes(s.name.toLowerCase()),
    );
    const dates = [...users.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)];
    const date =
      dates.at(-1)?.[0] ||
      (/tomorrow|غدا|غداً/i.test(users)
        ? qatarDate(state.now, 1)
        : /today|اليوم/i.test(users)
          ? qatarDate(state.now)
          : undefined);
    const start_time = [...users.matchAll(/\b([01]\d|2[0-3]):([0-5]\d)\b/g)].at(
      -1,
    )?.[0];
    const phone = [...users.matchAll(/(?:phone\s*:\s*)(\+?[\d ()-]{7,25})/gi)]
      .at(-1)?.[1]
      ?.trim();
    const name = [...users.matchAll(/name\s*:\s*([^\n,;]+)/gi)]
      .at(-1)?.[1]
      ?.trim();
    const reference = [...users.matchAll(/LUM-[A-Z0-9]+(?:-[A-Z0-9]+)*/gi)].at(
      -1,
    )?.[0];
    if (operation !== "book") {
      if (!reference || !phone)
        return response(
          say(
            `To ${operation}, please send your booking reference and phone: +97455550000.`,
            "يرجى إرسال رقم الحجز ورقم الهاتف بصيغة phone: +97455550000.",
          ),
        );
      if (operation === "reschedule" && (!date || !start_time))
        return response(
          say(
            "What new date (YYYY-MM-DD) and time (HH:MM) would you like?",
            "ما التاريخ والوقت الجديدان؟ استخدم YYYY-MM-DD وHH:MM.",
          ),
        );
      const input = {
        reference,
        phone,
        ...(operation === "reschedule" ? { date, start_time } : {}),
      };
      return response(
        `${say(`Please confirm ${operation} for ${reference}${date ? ` on ${date} at ${start_time}` : ""}. Reply yes.`, "يرجى تأكيد التغيير بالرد نعم.")}\n[CONFIRM ${operation} ${JSON.stringify(input)}]`,
      );
    }
    if (!service || !date)
      return response(
        say(
          `Which service and date? Available services: ${services(
            state.knowledge,
          )
            .map((s) => s.name)
            .join(", ")}. Use tomorrow or YYYY-MM-DD.`,
          "ما الخدمة والتاريخ المطلوبان؟ اكتب اسم الخدمة بالإنجليزية والتاريخ بصيغة YYYY-MM-DD.",
        ),
      );
    const available = availability(state, { date, service: service.name });
    if (!available.slots.length)
      return response(
        say(
          available.error ||
            "No free slots that day. Please choose another date.",
          "لا توجد مواعيد متاحة في ذلك اليوم. اختر تاريخاً آخر.",
        ),
      );
    if (!start_time || !available.slots.includes(start_time))
      return response(
        say(
          `Available for ${service.name} on ${date}: ${available.slots.filter((t) => !/afternoon/i.test(users) || t >= "12:00").join(", ") || available.slots.join(", ")}. Choose HH:MM and send name: Your Name, phone: +97455550000.`,
          `المواعيد المتاحة في ${date}: ${available.slots.join(", ")}. أرسل الوقت والاسم والهاتف بصيغة name: الاسم, phone: الرقم.`,
        ),
      );
    if (!name || !phone)
      return response(
        say(
          "Please send name: Your Name, phone: +97455550000 before I confirm your appointment.",
          "أرسل الاسم والهاتف بصيغة name: الاسم, phone: الرقم لتأكيد الموعد.",
        ),
      );
    return response(
      `${say(`Confirm ${service.name} (${service.price}), ${date} at ${start_time}, for ${name}, ${phone}? Reply yes to book.`, `تأكيد ${service.name} (${service.price}) بتاريخ ${date} الساعة ${start_time} باسم ${name} ورقم ${phone}؟ أجب نعم.`)}\n[CONFIRM book ${JSON.stringify({ name, phone, service: service.name, date, start_time })}]`,
    );
  }
  if (/hours|open|opening|ساعات|متى تفتح/i.test(last)) {
    const hours = state.knowledge
      .split("\n")
      .filter((l) =>
        /^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday):/i.test(l),
      )
      .join("\n");
    if (hours)
      return response(
        say(
          `Our hours (Asia/Qatar):\n${hours}`,
          `ساعات العمل (بتوقيت قطر):\n${hours}`,
        ),
      );
  }
  if (/price|cost|much|haircut|manicure|blow dry|سعر|أسعار/i.test(last)) {
    const all = services(state.knowledge);
    const found = all.filter((s) =>
      last.toLowerCase().includes(s.name.toLowerCase()),
    );
    if (all.length)
      return response(
        (found.length ? found : all)
          .map(
            (s) =>
              `${s.name}: ${s.price} · ${s.duration} ${say("minutes", "دقيقة")}`,
          )
          .join("\n"),
      );
  }
  const topic = /address|where|location|عنوان/i.test(last)
    ? "Address:"
    : /policy|cancellation|سياسة/i.test(last)
      ? "Cancellation policy:"
      : /payment|deposit|دفع/i.test(last)
        ? "Payment:"
        : null;
  const line =
    topic && state.knowledge.split("\n").find((l) => l.startsWith(topic));
  if (line) return response(line);
  const result = handoff({
    reason:
      "Question outside supported business knowledge or offline language parser.",
  });
  return response(
    say(
      "I’ll hand this to staff so you get an accurate answer. This sample demo does not notify real staff.",
      "سأحيل سؤالك إلى الموظفين للحصول على إجابة دقيقة. هذا العرض لا يرسل إشعارات فعلية.",
    ),
    state.bookings,
    result.handedOff,
  );
}
