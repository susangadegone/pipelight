import "server-only";

export type SearchResult = { title: string; url: string; content: string };

export async function tavilySearch(query: string, maxResults = 6): Promise<SearchResult[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.TAVILY_API_KEY}` },
    body: JSON.stringify({ query, max_results: maxResults, search_depth: "basic", topic: "general" }),
  });
  if (!res.ok) throw new Error(`Tavily ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return (data.results ?? []).map((r: SearchResult) => ({ title: r.title, url: r.url, content: (r.content ?? "").slice(0, 1200) }));
}
