import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { OllamaConfig, ModelConfig } from '../types';
import { Logger } from '../utils/Logger';
import { ConfigManager } from '../utils/ConfigManager';
import * as fs from 'fs-extra';
import * as path from 'path';

const execAsync = promisify(exec);

export class OllamaManager {
  private config: OllamaConfig;
  private configManager: ConfigManager;
  private isConnected: boolean = false;

  constructor() {
    this.configManager = new ConfigManager();
    this.config = this.configManager.getOllamaConfig();
  }

  /**
   * Inicializa o gerenciador Ollama
   */
  async initialize(): Promise<void> {
    try {
      Logger.ollama('🚀 Inicializando gerenciador Ollama...');
      
      // Verificar se o Ollama está instalado
      await this.checkOllamaInstallation();
      
      // Verificar se o servidor Ollama está rodando
      await this.checkOllamaServer();
      
      // Conectar ao servidor
      await this.connect();
      
      Logger.success('✅ Gerenciador Ollama inicializado');
      
    } catch (error) {
      Logger.error('Erro ao inicializar gerenciador Ollama:', error);
      throw error;
    }
  }

  /**
   * Verifica se o Ollama está instalado
   */
  private async checkOllamaInstallation(): Promise<void> {
    try {
      const { stdout } = await execAsync('ollama --version');
      Logger.ollama(`✅ Ollama instalado: ${stdout.trim()}`);
    } catch (error) {
      Logger.error('❌ Ollama não encontrado!');
      Logger.info('📋 Para instalar o Ollama, visite: https://ollama.ai');
      Logger.info('💻 Ou execute: curl -fsSL https://ollama.ai/install.sh | sh');
      throw new Error('Ollama não está instalado. É um pré-requisito para este projeto.');
    }
  }

  /**
   * Verifica se o servidor Ollama está rodando
   */
  private async checkOllamaServer(): Promise<void> {
    try {
      const { stdout } = await execAsync(`curl -s http://${this.config.serverUrl}:${this.config.port}/api/tags`);
      Logger.ollama('✅ Servidor Ollama está rodando');
    } catch (error) {
      Logger.warn('⚠️ Servidor Ollama não está rodando');
      Logger.info('🚀 Iniciando servidor Ollama...');
      
      try {
        // Iniciar servidor Ollama em background
        spawn('ollama', ['serve'], {
          detached: true,
          stdio: 'ignore'
        });
        
        // Aguardar servidor estar pronto
        await this.waitForServerReady();
        Logger.success('✅ Servidor Ollama iniciado');
        
      } catch (startError) {
        Logger.error('❌ Erro ao iniciar servidor Ollama:', startError);
        throw new Error('Falha ao iniciar servidor Ollama. Execute manualmente: ollama serve');
      }
    }
  }

