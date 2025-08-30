export interface WebSearchProvider {
  search(query: string, maxResults?: number): Promise<SearchResult[]>;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  relevanceScore?: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  summary: string;
  sources: string[];
  searchTime: number;
}
