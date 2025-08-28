import { exec } from 'child_process';
import { promisify } from 'util';
import { VlamaConfig, ModelConfig } from '../types';
import { Logger } from '../utils/Logger';
import { ConfigManager } from '../utils/ConfigManager';
import * as fs from 'fs-extra';
import * as path from 'path';

const execAsync = promisify(exec);

export class VlamaManager {
  private config: VlamaConfig;
  private configManager: ConfigManager;
  private isConnected: boolean = false;
  private serverProcess: any = null;

  constructor() {
    this.configManager = new ConfigManager();
    this.config = this.configManager.getVlamaConfig();
  }

  /**
   * Inicializa o gerenciador Vlama
   */
  async initialize(): Promise<void> {
    try {
      Logger.vlama('🚀 Inicializando gerenciador Vlama...');
      
      // Verificar se o Vlama está instalado
      await this.checkVlamaInstallation();
      
      // Iniciar servidor Vlama se necessário
      await this.startVlamaServer();
      
      // Conectar ao servidor
      await this.connect();
      
      Logger.success('✅ Gerenciador Vlama inicializado');
      
    } catch (error) {
      Logger.error('Erro ao inicializar gerenciador Vlama:', error);
      throw error;
    }
  }

  /**
   * Verifica se o Vlama está instalado
   */
  private async checkVlamaInstallation(): Promise<void> {
    try {
      const { stdout } = await execAsync('vlama --version');
      Logger.vlama(`✅ Vlama instalado: ${stdout.trim()}`);
    } catch (error) {
      Logger.warn('Vlama não encontrado, tentando instalar...');
      await this.installVlama();
    }
  }

  /**
   * Instala o Vlama
   */
  private async installVlama(): Promise<void> {
    try {
      Logger.vlama('📦 Instalando Vlama...');
      
      // Tentar diferentes métodos de instalação
      try {
        await execAsync('curl -fsSL https://get.vlama.ai | sh');
      } catch {
        try {
          await execAsync('wget -qO- https://get.vlama.ai | sh');
        } catch {
          throw new Error('Não foi possível instalar o Vlama automaticamente');
        }
      }
      
      Logger.success('✅ Vlama instalado com sucesso');
      
    } catch (error) {
      Logger.error('Erro ao instalar Vlama:', error);
      throw new Error('Falha ao instalar Vlama. Instale manualmente: https://vlama.ai');
    }
  }

  /**
   * Inicia o servidor Vlama
   */
  private async startVlamaServer(): Promise<void> {
    try {
      // Verificar se o servidor já está rodando
      if (await this.isServerRunning()) {
        Logger.vlama('✅ Servidor Vlama já está rodando');
        return;
      }

      Logger.vlama('🚀 Iniciando servidor Vlama...');
      
      // Iniciar servidor em background
      this.serverProcess = exec('vlama serve', {
        env: {
          ...process.env,
          VLAMA_MODELS_PATH: this.config.modelsPath,
          VLAMA_MAX_MEMORY: this.config.maxMemory.toString(),
          VLAMA_GPU_ENABLED: this.config.gpuEnabled.toString()
        }
      });

      // Aguardar servidor estar pronto
      await this.waitForServerReady();
      
      Logger.success('✅ Servidor Vlama iniciado');
      
    } catch (error) {
      Logger.error('Erro ao iniciar servidor Vlama:', error);
      throw error;
    }
  }