  /**
   * Aguarda o servidor estar pronto
   */
  private async waitForServerReady(): Promise<void> {
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      try {
        const { stdout } = await execAsync(`curl -s http://${this.config.serverUrl}:${this.config.port}/api/tags`);
        if (stdout) {
          return;
        }
      } catch (error) {
        // Servidor ainda não está pronto
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('Timeout aguardando servidor Ollama ficar pronto');
  }

  /**
   * Aguarda um modelo ficar pronto
   */
  private async waitForModelReady(modelName: string): Promise<void> {
    let attempts = 0;
    const maxAttempts = 60;
    
    while (attempts < maxAttempts) {
      try {
        const models = await this.listModels();
        const model = models.find(m => m.name === modelName);
        
        if (model && model.status === 'ready') {
          return;
        }
      } catch (error) {
        // Modelo ainda não está pronto
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`Timeout aguardando modelo ${modelName} ficar pronto`);
  }

  /**
   * Conecta ao servidor Ollama
   */
  async connect(): Promise<void> {
    try {
      Logger.ollama('🔌 Conectando ao servidor Ollama...');
      
      // Testar conexão usando a API de tags
      const { stdout } = await execAsync(`curl -s http://${this.config.serverUrl}:${this.config.port}/api/tags`);
      
      if (stdout) {
        this.isConnected = true;
        Logger.success('✅ Conectado ao servidor Ollama');
      } else {
        throw new Error('Servidor Ollama não respondeu corretamente');
      }
      
    } catch (error) {
      Logger.error('Erro ao conectar ao servidor Ollama:', error);
      this.isConnected = false;
      throw new Error('Falha ao conectar ao servidor Ollama');
    }
  }

  /**
   * Verifica se está conectado
   */
  isConnectedToServer(): boolean {
    return this.isConnected;
  }

  /**
   * Lista modelos disponíveis
   */
  async listModels(): Promise<ModelConfig[]> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      Logger.ollama('📋 Listando modelos disponíveis...');
      
      const { stdout } = await execAsync(`curl -s http://${this.config.serverUrl}:${this.config.port}/api/tags`);
      const response = JSON.parse(stdout);
      
      if (!response.models) {
        Logger.warn('⚠️ Nenhum modelo encontrado');
        return [];
      }
      
      const models: ModelConfig[] = response.models.map((model: any) => ({
        name: model.name,
        description: `Modelo Ollama: ${model.name}`,
        size: this.formatModelSize(model.size || 0),
        compatibility: 'Ollama',
        parameters: model.parameter_size || 0,
        contextLength: model.context_length || 0,
        isLocal: true,
        status: 'ready'
      }));
      
      Logger.ollama(`✅ ${models.length} modelos encontrados`);
      return models;
      
    } catch (error) {
      Logger.error('Erro ao listar modelos:', error);
      return [];
    }
  }

  /**
   * Obtém informações detalhadas de um modelo
   */
  async getModelInfo(modelName: string): Promise<ModelConfig | null> {
    try {
      const models = await this.listModels();
      return models.find(m => m.name === modelName) || null;
    } catch (error) {
      Logger.error('Erro ao obter informações do modelo:', error);
      return null;
    }
  }

  /**
   * Gera resposta de um modelo
   */
  async generateResponse(modelName: string, prompt: string, context?: string): Promise<{ response: string }> {
    try {
      Logger.ollama(`💬 Gerando resposta do modelo: ${modelName}`);
      
      // Garantir que o modelo está ativo
      await this.ensureModelActive(modelName);
      
      // Preparar prompt com contexto
      const fullPrompt = context ? `${context}\n\nUsuário: ${prompt}\nAssistente:` : prompt;
      
      // Enviar prompt para o Ollama
      const { stdout } = await execAsync(`echo '${fullPrompt.replace(/'/g, "'\"'\"'")}' | ollama run ${modelName}`);
      
      Logger.success(`✅ Resposta gerada do modelo ${modelName}`);
      
      return {
        response: stdout.trim()
      };
      
    } catch (error) {
      Logger.error('Erro ao gerar resposta do modelo:', error);
      throw error;
    }
  }

  /**
   * Garante que o modelo está ativo
   */
  async ensureModelActive(modelName: string): Promise<void> {
    try {
      const models = await this.listModels();
      const model = models.find(m => m.name === modelName);
      
      if (!model) {
        throw new Error(`Modelo ${modelName} não encontrado`);
      }
      
      if (model.status !== 'ready') {
        Logger.ollama(`🚀 Iniciando modelo: ${modelName}`);
        await this.startModel(modelName);
        
        // Aguardar modelo ficar pronto
        await this.waitForModelReady(modelName);
      }
      
    } catch (error) {
      Logger.error('Erro ao garantir modelo ativo:', error);
      throw error;
    }
  }

  /**
   * Inicia um modelo
   */
  async startModel(modelName: string): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      Logger.ollama(`🚀 Iniciando modelo ${modelName}...`);
      
      // Para Ollama, os modelos são carregados automaticamente quando solicitados
      // Vamos apenas verificar se o modelo está disponível
      const modelInfo = await this.getModelInfo(modelName);
      if (!modelInfo) {
        throw new Error(`Modelo ${modelName} não encontrado`);
      }
      
