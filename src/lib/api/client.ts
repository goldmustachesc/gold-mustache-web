/**
 * Typed API client helpers for frontend hooks/components.
 *
 * Usage:
 *   const barbers = await apiGet<BarberData[]>("/api/barbers");
 *   const appointment = await apiMutate<Appointment>("/api/appointments", "POST", body);
 *   await apiAction("/api/notifications/mark-all-read", "PATCH");
 */

import type { ApiMessageResponse } from "@/types/api";

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
 * Low-level helper: calls fetch, checks res.ok, extracts `json.data`,
 * and throws `ApiError` on failure.  Returns `T` directly.
 *
 * **Only for endpoints that return `{ data: T }` (i.e. `apiSuccess` / `apiCollection`).**
 * For side-effect endpoints that return `{ success, message? }` (i.e. `apiMessage`),
 * use {@link apiAction} instead.
 */
export async function apiRequest<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
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

  return json.data as T;
}

/** Convenience GET wrapper. Accepts optional extra headers. */
export async function apiGet<T>(
  url: string,
  headers?: Record<string, string>,
): Promise<T> {
  return apiRequest<T>(url, headers ? { headers } : undefined);
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
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

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

  return json as ApiMessageResponse;
}
