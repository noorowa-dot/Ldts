import "server-only";
import { NextResponse } from "next/server";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
export function err(error: string, message: string, status = 400, extra: Record<string, unknown> = {}) {
  return json({ error, message, ...extra }, status);
}
