import { NextResponse } from "next/server";
import { apiHandler, notFound, readJson } from "@/lib/api";
import { getItemRepository } from "@/lib/db";
import { itemIdSchema, updateItemSchema } from "@/lib/schemas/item";

type Context = { params: Promise<{ id: string }> };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: Context) {
  return apiHandler(async () => {
    const id = itemIdSchema.parse((await context.params).id);
    const item = await (await getItemRepository()).get(id);
    if (!item) notFound();
    return NextResponse.json({ data: item });
  });
}
export async function PATCH(request: Request, context: Context) {
  return apiHandler(async () => {
    const id = itemIdSchema.parse((await context.params).id);
    const patch = await readJson(request, updateItemSchema);
    const item = await (await getItemRepository()).update(id, patch);
    if (!item) notFound();
    return NextResponse.json({ data: item });
  });
}
export async function DELETE(_request: Request, context: Context) {
  return apiHandler(async () => {
    const id = itemIdSchema.parse((await context.params).id);
    if (!(await (await getItemRepository()).delete(id))) notFound();
    return new Response(null, { status: 204 });
  });
}
