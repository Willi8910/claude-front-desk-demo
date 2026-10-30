import Link from "next/link";
import { ArrowRight, Check, Circle, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { demo } from "@/config/demo";

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8">
      <section className="grid items-center gap-14 py-16 sm:py-24 lg:grid-cols-[1.15fr_1fr] lg:gap-20">
        <div>
          <Badge
            variant="outline"
            className="mb-7 gap-2 rounded-full border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-800"
          >
            <Sparkles className="size-3.5" /> Demo for {demo.clientName}
          </Badge>
          <h1 className="max-w-2xl text-5xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-6xl">
            {demo.projectTitle}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            {demo.summary}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-5">
            <Button asChild size="lg" className="rounded-full px-6">
              <Link href="/items">
                Explore the workspace <ArrowRight className="size-4" />
              </Link>
            </Button>
            <span className="text-sm text-muted-foreground">
              Ready to try. No sign-up needed.
            </span>
          </div>
        </div>
        <div className="relative rounded-3xl border border-emerald-100 bg-emerald-50/70 p-6 sm:p-9">
          <div className="mb-6 flex items-center justify-between text-xs font-medium uppercase tracking-widest text-emerald-800">
            <span>Your next chapter</span>
            <span className="flex size-7 items-center justify-center rounded-full bg-white">
              ↗
            </span>
          </div>
          <Card className="gap-0 overflow-hidden rounded-2xl border-white bg-white py-0 shadow-xl shadow-emerald-950/5">
            <div className="border-b px-5 py-5">
              <div className="mb-1 text-xs text-muted-foreground">
                A little clarity goes a long way
              </div>
              <h2 className="font-semibold">Make room for meaningful work.</h2>
            </div>
            <CardContent className="space-y-5 p-5">
              {[
                { title: "Start with the essentials", done: true },
                { title: "Bring the workflow to life", done: true },
                { title: "Shape what comes next", done: false },
              ].map((row) => (
                <div
                  key={row.title}
                  className="flex items-center gap-3 text-sm"
                >
                  {row.done ? (
                    <span className="rounded-full bg-emerald-100 p-1 text-emerald-700">
                      <Check className="size-3.5" />
                    </span>
                  ) : (
                    <Circle className="mx-1 size-3.5 text-emerald-600" />
                  )}
                  <span>{row.title}</span>
                </div>
              ))}
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-2/3 rounded-full bg-primary" />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Small steps, real progress</span>
                <span>02 / 03</span>
              </div>
            </CardContent>
          </Card>
          <p className="mt-5 text-center text-xs text-emerald-900/70">
            Designed to get the conversation started.
          </p>
        </div>
      </section>
      <section
        className="border-t py-12 sm:py-16"
        aria-labelledby="features-heading"
      >
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
          The idea in action
        </p>
        <h2
          id="features-heading"
          className="text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          Simple where it should be.
        </h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {demo.features.map((feature, index) => (
            <Card
              key={feature.title}
              className="rounded-2xl border-border/70 shadow-none"
            >
              <CardContent className="pt-1">
                <span className="text-xs font-medium text-emerald-700">
                  0{index + 1}
                </span>
                <h3 className="mt-5 font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
