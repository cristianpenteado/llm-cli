import { WebSearchProvider, SearchResult, SearchResponse } from '../../domain/search/WebSearch';
import { Agent } from '../../domain/agent/Agent';

export class WebSearchService {
  constructor(
    private searchProvider: WebSearchProvider,
    private agent: Agent
  ) {}

  async searchAndSummarize(query: string, maxResults: number = 5): Promise<SearchResponse> {
    const startTime = Date.now();
    
    try {
      // Perform web search
      const results = await this.searchProvider.search(query, maxResults);
      
      if (results.length === 0) {
        return {
          query,
          results: [],
          summary: `Não foram encontrados resultados para "${query}". Tente reformular a consulta ou usar termos mais específicos.`,
          sources: [],
          searchTime: Date.now() - startTime
        };
      }

      // Create context from search results
      const searchContext = this.buildSearchContext(query, results);
      
      // Generate refined summary using the agent
      const summaryPrompt = `Com base nos resultados de pesquisa abaixo, crie um resumo conciso e relevante sobre "${query}".

RESULTADOS DA PESQUISA:
${searchContext}

INSTRUÇÕES:
- Seja direto e objetivo
- Foque apenas no que foi perguntado
- Use informações dos resultados fornecidos
- Mantenha credibilidade citando as fontes
- Máximo 300 palavras
- Se for técnico, inclua exemplos práticos quando possível`;

      const agentResponse = await this.agent.processQuery(summaryPrompt);
      
      return {
        query,
        results,
        summary: agentResponse.content,
        sources: results.map(r => r.source),
        searchTime: Date.now() - startTime
      };

    } catch (error: any) {
      return {
        query,
        results: [],
        summary: `Erro na pesquisa: ${error.message}. Tente novamente ou reformule a consulta.`,
        sources: [],
        searchTime: Date.now() - startTime
      };
    }
  }

  private buildSearchContext(query: string, results: SearchResult[]): string {
    return results.map((result, index) => 
      `${index + 1}. **${result.title}**
   Fonte: ${result.source}
   URL: ${result.url}
   Conteúdo: ${result.snippet}
   ---`
    ).join('\n\n');
  }

  isSearchQuery(input: string): boolean {
    const searchKeywords = [
      'pesquisar', 'pesquise', 'buscar', 'busque', 'procurar', 'procure',
      'search', 'find', 'lookup', 'google', 'what is', 'o que é',
      'como funciona', 'how does', 'explain', 'explique',
      'informações sobre', 'information about', 'tell me about',
      'me fale sobre', 'quero saber sobre'
    ];

    const lowerInput = input.toLowerCase();
    return searchKeywords.some(keyword => lowerInput.includes(keyword)) ||
           lowerInput.startsWith('o que é') ||
           lowerInput.startsWith('what is') ||
           lowerInput.includes('?') && (lowerInput.includes('como') || lowerInput.includes('how'));
  }

  extractSearchQuery(input: string): string {
    // Remove common search prefixes
    let cleanQuery = input
      .replace(/^(pesquisar|pesquise|buscar|busque|procurar|procure)\s+/i, '')
      .replace(/^(search|find|lookup)\s+/i, '')
      .replace(/^(o que é|what is)\s+/i, '')
      .replace(/^(como funciona|how does)\s+/i, '')
      .replace(/^(explique|explain)\s+/i, '')
      .replace(/^(informações sobre|information about)\s+/i, '')
      .replace(/^(tell me about|me fale sobre)\s+/i, '')
      .replace(/^(quero saber sobre)\s+/i, '')
      .trim();

    return cleanQuery || input;
  }
}
