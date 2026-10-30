import type { Item } from "@/lib/schemas/item";

export const seedItems: Item[] = [
  {
    id: "a1111111-1111-4111-8111-111111111111",
    name: "Map the core workflow",
    description: "Turn the brief into a simple, useful customer journey.",
    status: "done",
    createdAt: "2026-01-01T09:00:00.000Z",
    updatedAt: "2026-01-01T09:00:00.000Z",
  },
  {
    id: "b2222222-2222-4222-8222-222222222222",
    name: "Build the first working demo",
    description: "A small, focused example of the feature that matters most.",
    status: "in_progress",
    createdAt: "2026-01-02T09:00:00.000Z",
    updatedAt: "2026-01-02T09:00:00.000Z",
  },
  {
    id: "c3333333-3333-4333-8333-333333333333",
    name: "Gather feedback",
    description:
      "Share the demo, explore the details, and decide what comes next.",
    status: "planned",
    createdAt: "2026-01-03T09:00:00.000Z",
    updatedAt: "2026-01-03T09:00:00.000Z",
  },
];
