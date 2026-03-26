/**
 * Typed API client helpers for frontend hooks/components.
 *
 * Usage:
 *   const barbers = await apiGet<BarberData[]>("/api/barbers");
 *   const appointment = await apiMutate<Appointment>("/api/appointments", "POST", body);
 *   await apiAction("/api/notifications/mark-all-read", "PATCH");
 */

import type { ApiMessageResponse, ApiCollectionResponse } from "@/types/api";

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(
    code: string,
    message: string,
    status: number,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/**
 * Shared fetch + JSON parse + error handling.
 * Returns the raw parsed JSON body so callers can extract what they need.
 */
async function apiRawRequest(
  url: string,
  options?: RequestInit,
): Promise<Record<string, unknown>> {
  const res = await fetch(url, options);
  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      json?.error ?? "UNKNOWN_ERROR",
      json?.message ?? `Request failed with status ${res.status}`,
      res.status,
      json?.details,
    );
  }

  if (json === null) {
    throw new ApiError(
      "PARSE_ERROR",
      "Response body is not valid JSON",
      res.status,
    );
  }

  return json;
}

/**
 * Calls an API endpoint and unwraps `json.data`.
 *
 * For endpoints that return `{ data: T }` (i.e. `apiSuccess` / `apiCollection`).
 * For side-effect endpoints that return `{ success, message? }`, use {@link apiAction}.
 */
export async function apiRequest<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const json = await apiRawRequest(url, options);
  return json.data as T;
}

/** Convenience GET wrapper. Accepts optional extra headers. */
export async function apiGet<T>(
  url: string,
  headers?: Record<string, string>,
): Promise<T> {
  return apiRequest<T>(url, headers ? { headers } : undefined);
}

/**
 * GET wrapper for paginated collection endpoints.
 * Returns `{ data: T[], meta: PaginationMeta }` instead of unwrapping `data`.
 */
export async function apiGetCollection<T>(
  url: string,
  headers?: Record<string, string>,
): Promise<ApiCollectionResponse<T>> {
  const json = await apiRawRequest(url, headers ? { headers } : undefined);
  return json as unknown as ApiCollectionResponse<T>;
}

/** Convenience POST/PUT/PATCH/DELETE wrapper with JSON body. */
export async function apiMutate<T>(
  url: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
  headers?: Record<string, string>,
): Promise<T> {
  return apiRequest<T>(url, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

/**
 * Convenience wrapper for side-effect endpoints that return
 * `{ success: true, message? }` (i.e. routes using `apiMessage`).
 */
export async function apiAction(
  url: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
  headers?: Record<string, string>,
): Promise<ApiMessageResponse> {
  const json = await apiRawRequest(url, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return json as unknown as ApiMessageResponse;
}
