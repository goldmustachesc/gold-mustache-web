import type { PaginationMeta } from "@/types/api";

/**
 * Parse `page` and `limit` query params with sane defaults and bounds.
 * Default: page=1, limit=20, max limit=100.
 */
export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get("limit")) || 20),
  );
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * Build a `PaginationMeta` object from total count and current page/limit.
 */
export function paginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  return { total, page, limit, totalPages: Math.ceil(total / limit) };
}
