import { ProjectManager } from './ProjectManager';
import { ModelManager } from './ModelManager';
import { ConversationManager } from './ConversationManager';
import { FileManager } from './FileManager';
import { MCPClient } from '../mcp/MCPClient';
import { OllamaManager } from '../ollama/OllamaManager';
import { Logger } from '../utils/Logger';
import { ConfigManager } from '../utils/ConfigManager';
import { ProjectConfig, ModelConfig } from '../types';

export class LLMCLI {
  private projectManager: ProjectManager;
  private modelManager: ModelManager;
  private conversationManager: ConversationManager;
  private fileManager: FileManager;
  private mcpClient: MCPClient;
  private ollamaManager: OllamaManager;
  private configManager: ConfigManager;
  private currentProject: ProjectConfig | null = null;
  private verboseLogs: boolean;

  constructor(verboseLogs: boolean = false) {
    this.verboseLogs = verboseLogs;
    this.configManager = new ConfigManager();
    this.ollamaManager = new OllamaManager(verboseLogs);
    this.mcpClient = new MCPClient(this.ollamaManager, verboseLogs);
    this.projectManager = new ProjectManager();
    this.modelManager = new ModelManager(this.ollamaManager, this.mcpClient, verboseLogs);
    this.conversationManager = new ConversationManager(this.modelManager, verboseLogs);
    this.fileManager = new FileManager();
  }

  /**
   * Inicializa um novo projeto na pasta atual
   */
  async initializeProject(options: { model?: string; force?: boolean }): Promise<void> {
    Logger.info('🚀 Inicializando novo projeto...');

    // Inicializar OllamaManager (baixa modelo padrão automaticamente)
    await this.ollamaManager.initialize();

    // Inicializar projeto
    const projectConfig = await this.projectManager.initializeProject(options);
    this.currentProject = projectConfig;

    // Configurar modelo
    let selectedModel = options.model;
    
    if (!selectedModel) {
      const defaultModel = await this.configManager.getDefaultModel();
      if (defaultModel) {
        // Verificar se o modelo padrão está disponível
        selectedModel = await this.modelManager.ensureModelReady(defaultModel);
      } else {
        // Nenhum modelo padrão, usar seleção interativa
        Logger.info('🤖 Nenhum modelo padrão configurado. Vamos escolher um!');
        selectedModel = await this.modelManager.selectModel();
      }
    } else {
      // Verificar se o modelo especificado está disponível
      selectedModel = await this.modelManager.ensureModelReady(selectedModel);
    }

    // Configurar modelo no projeto
    await this.modelManager.setProjectModel(projectConfig.path, selectedModel);
    this.currentProject.model = selectedModel;

    // Salvar modelo na configuração do projeto
    await this.projectManager.updateProjectModel(projectConfig.path, selectedModel);

    // Definir como modelo padrão se for primeira execução
    if (await this.configManager.isFirstRun()) {
      await this.configManager.setDefaultModel(selectedModel);
      Logger.info(`💾 Modelo ${selectedModel} definido como padrão global`);
    }

    Logger.success(`✅ Projeto inicializado em: ${projectConfig.path}`);
    Logger.info(`📁 Estrutura do projeto: ${projectConfig.language}/${projectConfig.framework}`);
    Logger.info(`🤖 Modelo configurado: ${selectedModel}`);
    
    // Mostrar próximos passos
    Logger.newline();
    Logger.info('🎯 Próximos passos:');
    Logger.info('  1. Use "llm chat" para iniciar uma conversa com a IA');
    Logger.info('  2. Use "llm status" para ver o status do projeto');
    Logger.info('  3. Use "llm change-model" para trocar o modelo se necessário');
  }

