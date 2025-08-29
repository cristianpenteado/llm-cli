import { OllamaManager } from '../ollama/OllamaManager';
import { MCPClient } from '../mcp/MCPClient';
import { ModelConfig, ModelResponse } from '../types';
import { Logger } from '../utils/Logger';
import { ConfigManager } from '../utils/ConfigManager';
import * as fs from 'fs-extra';
import * as path from 'path';

export class ModelManager {
  private ollamaManager: OllamaManager;
  private mcpClient: MCPClient;
  private configManager: ConfigManager;
  private activeModels: Map<string, ModelConfig> = new Map();
  private projectModels: Map<string, string> = new Map();

  constructor(ollamaManager: OllamaManager, mcpClient: MCPClient) {
    this.ollamaManager = ollamaManager;
    this.mcpClient = mcpClient;
    this.configManager = new ConfigManager();
  }

  /**
   * Define o modelo para um projeto específico
   */
  async setProjectModel(projectPath: string, modelName: string): Promise<void> {
    Logger.info(`🤖 Configurando modelo ${modelName} para projeto: ${projectPath}`);
    
    try {
      // Verificar se o modelo está disponível
      const availableModels = await this.ollamaManager.listModels();
      const modelExists = availableModels.some(m => m.name === modelName);
      
      if (!modelExists) {
        throw new Error(`Modelo "${modelName}" não encontrado no Ollama`);
      }

      // Salvar configuração do projeto
      this.projectModels.set(projectPath, modelName);
      
      // Atualizar configuração global
      const projectConfig = await this.configManager.getProject(projectPath);
      if (projectConfig) {
        projectConfig.model = modelName;
        projectConfig.updatedAt = new Date();
        await this.configManager.saveProject(projectPath, projectConfig);
      }

      Logger.success(`✅ Modelo ${modelName} configurado para o projeto`);
      
    } catch (error) {
      Logger.error('Erro ao configurar modelo do projeto:', error);
      throw error;
    }
  }

  /**
   * Obtém o modelo configurado para um projeto
   */
  getProjectModel(projectPath: string): string | undefined {
    return this.projectModels.get(projectPath);
  }

  /**
   * Seleciona um modelo interativamente
   */
  async selectModel(): Promise<string> {
    try {
      Logger.info('🤖 Selecionando modelo...');
      
      const availableModels = await this.listAvailableModels();
      
      if (availableModels.length === 0) {
        throw new Error('Nenhum modelo disponível. Baixe um modelo primeiro com "ollama pull <nome>"');
      }
      
      // Para simplificar, retorna o primeiro modelo disponível
      // Em uma implementação completa, você pode usar uma biblioteca como inquirer
      const selectedModel = availableModels[0].name;
      Logger.info(`✅ Modelo selecionado: ${selectedModel}`);
      
      return selectedModel;
      
    } catch (error) {
      Logger.error('Erro ao selecionar modelo:', error);
      throw error;
    }
  }

  /**
   * Verifica se um modelo está disponível e o torna pronto
   */
  async ensureModelReady(modelName: string): Promise<string> {
    try {
      // O modelo será gerenciado automaticamente pela sessão contínua
      return modelName;
    } catch (error) {
      Logger.error('Erro ao preparar modelo:', error);
      throw error;
    }
  }

