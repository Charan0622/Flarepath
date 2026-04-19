import { NextResponse } from "next/server";

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(
    { data, error: null, meta: { traceId: crypto.randomUUID() } },
    { status }
  );
}

export function apiError(message: string, status = 400) {
  return NextResponse.json(
    { data: null, error: message, meta: { traceId: crypto.randomUUID() } },
    { status }
  );
}