  /**
   * Troca o modelo LLM para o projeto atual
   */
  async changeModel(modelName?: string): Promise<void> {
    try {
      // Verificar se há um projeto ativo
      if (!this.currentProject) {
        // Tentar carregar projeto da pasta atual
        const currentPath = process.cwd();
        const projectConfig = await this.projectManager.loadProject(currentPath);
        
        if (projectConfig) {
          this.currentProject = projectConfig;
          Logger.info(`📁 Projeto carregado: ${projectConfig.name}`);
        } else {
          throw new Error('Nenhum projeto ativo. Execute "llm init" primeiro.');
        }
      }

      if (!modelName) {
        // Usar seleção interativa
        Logger.info('🔄 Vamos escolher um novo modelo para o projeto!');
        modelName = await this.modelManager.selectModel();
      }

      Logger.info(`🔄 Alterando modelo para: ${modelName}`);

      // Verificar se o modelo está disponível
      const availableModels = await this.ollamaManager.listModels();
      const modelExists = availableModels.some(m => m.name === modelName);

      if (!modelExists) {
        Logger.warn(`⚠️ Modelo "${modelName}" não encontrado. Tentando baixar...`);
        try {
          await this.ollamaManager.downloadModelWithProgress(modelName);
          Logger.success(`✅ Modelo ${modelName} baixado com sucesso!`);
        } catch (downloadError) {
          throw new Error(`Modelo "${modelName}" não encontrado e não pôde ser baixado. Use "ollama pull ${modelName}" manualmente.`);
        }
      }

      // Parar processo persistente anterior
      await this.ollamaManager.stopModelSession();

      // Configurar novo modelo
      await this.modelManager.setProjectModel(this.currentProject.path, modelName);
      this.currentProject.model = modelName;

      // Salvar na configuração do projeto
      await this.projectManager.updateProjectModel(this.currentProject.path, modelName);

      // Iniciar novo modelo
      await this.ollamaManager.initialize();

      Logger.success(`✅ Modelo alterado para: ${modelName}`);
      Logger.info(`💡 Use "llm chat" para iniciar uma conversa com o novo modelo`);
      
    } catch (error) {
      Logger.error('Erro ao trocar modelo:', error);
      throw error;
    }
  }

  /**
   * Define o modelo base padrão para todos os projetos
   */
  async setDefaultModel(modelName?: string): Promise<void> {
    if (!modelName) {
      // Usar seleção interativa
      Logger.info('⚙️ Vamos escolher um modelo padrão para todos os projetos!');
      modelName = await this.modelManager.selectModel();
    }

    Logger.info(`⚙️ Definindo modelo padrão: ${modelName}`);
    
    // Verificar disponibilidade do modelo e baixar se necessário
    modelName = await this.modelManager.ensureModelReady(modelName);

    await this.configManager.setDefaultModel(modelName);
    Logger.success(`✅ Modelo padrão definido: ${modelName}`);
  }

  /**
   * Lista modelos LLMs disponíveis
   */
  async listModels(): Promise<void> {
    Logger.info('📋 Modelos disponíveis:');
    
    const availableModels = await this.ollamaManager.listModels();
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
    
    // Inicializar OllamaManager (baixa modelo padrão automaticamente)
    await this.ollamaManager.initialize();
    
    // Verificar se o projeto está inicializado
    if (!this.currentProject) {
      const projectPath = process.cwd();
      const isInitialized = await this.projectManager.isProjectInitialized(projectPath);
      
      if (!isInitialized) {
        Logger.warn('⚠️ Projeto não inicializado!');
        Logger.info('📁 Para usar o chat, você precisa inicializar o projeto primeiro.');
        Logger.info('💡 Execute o comando: llm init');
        Logger.newline();
        
        // Perguntar se quer inicializar
        const { shouldInit } = await this.conversationManager.askUser({
          type: 'confirm',
          message: 'Deseja inicializar o projeto agora?',
          default: true
        });
        
        if (shouldInit) {
          Logger.info('🚀 Inicializando projeto...');
          await this.initializeProject({});
          Logger.success('✅ Projeto inicializado! Iniciando chat...');
        } else {
          Logger.info('❌ Chat cancelado. Execute "llm init" quando estiver pronto.');
          return;
        }
      } else {
        // Carregar projeto existente
        this.currentProject = await this.projectManager.loadProject(projectPath);
        Logger.info(`📁 Projeto carregado: ${this.currentProject.name}`);
      }
    }
    
    // Determinar modelo a ser usado
    let modelToUse = specificModel;
    
    if (!modelToUse && this.currentProject) {
      modelToUse = this.currentProject.model;
    }
    
    if (!modelToUse) {
      modelToUse = await this.configManager.getDefaultModel();
    }
    
    // Se ainda não houver modelo, usar phi3:mini como padrão
    if (!modelToUse) {
      modelToUse = 'phi3:mini';
      Logger.info(`🤖 Usando modelo padrão: ${modelToUse}`);
      
      // Definir como modelo padrão global
      await this.configManager.setDefaultModel(modelToUse);
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