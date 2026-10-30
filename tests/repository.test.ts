import { describe, expect, it } from "vitest";
import { createMemoryRepository } from "@/lib/db";
import { seedItems } from "@/lib/seed";

describe("in-memory item repository", () => {
  it("starts with independent copies of seeded data", async () => {
    const repository = createMemoryRepository();
    const items = await repository.list();
    expect(items).toHaveLength(seedItems.length);
    items[0].name = "Accidentally changed";
    expect((await repository.get(items[0].id))?.name).not.toBe(
      "Accidentally changed",
    );
    expect(seedItems.some((item) => item.name === "Accidentally changed")).toBe(
      false,
    );
  });
  it("creates, partially updates, and deletes an item", async () => {
    const repository = createMemoryRepository([]);
    const created = await repository.create({
      name: "New step",
      description: "Details",
      status: "planned",
    });
    expect(created.id).toMatch(/^[a-f0-9-]{36}$/);
    expect(Number.isNaN(Date.parse(created.createdAt))).toBe(false);
    const updated = await repository.update(created.id, { status: "done" });
    expect(updated).toMatchObject({
      ...created,
      status: "done",
      updatedAt: expect.any(String),
    });
    expect(await repository.delete(created.id)).toBe(true);
    expect(await repository.get(created.id)).toBeNull();
    expect(await repository.update(created.id, { name: "Gone" })).toBeNull();
    expect(await repository.delete(created.id)).toBe(false);
  });
  it("isolates instances and returns copies on create and update", async () => {
    const a = createMemoryRepository([]);
    const b = createMemoryRepository([]);
    const item = await a.create({
      name: "Original",
      description: "",
      status: "planned",
    });
    item.name = "Changed";
    expect((await a.get(item.id))?.name).toBe("Original");
    const update = await a.update(item.id, {
      name: "Updated",
      description: undefined,
    });
    update!.name = "Changed again";
    expect(await a.get(item.id)).toMatchObject({
      name: "Updated",
      description: "",
    });
    expect(await b.list()).toEqual([]);
  });
});
