import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRepository } from "@/lib/db";
import { GET, POST } from "@/app/api/items/route";
import { GET as getOne, PATCH, DELETE } from "@/app/api/items/[id]/route";

const holder = vi.hoisted(() => ({ repository: null as unknown }));
vi.mock("@/lib/db", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/db")>();
  return { ...original, getItemRepository: async () => holder.repository };
});
beforeEach(() => {
  holder.repository = createMemoryRepository([]);
});
const req = (method: string, body?: unknown) =>
  new Request("http://localhost/api/items", {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const context = (id: string) => ({ params: Promise.resolve({ id }) });

describe("items route contract", () => {
  it("roundtrips all CRUD endpoints", async () => {
    const response = await POST(req("POST", { name: "Demo item" }));
    expect(response.status).toBe(201);
    const { data: item } = await response.json();
    expect(response.headers.get("Location")).toBe(`/api/items/${item.id}`);
    expect((await (await GET()).json()).data).toHaveLength(1);
    expect(
      (await (await getOne(req("GET"), context(item.id))).json()).data.name,
    ).toBe("Demo item");
    expect(
      (
        await (
          await PATCH(req("PATCH", { status: "done" }), context(item.id))
        ).json()
      ).data.status,
    ).toBe("done");
    expect((await DELETE(req("DELETE"), context(item.id))).status).toBe(204);
    expect((await getOne(req("GET"), context(item.id))).status).toBe(404);
    expect(
      (await PATCH(req("PATCH", { name: "Missing" }), context(item.id))).status,
    ).toBe(404);
    expect((await DELETE(req("DELETE"), context(item.id))).status).toBe(404);
  });
  it("returns JSON errors for malformed bodies, invalid fields, IDs, and empty patches", async () => {
    const malformed = await POST(
      new Request("http://localhost/api/items", { method: "POST", body: "{" }),
    );
    expect(malformed.status).toBe(400);
    expect((await malformed.json()).error.message).toContain("valid JSON");
    expect((await POST(req("POST", { name: "" }))).status).toBe(400);
    expect((await getOne(req("GET"), context("bad"))).status).toBe(400);
    expect(
      (
        await PATCH(
          req("PATCH", {}),
          context("a1111111-1111-4111-8111-111111111111"),
        )
      ).status,
    ).toBe(400);
  });
  it("hides unexpected database failures", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    holder.repository = {
      list: async () => {
        throw new Error("private connection details");
      },
    };
    const response = await GET();
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain(
      "private connection details",
    );
    log.mockRestore();
  });
});