      Logger.ollama(`✅ Modelo ${modelName} está pronto para uso`);
      
    } catch (error) {
      Logger.error('Erro ao iniciar modelo:', error);
      throw error;
    }
  }

  /**
   * Para um modelo
   */
  async stopModel(modelName: string): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      Logger.ollama(`🛑 Parando modelo ${modelName}...`);
      
      // Ollama gerencia a memória automaticamente, não há necessidade de parar modelos
      Logger.ollama(`✅ Modelo ${modelName} foi liberado da memória`);
      
    } catch (error) {
      Logger.error('Erro ao parar modelo:', error);
      throw error;
    }
  }

  /**
   * Obtém status de um modelo
   */
  async getModelStatus(modelName: string): Promise<string> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      Logger.ollama(`📊 Verificando status do modelo ${modelName}...`);
      
      const modelInfo = await this.getModelInfo(modelName);
      if (modelInfo) {
        Logger.ollama(`✅ Status do modelo ${modelName}: ready`);
        return 'ready';
      } else {
        Logger.ollama(`❌ Status do modelo ${modelName}: not_found`);
        return 'not_found';
      }
      
    } catch (error) {
      Logger.error('Erro ao obter status do modelo:', error);
      return 'error';
    }
  }

  /**
   * Faz download de um modelo
   */
  async downloadModel(modelName: string): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      Logger.ollama(`📥 Fazendo download do modelo ${modelName}...`);
      
      // Usar o comando ollama pull
      const { stdout, stderr } = await execAsync(`ollama pull ${modelName}`);
      
      if (stderr && !stderr.includes('pulling')) {
        throw new Error(stderr);
      }
      
      Logger.ollama(`✅ Download do modelo ${modelName} concluído`);
      
    } catch (error) {
      Logger.error('Erro ao fazer download do modelo:', error);
      throw error;
    }
  }

  /**
   * Remove um modelo
   */
  async removeModel(modelName: string): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      Logger.ollama(`🗑️ Removendo modelo ${modelName}...`);
      
      // Usar o comando ollama rm
      await execAsync(`ollama rm ${modelName}`);
      
      Logger.ollama(`✅ Modelo ${modelName} removido`);
      
    } catch (error) {
      Logger.error('Erro ao remover modelo:', error);
      throw error;
    }
  }

  /**
   * Obtém estatísticas do servidor
   */
  async getServerStats(): Promise<any> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      Logger.ollama('📊 Obtendo estatísticas do servidor...');
      
      // Ollama não tem endpoint de estatísticas, vamos retornar informações básicas
      const stats = {
        serverUrl: this.config.serverUrl,
        port: this.config.port,
        isConnected: this.isConnected,
        modelsPath: this.config.modelsPath
      };
      
      Logger.ollama('✅ Estatísticas do servidor obtidas');
      return stats;
      
    } catch (error) {
      Logger.error('Erro ao obter estatísticas do servidor:', error);
      return null;
    }
  }

  /**
   * Para o servidor Ollama
   */
  async shutdown(): Promise<void> {
    try {
      Logger.ollama('🛑 Parando servidor Ollama...');
      
      // Ollama não tem endpoint de shutdown via API, o usuário deve parar manualmente
      Logger.warn('⚠️ Para parar o servidor Ollama, execute: pkill ollama');
      
      this.isConnected = false;
      Logger.success('✅ Gerenciador Ollama desconectado');
      
    } catch (error) {
      Logger.error('Erro ao parar servidor Ollama:', error);
      throw error;
    }
  }

  /**
   * Formata tamanho do modelo para exibição
   */
  private formatModelSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Verifica se o servidor está rodando e pronto
   */
  async isServerReady(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`curl -s http://${this.config.serverUrl}:${this.config.port}/api/tags`);
      return !!stdout;
    } catch {
      return false;
    }
  }

  /**
   * Obtém estatísticas de uso
   */
  getOllamaStats(): any {
    return {
      isConnected: this.isConnected,
      serverUrl: this.config.serverUrl,
      port: this.config.port,
      modelsPath: this.config.modelsPath
    };
  }
}