  /**
   * Verifica se o servidor está rodando
   */
  private async isServerRunning(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`curl -s http://${this.config.serverUrl}:${this.config.port}/health`);
      return stdout.includes('ok') || stdout.includes('healthy');
    } catch {
      return false;
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
        if (await this.isServerRunning()) {
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      } catch {
        attempts++;
      }
    }
    
    throw new Error('Timeout aguardando servidor Vlama');
  }

  /**
   * Conecta ao servidor Vlama
   */
  async connect(): Promise<void> {
    try {
      Logger.vlama('🔌 Conectando ao servidor Vlama...');
      
      // Testar conexão usando curl
      const { stdout } = await execAsync(`curl -s http://${this.config.serverUrl}:${this.config.port}/health`);
      
      if (stdout.includes('ok') || stdout.includes('healthy')) {
        this.isConnected = true;
        Logger.success('✅ Conectado ao servidor Vlama');
      } else {
        throw new Error('Servidor Vlama não respondeu corretamente');
      }
      
    } catch (error) {
      Logger.error('Erro ao conectar ao servidor Vlama:', error);
      this.isConnected = false;
      throw new Error('Falha ao conectar ao servidor Vlama');
    }
  }

  /**
   * Desconecta do servidor Vlama
   */
  async disconnect(): Promise<void> {
    if (this.isConnected) {
      try {
        Logger.vlama('🔌 Desconectando do servidor Vlama...');
        
        await execAsync(`curl -s -X POST http://${this.config.serverUrl}:${this.config.port}/shutdown`);
        
        this.isConnected = false;
        Logger.success('✅ Desconectado do servidor Vlama');
        
      } catch (error) {
        Logger.warn('Erro ao desconectar do servidor Vlama:', error);
      }
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
      Logger.vlama('📋 Listando modelos disponíveis...');
      
      const { stdout } = await execAsync(`curl -s http://${this.config.serverUrl}:${this.config.port}/models`);
      const models = JSON.parse(stdout);
      
      Logger.vlama(`✅ ${models.length} modelos encontrados`);
      return models;
      
    } catch (error) {
      Logger.error('Erro ao listar modelos:', error);
      return [];
    }
  }

  /**
   * Obtém informações de um modelo específico
   */
  async getModelInfo(modelName: string): Promise<ModelConfig | null> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      Logger.vlama(`ℹ️ Obtendo informações do modelo ${modelName}...`);
      
      const { stdout } = await execAsync(`curl -s http://${this.config.serverUrl}:${this.config.port}/models/${encodeURIComponent(modelName)}`);
      const modelInfo = JSON.parse(stdout);
      
      Logger.vlama('✅ Informações do modelo obtidas');
      return modelInfo;
      
    } catch (error) {
      Logger.error('Erro ao obter informações do modelo:', error);
      return null;
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
      Logger.vlama(`🚀 Iniciando modelo ${modelName}...`);
      
      await execAsync(`curl -s -X POST http://${this.config.serverUrl}:${this.config.port}/models/${encodeURIComponent(modelName)}/start`);
      
      Logger.vlama(`✅ Modelo ${modelName} iniciado`);
      
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
      Logger.vlama(`🛑 Parando modelo ${modelName}...`);
      
      await execAsync(`curl -s -X POST http://${this.config.serverUrl}:${this.config.port}/models/${encodeURIComponent(modelName)}/stop`);
      
      Logger.vlama(`✅ Modelo ${modelName} parado`);
      
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
      Logger.vlama(`📊 Verificando status do modelo ${modelName}...`);
      
      const { stdout } = await execAsync(`curl -s http://${this.config.serverUrl}:${this.config.port}/models/${encodeURIComponent(modelName)}/status`);
      const status = JSON.parse(stdout);
      
      Logger.vlama(`✅ Status do modelo ${modelName}: ${status.status}`);
      return status.status;
      
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
      Logger.vlama(`📥 Fazendo download do modelo ${modelName}...`);
      
      await execAsync(`curl -s -X POST http://${this.config.serverUrl}:${this.config.port}/models/${encodeURIComponent(modelName)}/download`);
      
      Logger.vlama(`✅ Download do modelo ${modelName} concluído`);
      
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
      Logger.vlama(`🗑️ Removendo modelo ${modelName}...`);
      
      await execAsync(`curl -s -X DELETE http://${this.config.serverUrl}:${this.config.port}/models/${encodeURIComponent(modelName)}`);
      
      Logger.vlama(`✅ Modelo ${modelName} removido`);
      
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
      Logger.vlama('📊 Obtendo estatísticas do servidor...');
      
      const { stdout } = await execAsync(`curl -s http://${this.config.serverUrl}:${this.config.port}/stats`);
      const stats = JSON.parse(stdout);
      
      Logger.vlama('✅ Estatísticas do servidor obtidas');
      return stats;
      
    } catch (error) {
      Logger.error('Erro ao obter estatísticas do servidor:', error);
      return null;
    }
  }

  /**
   * Para o servidor Vlama
   */
  async shutdown(): Promise<void> {
    try {
      Logger.vlama('🛑 Parando servidor Vlama...');
      
      if (this.serverProcess) {
        this.serverProcess.kill();
        this.serverProcess = null;
      }
      
      await this.disconnect();
      
      Logger.success('✅ Servidor Vlama parado');
      
    } catch (error) {
      Logger.error('Erro ao parar servidor Vlama:', error);
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
      return await this.isServerRunning();
    } catch {
      return false;
    }
  }

  /**
   * Obtém estatísticas de uso
   */
  getVlamaStats(): any {
    return {
      isConnected: this.isConnected,
      serverUrl: this.config.serverUrl,
      port: this.config.port,
      modelsPath: this.config.modelsPath,
      maxMemory: this.config.maxMemory,
      gpuEnabled: this.config.gpuEnabled,
      hasServerProcess: !!this.serverProcess
    };
  }
}
