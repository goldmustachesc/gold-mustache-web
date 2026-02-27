import { NextResponse } from "next/server";
import type {
  ApiSuccessResponse,
  ApiCollectionResponse,
  ApiMessageResponse,
  ApiErrorResponse,
  PaginationMeta,
} from "@/types/api";

/**
 * Wrap a payload in the standard `{ data }` envelope.
 */
export function apiSuccess<T>(
  data: T,
  status = 200,
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ data }, { status });
}

/**
 * Wrap an array payload with optional pagination metadata.
 */
export function apiCollection<T>(
  data: T[],
  meta?: PaginationMeta,
  status = 200,
): NextResponse<ApiCollectionResponse<T>> {
  return NextResponse.json(meta ? { data, meta } : { data }, { status });
}

/**
 * Return a status-only response for mutations without a meaningful body
 * (delete, toggle, mark-read, etc.).
 */
export function apiMessage(
  message?: string,
  status = 200,
): NextResponse<ApiMessageResponse> {
  return NextResponse.json(
    { success: true as const, ...(message ? { message } : {}) },
    { status },
  );
}

/**
 * Return a structured error response.
 */
export function apiError(
  code: string,
  message: string,
  status: number,
  details?: unknown,
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    { error: code, message, ...(details ? { details } : {}) },
    { status },
  );
}
