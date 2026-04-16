export function makeRequest(secret?: string): Request {
  return {
    headers: {
      get: (name: string) =>
        name === "authorization" && secret ? `Bearer ${secret}` : null,
    },
  } as unknown as Request;
}
