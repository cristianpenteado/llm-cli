import { ProjectManager } from './ProjectManager';
import { ModelManager } from './ModelManager';
import { ConversationManager } from './ConversationManager';
import { FileManager } from './FileManager';
import { MCPClient } from '../mcp/MCPClient';
import { VlamaManager } from '../vlama/VlamaManager';
import { HardwareDetector } from '../utils/HardwareDetector';
import { Logger } from '../utils/Logger';
import { ConfigManager } from '../utils/ConfigManager';
import { ProjectConfig, ModelConfig, HardwareInfo } from '../types';

export class LLMCLI {
  private projectManager: ProjectManager;
  private modelManager: ModelManager;
  private conversationManager: ConversationManager;
  private fileManager: FileManager;
  private mcpClient: MCPClient;
  private vlamaManager: VlamaManager;
  private hardwareDetector: HardwareDetector;
  private configManager: ConfigManager;
  private currentProject: ProjectConfig | null = null;

  constructor() {
    this.configManager = new ConfigManager();
    this.hardwareDetector = new HardwareDetector();
    this.vlamaManager = new VlamaManager();
    this.mcpClient = new MCPClient();
    this.projectManager = new ProjectManager();
    this.modelManager = new ModelManager(this.vlamaManager, this.mcpClient);
    this.conversationManager = new ConversationManager(this.modelManager);
    this.fileManager = new FileManager();
  }

  /**
   * Inicializa um novo projeto na pasta atual
   */
  async initializeProject(options: { model?: string; force?: boolean }): Promise<void> {
    Logger.info('🚀 Inicializando novo projeto...');

    // Detectar hardware se for primeira execução
    const isFirstRun = await this.configManager.isFirstRun();
    if (isFirstRun) {
      Logger.info('🔍 Primeira execução detectada. Analisando hardware...');
      const hardware = await this.hardwareDetector.detect();
      await this.configManager.saveHardwareInfo(hardware);
      
      // Obter recomendações de modelo
      const recommendations = await this.hardwareDetector.getModelRecommendations(hardware);
      Logger.info('💡 Modelos recomendados para seu hardware:');
      recommendations.forEach((rec, index) => {
        Logger.info(`  ${index + 1}. ${rec.name} - ${rec.description}`);
      });
    }

    // Inicializar projeto
    const projectConfig = await this.projectManager.initializeProject(options);
    this.currentProject = projectConfig;

    // Configurar modelo
    if (options.model) {
      await this.modelManager.setProjectModel(projectConfig.path, options.model);
    } else {
      const defaultModel = await this.configManager.getDefaultModel();
      if (defaultModel) {
        await this.modelManager.setProjectModel(projectConfig.path, defaultModel);
      }
    }

    Logger.success(`✅ Projeto inicializado em: ${projectConfig.path}`);
    Logger.info(`📁 Estrutura do projeto: ${projectConfig.language}/${projectConfig.framework}`);
    
    if (projectConfig.model) {
      Logger.info(`🤖 Modelo configurado: ${projectConfig.model}`);
    }
  }

  /**
   * Troca o modelo LLM para o projeto atual
   */
  async changeModel(modelName: string): Promise<void> {
    if (!this.currentProject) {
      throw new Error('Nenhum projeto ativo. Execute "llm init" primeiro.');
    }

    Logger.info(`🔄 Trocando modelo para: ${modelName}`);
    
    // Verificar se o modelo está disponível
    const availableModels = await this.vlamaManager.listModels();
    const modelExists = availableModels.some(m => m.name === modelName);
    
    if (!modelExists) {
      throw new Error(`Modelo "${modelName}" não encontrado. Use "llm list-models" para ver modelos disponíveis.`);
    }

    // Atualizar modelo do projeto
    await this.modelManager.setProjectModel(this.currentProject.path, modelName);
    this.currentProject.model = modelName;
    
    Logger.success(`✅ Modelo alterado para: ${modelName}`);
  }

  /**
   * Define o modelo base padrão para todos os projetos
   */
  async setDefaultModel(modelName: string): Promise<void> {
    Logger.info(`⚙️ Definindo modelo padrão: ${modelName}`);
    
    // Verificar disponibilidade do modelo
    const availableModels = await this.vlamaManager.listModels();
    const modelExists = availableModels.some(m => m.name === modelName);
    
    if (!modelExists) {
      throw new Error(`Modelo "${modelName}" não encontrado. Use "llm list-models" para ver modelos disponíveis.`);
    }

    await this.configManager.setDefaultModel(modelName);
    Logger.success(`✅ Modelo padrão definido: ${modelName}`);
  }

  /**
   * Lista modelos LLMs disponíveis
   */
  async listModels(): Promise<void> {
    Logger.info('📋 Modelos disponíveis:');
    
    const availableModels = await this.vlamaManager.listModels();
    const defaultModel = await this.configManager.getDefaultModel();
    
    availableModels.forEach((model, index) => {
      const isDefault = model.name === defaultModel;
      const status = isDefault ? ' (padrão)' : '';
      Logger.info(`  ${index + 1}. ${model.name}${status}`);
      Logger.info(`     Descrição: ${model.description}`);
      Logger.info(`     Tamanho: ${model.size}`);
      Logger.info(`     Compatibilidade: ${model.compatibility}`);
      Logger.info('');
    });
  }

