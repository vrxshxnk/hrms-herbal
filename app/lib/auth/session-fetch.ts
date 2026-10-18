// Refresh only this application's API requests; never forward tokens to another origin.
export function createSessionFetch(
  originalFetch: typeof fetch,
  origin: string,
  session: { token?: string; updateToken: (seconds: number) => Promise<boolean> },
  onRefresh: () => void,
): typeof fetch {
  return async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input), origin);
    if (url.origin !== origin || !url.pathname.startsWith("/api/") || !session.token) {
      return originalFetch(input, init);
    }

    // A failed refresh must not submit a mutation using a known-expired token.
    const refreshed = await session.updateToken(30);
    if (refreshed) onRefresh();
    if (!session.token) throw new Error("Your session has expired. Please sign in again.");
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    headers.set("Authorization", `Bearer ${session.token}`);
    return originalFetch(input, { ...init, headers });
  };
}
