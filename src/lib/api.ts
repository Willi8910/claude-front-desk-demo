import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function notFound(): never {
  throw new ApiError(404, "Item not found.");
}
export async function readJson<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, "Request body must be valid JSON.");
  }
  return schema.parse(body);
}
export async function apiHandler(
  handler: () => Promise<Response>,
): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: { message: "Validation failed.", issues: error.issues } },
        { status: 400 },
      );
    }
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: { message: error.message } },
        { status: error.status },
      );
    }
    console.error("[api] Request failed", error);
    return NextResponse.json(
      { error: { message: "Something went wrong. Please try again." } },
      { status: 500 },
    );
  }
}