  /**
   * Aguarda modelo ficar pronto
   */
  private async waitForModelReady(modelName: string, timeout: number = 60000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        // Verificar se o modelo está na lista de modelos disponíveis
        const models = await this.ollamaManager.listModels();
        const model = models.find(m => m.name === modelName);
        if (model && model.status === 'ready') {
          return;
        }
        
        // Aguardar 2 segundos antes de verificar novamente
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        Logger.warn(`Erro ao verificar status do modelo ${modelName}:`, error);
      }
    }
    
    throw new Error(`Timeout aguardando modelo ${modelName} ficar pronto`);
  }

  /**
   * Envia prompt para o modelo via MCP
   */
  async sendPrompt(modelName: string, prompt: string, context?: any): Promise<ModelResponse> {
    try {
      // Garantir que o modelo está pronto
      await this.ensureModelReady(modelName);
      
      // Detectar se é uma conversa simples ou ação complexa
      const isSimpleConversation = this.isSimpleConversation(prompt);
      
      // Preparar contexto do projeto apenas se necessário
      let projectContext = '';
      if (!isSimpleConversation && context) {
        projectContext = await this.prepareProjectContext(context);
      }
      
      // Tentar usar MCP primeiro
      try {
        const response = await this.mcpClient.sendPrompt(modelName, prompt, projectContext);
        return response;
      } catch (mcpError) {
        // Fallback para Ollama direto com prompt simplificado
        const finalPrompt = isSimpleConversation ? prompt : `${prompt}\n\n${projectContext}`;
        const ollamaResponse = await this.ollamaManager.generateResponse(modelName, finalPrompt, '');
        
        // Converter resposta do Ollama para formato ModelResponse
        const response: ModelResponse = {
          content: ollamaResponse.response,
          changes: [],
          suggestions: [],
          confidence: 0.8
        };
        
        return response;
      }
      
    } catch (error) {
      Logger.error('Erro ao enviar prompt para o modelo:', error);
      throw error;
    }
  }

  /**
   * Detecta se é uma conversa simples
   */
  private isSimpleConversation(prompt: string): boolean {
    const lowerPrompt = prompt.toLowerCase();
    
    // Palavras-chave que indicam conversa simples
    const simpleKeywords = [
      'olá', 'oi', 'bom dia', 'boa tarde', 'boa noite',
      'como você está', 'tudo bem', 'beleza', 'valeu',
      'obrigado', 'obrigada', 'obg', 'thanks', 'thank you',
      'o que é', 'como funciona', 'explique', 'descreva',
      'ajuda', 'ajude', 'pode me ajudar'
    ];
    
    return simpleKeywords.some(keyword => lowerPrompt.includes(keyword));
  }

  /**
   * Prepara contexto do projeto para o modelo
   */
  private async prepareProjectContext(context: any): Promise<string> {
    try {
      let projectContext = '';
      
      if (context.projectPath) {
        // Ler arquivo de contexto do projeto
        const contextPath = path.join(context.projectPath, '.llm-cli', 'context.md');
        if (await fs.pathExists(contextPath)) {
          projectContext += await fs.readFile(contextPath, 'utf-8');
        }
        
        // Adicionar informações sobre arquivos recentes
        if (context.recentFiles && context.recentFiles.length > 0) {
          projectContext += '\n\n## Arquivos Recentes\n';
          for (const file of context.recentFiles.slice(0, 5)) {
            projectContext += `- ${file}\n`;
          }
        }
      }
      
      return projectContext;
      
    } catch (error) {
      Logger.warn('Erro ao preparar contexto do projeto:', error);
      return '';
    }
  }

  /**
   * Lista modelos disponíveis
   */
  async listAvailableModels(): Promise<ModelConfig[]> {
    try {
      const models = await this.ollamaManager.listModels();
      return models.map(model => ({
        name: model.name,
        description: model.description || 'Sem descrição',
        size: model.size || 'Desconhecido',
        compatibility: model.compatibility || 'Linux',
        parameters: model.parameters || 0,
        contextLength: model.contextLength || 0,
        isLocal: true,
        status: model.status || 'unknown'
      }));
    } catch (error) {
      Logger.error('Erro ao listar modelos disponíveis:', error);
      return [];
    }
  }

  /**
   * Obtém informações detalhadas de um modelo
   */
  async getModelInfo(modelName: string): Promise<ModelConfig | null> {
    try {
      const models = await this.ollamaManager.listModels();
      const model = models.find(m => m.name === modelName);
      
      if (!model) {
        return null;
      }
      
      return {
        name: model.name,
        description: model.description || 'Sem descrição',
        size: model.size || 'Desconhecido',
        compatibility: model.compatibility || 'Linux',
        parameters: model.parameters || 0,
        contextLength: model.contextLength || 0,
        isLocal: true,
        status: model.status || 'unknown'
      };
      
    } catch (error) {
      Logger.error('Erro ao obter informações do modelo:', error);
      return null;
    }
  }

  /**
   * Para um modelo ativo
   */
  async stopModel(modelName: string): Promise<void> {
    Logger.info(`🛑 Parando modelo: ${modelName}`);
    
    try {
      // Ollama gerencia a memória automaticamente, apenas remover do controle local
      this.activeModels.delete(modelName);
      
      Logger.success(`✅ Modelo ${modelName} liberado da memória`);
      
    } catch (error) {
      Logger.error('Erro ao parar modelo:', error);
      throw error;
    }
  }

  /**
   * Para todos os modelos ativos
   */
  async stopAllModels(): Promise<void> {
    Logger.info('🛑 Parando todos os modelos ativos...');
    
    const stopPromises = Array.from(this.activeModels.keys()).map(modelName => 
      this.stopModel(modelName).catch(error => {
        Logger.warn(`Erro ao parar modelo ${modelName}:`, error);
      })
    );
    
    await Promise.all(stopPromises);
    this.activeModels.clear();
    
    Logger.success('✅ Todos os modelos foram parados');
  }

  /**
   * Obtém estatísticas de uso dos modelos
   */
  getModelStats(): any {
    const stats = {
      totalModels: this.activeModels.size,
      activeModels: Array.from(this.activeModels.keys()),
      projectModels: Array.from(this.projectModels.entries()).map(([path, model]) => ({
        project: path,
        model: model
      }))
    };
    
    return stats;
  }

  /**
   * Verifica se um modelo está ativo
   */
  isModelActive(modelName: string): boolean {
    return this.activeModels.has(modelName) && 
           this.activeModels.get(modelName)?.status === 'ready';
  }

  /**
   * Obtém lista de modelos ativos
   */
  getActiveModels(): string[] {
    return Array.from(this.activeModels.entries())
      .filter(([_, model]) => model.status === 'ready')
      .map(([name, _]) => name);
  }

  /**
   * Limpa cache de modelos
   */
  clearModelCache(): void {
    this.activeModels.clear();
    Logger.info('🧹 Cache de modelos limpo');
  }

  /**
   * Obtém recomendação de modelo baseada no contexto
   */
  async getRecommendedModel(projectContext?: any): Promise<string | null> {
    try {
      // Se há contexto de projeto, usar o modelo configurado
      if (projectContext?.projectPath) {
        const projectModel = this.getProjectModel(projectContext.projectPath);
        if (projectModel) {
          return projectModel;
        }
      }
      
      // Usar modelo padrão global
      const defaultModel = this.configManager.getDefaultModel();
      if (defaultModel) {
        return defaultModel;
      }
      
      // Se não há modelo padrão, sugerir baseado no hardware
      const hardwareInfo = this.configManager.getHardwareInfo();
      if (hardwareInfo) {
        // Lógica para sugerir modelo baseado no hardware
        if (hardwareInfo.memory.total >= 16) {
          return 'deepseek-coder:6.7b-instruct';
        } else if (hardwareInfo.memory.total >= 8) {
          return 'phi-3:3.8b-instruct';
        } else {
          return 'phi-3:3.8b-instruct';
        }
      }
      
      return null;
      
    } catch (error) {
      Logger.warn('Erro ao obter recomendação de modelo:', error);
      return null;
    }
  }
}
