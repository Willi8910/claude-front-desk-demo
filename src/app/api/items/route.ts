import { NextResponse } from "next/server";
import { apiHandler, readJson } from "@/lib/api";
import { getItemRepository } from "@/lib/db";
import { createItemSchema } from "@/lib/schemas/item";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  return apiHandler(async () =>
    NextResponse.json({ data: await (await getItemRepository()).list() }),
  );
}
export async function POST(request: Request) {
  return apiHandler(async () => {
    const input = await readJson(request, createItemSchema);
    const item = await (await getItemRepository()).create(input);
    return NextResponse.json(
      { data: item },
      { status: 201, headers: { Location: `/api/items/${item.id}` } },
    );
  });
}