  /**
   * Inicia modo conversacional
   */
  async startChat(specificModel?: string): Promise<void> {
    Logger.info('💬 Iniciando modo conversacional...');
    
    // Determinar modelo a ser usado
    let modelToUse = specificModel;
    
    if (!modelToUse && this.currentProject) {
      modelToUse = this.currentProject.model;
    }
    
    if (!modelToUse) {
      modelToUse = await this.configManager.getDefaultModel();
    }
    
    if (!modelToUse) {
      throw new Error('Nenhum modelo configurado. Use "llm set-default-model <model>" ou "llm init" primeiro.');
    }

    // Inicializar modelo se necessário
    await this.modelManager.ensureModelReady(modelToUse);
    
    Logger.success(`🤖 Conectado ao modelo: ${modelToUse}`);
    Logger.info('💡 Digite suas perguntas ou comandos. Use "/help" para ver comandos disponíveis.');
    
    // Iniciar conversa
    await this.conversationManager.startConversation(modelToUse);
  }

  /**
   * Cria uma nova funcionalidade no projeto
   */
  async createFeature(type: string, name: string, description?: string): Promise<void> {
    if (!this.currentProject) {
      throw new Error('Nenhum projeto ativo. Execute "llm init" primeiro.');
    }

    Logger.info(`🔨 Criando funcionalidade: ${type} - ${name}`);
    
    // Gerar funcionalidade via LLM
    const prompt = `Crie uma funcionalidade do tipo "${type}" chamada "${name}"${description ? ` com descrição: "${description}"` : ''} para um projeto ${this.currentProject.language}/${this.currentProject.framework}.`;
    
    const response = await this.modelManager.sendPrompt(this.currentProject.model!, prompt);
    
    // Aplicar mudanças
    await this.fileManager.applyChanges(response.changes);
    
    Logger.success(`✅ Funcionalidade "${name}" criada com sucesso!`);
  }

  /**
   * Edita um arquivo existente
   */
  async editFile(filePath: string, instruction: string): Promise<void> {
    if (!this.currentProject) {
      throw new Error('Nenhum projeto ativo. Execute "llm init" primeiro.');
    }

    Logger.info(`✏️ Editando arquivo: ${filePath}`);
    
    // Ler arquivo atual
    const currentContent = await this.fileManager.readFile(filePath);
    
    // Gerar edição via LLM
    const prompt = `Edite o arquivo "${filePath}" com a seguinte instrução: "${instruction}". Arquivo atual:\n\`\`\`\n${currentContent}\n\`\`\``;
    
    const response = await this.modelManager.sendPrompt(this.currentProject.model!, prompt);
    
    // Aplicar mudanças
    await this.fileManager.applyChanges(response.changes);
    
    Logger.success(`✅ Arquivo "${filePath}" editado com sucesso!`);
  }

  /**
   * Desfaz alterações recentes
   */
  async rollback(numberOfChanges: number = 1): Promise<void> {
    if (!this.currentProject) {
      throw new Error('Nenhum projeto ativo. Execute "llm init" primeiro.');
    }

    Logger.info(`↩️ Desfazendo ${numberOfChanges} alteração(ões)...`);
    
    const undone = await this.fileManager.rollback(numberOfChanges);
    Logger.success(`✅ ${undone} alteração(ões) desfeita(s) com sucesso!`);
  }

  /**
   * Mostra status do projeto atual
   */
  async showStatus(): Promise<void> {
    if (!this.currentProject) {
      Logger.warn('⚠️ Nenhum projeto ativo.');
      Logger.info('Use "llm init" para inicializar um projeto.');
      return;
    }

    Logger.info('📊 Status do Projeto:');
    Logger.info(`  📁 Caminho: ${this.currentProject.path}`);
    Logger.info(`  🔤 Linguagem: ${this.currentProject.language}`);
    Logger.info(`  🏗️ Framework: ${this.currentProject.framework}`);
    Logger.info(`  🤖 Modelo: ${this.currentProject.model || 'Não configurado'}`);
    Logger.info(`  📅 Criado em: ${this.currentProject.createdAt.toLocaleDateString()}`);
    
    // Mostrar estatísticas do projeto
    const stats = await this.fileManager.getProjectStats(this.currentProject.path);
    Logger.info(`  📄 Arquivos: ${stats.fileCount}`);
    Logger.info(`  📝 Linhas de código: ${stats.lineCount}`);
    
    // Mostrar histórico de alterações
    const history = await this.fileManager.getChangeHistory();
    if (history.length > 0) {
      Logger.info(`  📚 Últimas alterações: ${history.length}`);
      history.slice(-3).forEach((change, index) => {
        Logger.info(`    ${index + 1}. ${change.description} (${change.timestamp.toLocaleDateString()})`);
      });
    }
  }
}
