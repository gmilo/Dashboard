export async function swrJsonFetcher<T>(input: RequestInfo | URL): Promise<T> {
  const response = await fetch(input, { method: "GET" });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Request failed: ${response.status}${text ? ` — ${text}` : ""}`);
  }
  return (await response.json()) as T;
}

