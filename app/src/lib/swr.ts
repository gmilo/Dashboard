export async function swrJsonFetcher<T>(input: RequestInfo | URL): Promise<T> {
  const response = await fetch(input, { method: "GET" });
  const text = await response.text().catch(() => "");

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})${text ? ` — ${text.slice(0, 180)}` : ""}`);
  }

  if (!text.trim()) {
    throw new Error("Empty response body");
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON response${text ? ` — ${text.slice(0, 180)}` : ""}`);
  }
}
