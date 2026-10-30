import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { ItemRepository } from "@/lib/db";
import { items } from "@/db/schema";

export function createPostgresRepository(url: string): ItemRepository {
  // Small pool and no prepared statements suit pooled serverless connections.
  const client = postgres(url, {
    max: 1,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  const db = drizzle(client);
  return {
    async list() {
      return db
        .select()
        .from(items)
        .orderBy(desc(items.createdAt), asc(items.id));
    },
    async get(id) {
      return (await db.select().from(items).where(eq(items.id, id)))[0] ?? null;
    },
    async create(input) {
      return (await db.insert(items).values(input).returning())[0];
    },
    async update(id, patch) {
      return (
        (
          await db
            .update(items)
            .set({ ...patch, updatedAt: new Date().toISOString() })
            .where(eq(items.id, id))
            .returning()
        )[0] ?? null
      );
    },
    async delete(id) {
      return (
        (
          await db
            .delete(items)
            .where(eq(items.id, id))
            .returning({ id: items.id })
        ).length > 0
      );
    },
  };
}
