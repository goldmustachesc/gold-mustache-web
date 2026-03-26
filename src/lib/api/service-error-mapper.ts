import { apiError } from "@/lib/api/response";

export function mapServiceErrorToResponse(error: Error) {
  const message = error.message;

  if (message.includes("não encontrad")) {
    return apiError("NOT_FOUND", message, 404);
  }

  return apiError("BAD_REQUEST", message, 400);
}
