import "server-only";
import { randomUUID } from "node:crypto";
import type { Item, ItemInput, ItemPatch } from "@/lib/schemas/item";
import { seedItems } from "@/lib/seed";

export interface ItemRepository {
  list(): Promise<Item[]>;
  get(id: string): Promise<Item | null>;
  create(input: ItemInput): Promise<Item>;
  update(id: string, patch: ItemPatch): Promise<Item | null>;
  delete(id: string): Promise<boolean>;
}

// Copies at the boundary prevent callers from mutating stored records.
export function createMemoryRepository(
  seed: readonly Item[] = seedItems,
): ItemRepository {
  const rows = new Map(seed.map((item) => [item.id, { ...item }]));
  return {
    async list() {
      return [...rows.values()]
        .sort(
          (a, b) =>
            b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id),
        )
        .map((row) => ({ ...row }));
    },
    async get(id) {
      return rows.has(id) ? { ...rows.get(id)! } : null;
    },
    async create(input) {
      const now = new Date().toISOString();
      const item: Item = {
        ...input,
        id: randomUUID(),
        createdAt: now,
        updatedAt: now,
      };
      rows.set(item.id, item);
      return { ...item };
    },
    async update(id, patch) {
      const previous = rows.get(id);
      if (!previous) return null;
      const defined = Object.fromEntries(
        Object.entries(patch).filter(([, value]) => value !== undefined),
      );
      const item = {
        ...previous,
        ...defined,
        updatedAt: new Date().toISOString(),
      };
      rows.set(id, item);
      return { ...item };
    },
    async delete(id) {
      return rows.delete(id);
    },
  };
}

type RepositoryCache = {
  url: string | undefined;
  repository: Promise<ItemRepository>;
};
const globalStore = globalThis as typeof globalThis & {
  itemRepositoryCache?: RepositoryCache;
};

export function getItemRepository(): Promise<ItemRepository> {
  const url = process.env.DATABASE_URL?.trim() || undefined;
  if (
    !globalStore.itemRepositoryCache ||
    globalStore.itemRepositoryCache.url !== url
  ) {
    const repository = url
      ? import("@/db/postgres").then(({ createPostgresRepository }) =>
          createPostgresRepository(url),
        )
      : Promise.resolve(createMemoryRepository());
    globalStore.itemRepositoryCache = { url, repository };
  }
  return globalStore.itemRepositoryCache.repository;
}
