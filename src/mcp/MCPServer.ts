import { OllamaManager } from '../ollama/OllamaManager';
import { Logger } from '../utils/Logger';

export class MCPServer {
  private ollamaManager: OllamaManager;
  private isRunning: boolean = false;

  constructor(ollamaManager: OllamaManager) {
    this.ollamaManager = ollamaManager;
  }

  /**
   * Inicia o servidor MCP integrado
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      Logger.mcp('⚠️ Servidor MCP já está rodando');
      return;
    }

    try {
      Logger.mcp('🚀 Iniciando servidor MCP integrado...');
      
      // Para simplificar, apenas marcamos como rodando
      // Em uma implementação real, você pode usar WebSockets ou IPC
      this.isRunning = true;
      
      Logger.success('✅ Servidor MCP integrado iniciado');
      
    } catch (error) {
      Logger.error('Erro ao iniciar servidor MCP:', error);
      throw error;
    }
  }

  /**
   * Para o servidor MCP
   */
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

  /**
   * Verifica se o servidor está rodando
   */
  isServerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Processa uma requisição de chat
   */
  async processChatRequest(modelName: string, prompt: string, context?: string): Promise<any> {
    try {
      Logger.mcp(`💬 Processando chat para modelo: ${modelName}`);
      
      // Enviar prompt para o Ollama
      const ollamaResponse = await this.ollamaManager.generateResponse(modelName, prompt, context);
      
      return {
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
      
    } catch (error) {
      Logger.error('Erro no processamento de chat:', error);
      throw error;
    }
  }

  /**
   * Lista modelos disponíveis
   */
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

  /**
   * Obtém informações de um modelo
   */
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
}
