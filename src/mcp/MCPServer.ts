import { OllamaManager } from '../ollama/OllamaManager';
import { Logger } from '../utils/Logger';

export class MCPServer {
  private ollamaManager: OllamaManager;
  private isRunning: boolean = false;
  private responseCache = new Map<string, { response: any; timestamp: number; ttl: number }>();
  private readonly CACHE_TTL = 30000; // 30 segundos

  constructor(ollamaManager: OllamaManager) {
    this.ollamaManager = ollamaManager;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      Logger.mcp('⚠️ Servidor MCP já está rodando');
      return;
    }
    try {
      Logger.mcp('🚀 Iniciando servidor MCP integrado...');
      this.isRunning = true;
      Logger.success('✅ Servidor MCP integrado iniciado');
    } catch (error) {
      Logger.error('Erro ao iniciar servidor MCP integrado:', error);
      this.isRunning = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }
    try {
      Logger.mcp('🛑 Parando servidor MCP...');
      this.isRunning = false;
      Logger.success('✅ Servidor MCP parado');
    } catch (error) {
      Logger.error('Erro ao parar servidor MCP:', error);
    }
  }

  isServerRunning(): boolean {
    return this.isRunning;
  }

  async processChatRequest(modelName: string, prompt: string, context?: string): Promise<any> {
    try {
      // Verificar cache primeiro
      const cacheKey = `${modelName}:${this.hashString(prompt + (context || ''))}`;
      const cached = this.responseCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        return cached.response;
      }

      // Processar em paralelo para melhor performance
      const [ollamaResponse] = await Promise.all([
        this.ollamaManager.generateResponse(modelName, prompt, context),
        this.cleanExpiredCache() // Limpar cache em background
      ]);

      const response = {
        content: [
          {
            type: 'text',
            text: ollamaResponse.response
          }
        ],
        changes: [],
        suggestions: [],
        confidence: 0.8
      };

      // Cache da resposta
      this.responseCache.set(cacheKey, {
        response,
        timestamp: Date.now(),
        ttl: this.CACHE_TTL
      });

      return response;
    } catch (error) {
      Logger.error('Erro no processamento de chat:', error);
      throw error;
    }
  }

  async listModels(): Promise<any> {
    try {
      Logger.mcp('📋 Listando modelos disponíveis...');
      const models = await this.ollamaManager.listModels();
      return {
        models: models.map(model => ({
          name: model.name,
          description: model.description || 'Sem descrição',
          size: model.size || 'Desconhecido',
          parameters: model.parameters || 0,
          contextLength: model.contextLength || 0
        }))
      };
    } catch (error) {
      Logger.error('Erro ao listar modelos:', error);
      throw error;
    }
  }

  async getModelInfo(modelName: string): Promise<any> {
    try {
      Logger.mcp(`ℹ️ Obtendo informações do modelo: ${modelName}`);
      const models = await this.ollamaManager.listModels();
      const model = models.find(m => m.name === modelName);
      if (!model) {
        throw new Error(`Modelo ${modelName} não encontrado`);
      }
      return {
        name: model.name,
        description: model.description || 'Sem descrição',
        size: model.size || 'Desconhecido',
        parameters: model.parameters || 0,
        contextLength: model.contextLength || 0,
        status: model.status || 'unknown'
      };
    } catch (error) {
      Logger.error('Erro ao obter informações do modelo:', error);
      throw error;
    }
  }

  /**
   * Hash simples para cache
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  /**
   * Limpa cache expirado
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.responseCache.entries()) {
      if (now - value.timestamp > value.ttl) {
        this.responseCache.delete(key);
      }
    }
  }

  /**
   * Limpa cache manualmente
   */
  clearCache(): void {
    this.responseCache.clear();
    Logger.mcp('🗑️ Cache MCP limpo');
  }
}
