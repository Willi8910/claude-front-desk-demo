import { describe, expect, it } from "vitest";
import {
  createItemSchema,
  itemFormSchema,
  itemIdSchema,
  updateItemSchema,
} from "@/lib/schemas/item";

describe("item validation", () => {
  it("trims input and applies creation defaults", () => {
    expect(createItemSchema.parse({ name: "  Ship demo  " })).toEqual({
      name: "Ship demo",
      description: "",
      status: "planned",
    });
  });
  it.each([
    {},
    { name: " " },
    { name: 42 },
    { name: "x".repeat(101) },
    { name: "Valid", status: "unknown" },
    { name: "Valid", description: "x".repeat(1001) },
    { name: "Valid", id: "injected" },
    { name: "Valid", description: null },
  ])("rejects invalid creation data: %j", (input) => {
    expect(createItemSchema.safeParse(input).success).toBe(false);
  });
  it("permits nonempty partial updates without inserting defaults", () => {
    expect(updateItemSchema.parse({ status: "done" })).toEqual({
      status: "done",
    });
    expect(updateItemSchema.parse({ description: "" })).toEqual({
      description: "",
    });
    expect(updateItemSchema.safeParse({}).success).toBe(false);
    expect(updateItemSchema.safeParse({ name: undefined }).success).toBe(false);
    expect(updateItemSchema.safeParse({ unknown: true }).success).toBe(false);
    expect(updateItemSchema.safeParse({ name: " " }).success).toBe(false);
  });
  it("requires explicit form fields and UUID route IDs", () => {
    expect(itemFormSchema.safeParse({ name: "Name" }).success).toBe(false);
    expect(itemIdSchema.safeParse("not-a-uuid").success).toBe(false);
    expect(
      itemIdSchema.safeParse("a1111111-1111-4111-8111-111111111111").success,
    ).toBe(true);
  });
});
