"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Flower2,
  MessageCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Tabs } from "radix-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { defaultKnowledge } from "@/config/demo";
import {
  bookingSchema,
  qatarDate,
  seedBookings,
  type Booking,
} from "@/lib/booking";
import { fallback, type Message } from "@/lib/fallback";
const greeting: Message = {
  role: "assistant",
  content:
    "Welcome to Lumen ✨ How can I help you today? Ask about our services, or let’s find a time for your next appointment.",
};
const prompts = [
  "What are your opening hours?",
  "How much is a haircut?",
  "Book a manicure tomorrow afternoon",
  "Can I reschedule my booking?",
  "هل تتحدث العربية؟",
];
const clean = (s: string) =>
  s.replace(/\n?\[CONFIRM (?:book|cancel|reschedule) .+\]/g, "");
export function FrontDesk() {
  const [messages, setMessages] = useState<Message[]>([greeting]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [knowledge, setKnowledge] = useState(defaultKnowledge);
  const [ready, setReady] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const [engine, setEngine] = useState<string | null>(null);
  const [handedOff, setHandedOff] = useState(false);
  const [changed, setChanged] = useState<string[]>([]);
  const [storageNote, setStorageNote] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const lock = useRef(false);
  // Hydrate browser-owned state after SSR; this one-time synchronization needs a render.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let initial = seedBookings(new Date().toISOString());
    try {
      const saved = localStorage.getItem("lumen-demo-v1");
      if (saved) {
        const data = JSON.parse(saved);
        const parsed = bookingSchema.array().max(200).safeParse(data.bookings);
        if (parsed.success) initial = parsed.data;
        if (typeof data.knowledge === "string")
          setKnowledge(data.knowledge.slice(0, 12000));
      }
    } catch {
      setStorageNote("Storage unavailable; changes last for this visit.");
    }
    setBookings(initial);
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem(
          "lumen-demo-v1",
          JSON.stringify({ bookings, knowledge }),
        );
      } catch {
        setStorageNote("Storage unavailable; changes last for this visit.");
      }
    }
  }, [bookings, knowledge, ready]);
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [messages, busy]);
  async function send(text: string) {
    if (lock.current || !ready || !text.trim()) return;
    lock.current = true;
    setBusy(true);
    setInput("");
    const history: Message[] = [
      ...messages,
      { role: "user" as const, content: text.trim().slice(0, 1000) },
    ].slice(-20);
    setMessages(history);
    const now = new Date().toISOString();
    try {
      let data;
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history, knowledge, bookings, now }),
          signal: AbortSignal.timeout(35000),
        });
        data = await response.json();
      } catch {
        data = fallback({ knowledge, bookings, now }, history);
      }
      if (Array.isArray(data.bookings)) {
        const next = bookingSchema.array().safeParse(data.bookings);
        if (next.success) {
          setChanged(
            next.data
              .filter(
                (b) =>
                  !bookings.some(
                    (old) => JSON.stringify(old) === JSON.stringify(b),
                  ),
              )
              .map((b) => b.reference),
          );
          setBookings(next.data);
        }
      }
      setOffline(Boolean(data.offline));
      if (data.engine) setEngine(data.engine);
      setHandedOff((old) => old || Boolean(data.handedOff));
      setMessages([
        ...history,
        {
          role: "assistant",
          content:
            typeof data.reply === "string"
              ? data.reply.slice(0, 1000)
              : "Please try sending your message again.",
        },
      ]);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function reset() {
    setMessages([greeting]);
    setBookings(seedBookings(new Date().toISOString()));
    setKnowledge(defaultKnowledge);
    setChanged([]);
    setOffline(false);
    setHandedOff(false);
  }
  const dates = [
    ...new Set([
      ...bookings.map((b) => b.date),
      qatarDate(new Date().toISOString(), 1),
    ]),
  ].sort();
  return (
    <div className="mx-auto max-w-7xl px-4 pb-5 sm:px-8 lg:px-12">
      <header className="flex items-center justify-between border-b py-5 sm:py-7">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-primary text-white">
            <Flower2 className="size-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">
            lumen
            <span className="ml-2 text-xs font-normal tracking-wide text-muted-foreground">
              / AI front desk
            </span>
          </span>
        </div>
        <Badge
          variant="outline"
          className="border-primary/20 bg-primary/5 text-primary"
        >
          Demo · sample data
        </Badge>
      </header>
      <main>
        <section className="py-8 sm:py-11">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            <span className="size-1.5 rounded-full bg-primary" /> A little more
            care. A little less admin.
          </div>
          <h1 className="text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-[42px]">
            AI front desk{" "}
            <span className="font-normal text-muted-foreground">— demo</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Answers for your customers. Appointments in your calendar. Try a
            conversation and watch your front desk update.
            <br />
            <span className="text-xs">
              Built to run on Claude. This public demo uses DeepSeek; switching
              models is one setting.
            </span>
          </p>
        </section>
        <div className="grid items-start gap-6 lg:grid-cols-[1.12fr_1fr]">
          <section aria-label="Customer chat" className="min-w-0">
            <div className="mb-3 flex items-center justify-between px-1 text-xs">
              <span className="font-medium text-muted-foreground">
                01 / THE CUSTOMER EXPERIENCE
              </span>
              <span className="flex items-center gap-1.5 text-primary">
                <span className="size-1.5 rounded-full bg-primary" /> Website
                chat
              </span>
            </div>
            <Card className="gap-0 rounded-2xl py-0 shadow-xl shadow-stone-900/5">
              <div className="flex items-center gap-3 border-b px-5 py-5">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-[#f0e9df] text-[#7c6047]">
                  <Flower2 className="size-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold">
                    Lumen Beauty Studio{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      (sample business)
                    </span>
                  </h2>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Sparkles className="size-3 text-primary" /> Your AI
                    concierge · English & العربية
                  </p>
                </div>
              </div>
              <div
                role="log"
                aria-label="Chat messages"
                aria-live="polite"
                className="h-[340px] space-y-5 overflow-y-auto bg-[#faf9f6] px-4 py-6 sm:h-[360px] sm:px-6"
              >
                <div className="text-center text-[10px] uppercase tracking-widest text-muted-foreground">
                  A conversation starts here
                </div>
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[90%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-6 ${m.role === "user" ? "rounded-br-sm bg-primary text-white" : "rounded-bl-sm border bg-white text-foreground"}`}
                      dir="auto"
                    >
                      {clean(m.content)}
                    </div>
                  </div>
                ))}
                {busy && (
                  <div className="text-xs text-muted-foreground" role="status">
                    Lumen is typing…
                  </div>
                )}
                <div ref={bottom} />
              </div>
              <div className="border-t px-4 py-4 sm:px-5">
                <p className="mb-2.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  Try asking
                </p>
                <div className="mb-4 flex flex-wrap gap-2">
                  {prompts.map((p) => (
                    <button
                      key={p}
                      disabled={busy || !ready}
                      onClick={() => send(p)}
                      className="rounded-full border px-3 py-1.5 text-left text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:opacity-50"
                      dir="auto"
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void send(input);
                  }}
                  className="flex items-center gap-2 rounded-xl border bg-background p-2 focus-within:ring-2 focus-within:ring-primary/25"
                >
                  <input
                    aria-label="Message the front desk"
                    dir="auto"
                    value={input}
                    maxLength={1000}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={busy || !ready}
                    placeholder="Ask a question or book a little me-time…"
                    className="min-w-0 flex-1 bg-transparent px-2 py-1 text-sm outline-none"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    aria-label="Send message"
                    disabled={busy || !ready || !input.trim()}
                    className="rounded-lg"
                  >
                    <ArrowUp />
                  </Button>
                </form>
                <div className="mt-3 flex flex-wrap justify-between gap-2 text-[10px] text-muted-foreground">
                  <span>
                    Sample data only · Please use fictional contact details
                  </span>
                  {!offline && engine === "deepseek" && (
                    <span>● running on DeepSeek (demo)</span>
                  )}
                  {!offline && engine === "claude" && (
                    <span>● running on Claude</span>
                  )}
                  {offline && (
                    <span className="text-amber-700">● offline demo mode</span>
                  )}
                  {handedOff && (
                    <span className="text-primary">
                      Handed to staff · demo only
                    </span>
                  )}
                </div>
              </div>
            </Card>
          </section>
          <section className="min-w-0" aria-label="Front desk view">
            <div className="mb-3 flex items-center justify-between px-1 text-xs">
              <span className="font-medium text-muted-foreground">
                02 / BEHIND THE DESK
              </span>
              <span className="text-muted-foreground">Asia/Qatar · GMT+3</span>
            </div>
            <Card className="gap-0 rounded-2xl py-0">
              <div className="flex items-center justify-between gap-2 px-5 py-5">
                <div>
                  <h2 className="font-semibold">Front desk view</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Your business, in the loop.
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className="gap-1 bg-primary/5 text-primary"
                >
                  <span className="size-1.5 rounded-full bg-primary" /> Live
                  preview
                </Badge>
              </div>
              <Tabs.Root defaultValue="bookings">
                <Tabs.List
                  aria-label="Front desk panels"
                  className="mx-5 mb-5 grid grid-cols-2 rounded-lg bg-muted p-1"
                >
                  <Tabs.Trigger value="bookings" className="desk-tab">
                    <CalendarDays className="size-3.5" /> Bookings{" "}
                    <span className="text-[10px] text-muted-foreground">
                      {bookings.length}
                    </span>
                  </Tabs.Trigger>
                  <Tabs.Trigger value="knowledge" className="desk-tab">
                    <MessageCircle className="size-3.5" /> Business knowledge
                  </Tabs.Trigger>
                </Tabs.List>
                <Tabs.Content
                  value="bookings"
                  className="min-h-[425px] px-5 pb-5 outline-none"
                >
                  <div className="mb-5 flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2.5 text-xs leading-5 text-primary">
                    <Check className="size-4 shrink-0" /> Appointments made in
                    chat appear here instantly.
                  </div>
                  <div
                    aria-live="polite"
                    className="max-h-[450px] space-y-6 overflow-y-auto pr-1"
                  >
                    {!ready && (
                      <p className="text-sm text-muted-foreground">
                        Loading sample appointments…
                      </p>
                    )}
                    {dates.map((date) => (
                      <div key={date}>
                        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold">
                          <span>
                            {new Date(
                              `${date}T12:00:00+03:00`,
                            ).toLocaleDateString("en-GB", {
                              timeZone: "Asia/Qatar",
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                          <span className="h-px flex-1 bg-border" />
                        </h3>
                        <div className="space-y-2">
                          {bookings
                            .filter((b) => b.date === date)
                            .sort((a, b) =>
                              a.start_time.localeCompare(b.start_time),
                            )
                            .map((b) => (
                              <article
                                key={b.reference}
                                className={`flex gap-3 rounded-xl border p-3 ${changed.includes(b.reference) ? "border-primary/40 bg-primary/5" : "bg-background/50"}`}
                              >
                                <div className="min-w-11 pt-0.5 text-sm font-semibold tabular-nums">
                                  {b.start_time}
                                </div>
                                <div className="min-w-0 flex-1 border-l pl-3">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="text-sm font-medium">
                                      {b.service}
                                    </h4>
                                    {changed.includes(b.reference) && (
                                      <Badge className="h-4 text-[9px]">
                                        Just updated
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="mt-1 break-words text-xs text-muted-foreground">
                                    {b.name} · {b.reference}
                                  </p>
                                  <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <Clock3 className="size-3" /> {b.duration}{" "}
                                    min
                                  </p>
                                </div>
                                <ChevronRight className="mt-1 size-3.5 text-muted-foreground" />
                              </article>
                            ))}
                          {!bookings.some((b) => b.date === date) && (
                            <p className="text-xs text-muted-foreground">
                              A fresh page. No appointments yet.
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Tabs.Content>
                <Tabs.Content
                  value="knowledge"
                  className="min-h-[425px] px-5 pb-5 outline-none"
                >
                  <label htmlFor="knowledge" className="text-xs font-medium">
                    What your assistant knows
                  </label>
                  <p className="mb-3 mt-1 text-xs leading-5 text-muted-foreground">
                    Changes apply to your next message. Keep service rows and
                    daily hours in the format below so availability stays in
                    sync.
                  </p>
                  <textarea
                    id="knowledge"
                    value={knowledge}
                    onChange={(e) => setKnowledge(e.target.value)}
                    maxLength={12000}
                    disabled={busy}
                    spellCheck={false}
                    className="h-[320px] w-full resize-y rounded-xl border bg-background p-3 font-mono text-xs leading-6 outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <p className="mt-3 text-xs text-muted-foreground">
                    Your real setup would load this from your own data.
                  </p>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    Services: name | price | minutes. Hours: Monday: 09:00-18:00
                    or Friday: closed.
                  </p>
                </Tabs.Content>
              </Tabs.Root>
              <div className="flex items-center justify-between gap-2 border-t px-5 py-3 text-[10px] text-muted-foreground">
                <span>
                  {storageNote ||
                    "Saved in this browser · one shared salon calendar"}
                </span>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={reset}
                  disabled={busy || !ready}
                  className="text-[10px]"
                >
                  <RotateCcw className="size-3" /> Reset demo
                </Button>
              </div>
            </Card>
            <div className="mt-4 flex gap-3 px-1 text-xs leading-5 text-muted-foreground">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-[#a78663]" />
              <p>
                One conversation, less back-and-forth.
                <br />
                The assistant handles the details. Your team gets time back.
              </p>
            </div>
          </section>
        </div>
      </main>
      <footer className="mt-10 flex flex-wrap justify-between gap-3 border-t py-5 text-[11px] text-muted-foreground">
        <span>
          Built by William Lie ·{" "}
          <a href="https://github.com/Willi8910" className="hover:text-primary">
            github.com/Willi8910
          </a>
        </span>
        <span>A fictional studio. A working possibility.</span>
      </footer>
    </div>
  );
}
