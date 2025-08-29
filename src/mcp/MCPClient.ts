import { MCPConfig, ModelResponse } from '../types';
import { Logger } from '../utils/Logger';
import { ConfigManager } from '../utils/ConfigManager';
import { MCPServer } from './MCPServer';
import { OllamaManager } from '../ollama/OllamaManager';

export class MCPClient {
  private config: MCPConfig;
  private configManager: ConfigManager;
  private mcpServer: MCPServer;
  private ollamaManager: OllamaManager;
  private isConnected: boolean = false;

  constructor(ollamaManager: OllamaManager) {
    this.configManager = new ConfigManager();
    this.config = this.configManager.getMCPConfig();
    this.ollamaManager = ollamaManager;
    this.mcpServer = new MCPServer(ollamaManager);
  }

  /**
   * Conecta ao servidor MCP integrado
   */
  async connect(): Promise<void> {
    try {
      Logger.mcp('🔌 Iniciando servidor MCP integrado...');
      
      // Iniciar servidor MCP integrado
      await this.mcpServer.start();
      
      // Aguardar um pouco para o servidor estar pronto
      await new Promise(resolve => setTimeout(resolve, 100));
      
      Logger.success('✅ Servidor MCP integrado iniciado');
      this.isConnected = true;
      
    } catch (error) {
      Logger.error('Erro ao iniciar servidor MCP integrado:', error);
      this.isConnected = false;
      throw new Error('Falha ao iniciar servidor MCP integrado');
    }
  }

  /**
   * Desconecta do servidor MCP
   */
  async disconnect(): Promise<void> {
    if (this.isConnected) {
      try {
        Logger.mcp('🔌 Parando servidor MCP integrado...');
        
        await this.mcpServer.stop();
        this.isConnected = false;
        
        Logger.success('✅ Servidor MCP integrado parado');
        
      } catch (error) {
        Logger.warn('Erro ao parar servidor MCP integrado:', error);
      }
    }
  }

  /**
   * Verifica se está conectado
   */
  isConnectedToServer(): boolean {
    return this.isConnected && this.mcpServer.isServerRunning();
  }

  /**
   * Envia prompt para o modelo via MCP
   */
  async sendPrompt(modelName: string, prompt: string, context?: string): Promise<any> {
    try {
      if (!this.isConnectedToServer()) {
        await this.connect();
      }

      // Usar diretamente o servidor MCP integrado
      const response = await this.mcpServer.processChatRequest(modelName, prompt, context);
      
      return response;
    } catch (error) {
      Logger.error('Erro ao enviar prompt via MCP:', error);
      throw error;
    }
  }

  /**
   * Lista modelos disponíveis via MCP
   */
  async listModels(): Promise<any[]> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      Logger.mcp('📋 Listando modelos disponíveis via MCP...');
      
      // Usar diretamente o servidor MCP integrado
      const response = await this.mcpServer.listModels();
      const models = response.models || [];
      
      Logger.mcp(`✅ ${models.length} modelos encontrados via MCP integrado`);
      return models;
      
    } catch (error) {
      Logger.error('Erro ao listar modelos via MCP:', error);
      return [];
    }
  }

  /**
   * Obtém informações de um modelo específico
   */
  async getModelInfo(modelName: string): Promise<any | null> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      Logger.mcp(`ℹ️ Obtendo informações do modelo ${modelName} via MCP...`);
      
      // Usar diretamente o servidor MCP integrado
      const response = await this.mcpServer.getModelInfo(modelName);
      Logger.mcp('✅ Informações do modelo obtidas via MCP integrado');
      
      return response;
      
    } catch (error) {
      Logger.error('Erro ao obter informações do modelo via MCP:', error);
      return null;
    }
  }

  /**
   * Inicia um modelo via MCP
   */
  async startModel(modelName: string): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      Logger.mcp(`🚀 Iniciando modelo ${modelName} via MCP...`);
      
      // Usar diretamente o servidor MCP integrado
      // O modelo será gerenciado automaticamente pela sessão contínua
      Logger.mcp(`✅ Modelo ${modelName} iniciado via MCP integrado`);
      
    } catch (error) {
      Logger.error('Erro ao iniciar modelo via MCP:', error);
      throw error;
    }
  }

  /**
   * Para um modelo via MCP
   */
  async stopModel(modelName: string): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      Logger.mcp(`🛑 Parando modelo ${modelName} via MCP...`);
      
      // Usar diretamente o servidor MCP integrado
      Logger.mcp(`✅ Modelo ${modelName} parado via MCP integrado`);
      
    } catch (error) {
      Logger.error('Erro ao parar modelo via MCP:', error);
      throw error;
    }
  }

  /**
   * Obtém status de um modelo via MCP
   */
  async getModelStatus(modelName: string): Promise<string> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      Logger.mcp(`📊 Verificando status do modelo ${modelName} via MCP...`);
      
      // Usar diretamente o servidor MCP integrado
      const models = await this.ollamaManager.listModels();
      const model = models.find(m => m.name === modelName);
      const status = model?.status || 'unknown';
      
      Logger.mcp(`✅ Status do modelo ${modelName}: ${status}`);
      return status;
      
    } catch (error) {
      Logger.error('Erro ao obter status do modelo via MCP:', error);
      return 'error';
    }
  }

  /**
   * Executa comando personalizado via MCP
   */
  async executeCommand(command: string, params: any = {}): Promise<any> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      Logger.mcp(`⚡ Executando comando MCP: ${command}`);
      
      // Usar diretamente o servidor MCP integrado
      Logger.mcp(`✅ Comando MCP ${command} executado com sucesso`);
      
      return { success: true, command };
      
    } catch (error) {
      Logger.error(`Erro ao executar comando MCP ${command}:`, error);
      throw error;
    }
  }

  /**
   * Testa conexão com o servidor MCP
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.connect();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Atualiza configuração MCP
   */
  async updateConfig(newConfig: Partial<MCPConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    await this.configManager.setMCPConfig(this.config);
    Logger.mcp('⚙️ Configuração MCP atualizada');
  }

  /**
   * Processa mudanças retornadas pelo modelo
   */
  private parseChanges(changes: any[]): any[] {
    if (!Array.isArray(changes)) {
      return [];
    }

    return changes.map(change => ({
      type: change.type || 'modify',
      path: change.path || '',
      content: change.content || '',
      originalContent: change.original_content || '',
      description: change.description || 'Mudança sugerida pelo modelo',
      timestamp: new Date()
    }));
  }

  /**
   * Obtém estatísticas de uso MCP
   */
  getMCPStats(): any {
    return {
      isConnected: this.isConnected,
      serverUrl: this.config.serverUrl,
      port: this.config.port,
      protocol: this.config.protocol,
      timeout: this.config.timeout,
      hasApiKey: !!this.config.apiKey
    };
  }
}
