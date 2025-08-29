import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from '../utils/Logger';
import { ModelConfig } from '../types';

const execAsync = promisify(exec);

export class OllamaManager {
  private cache = new Map<string, { response: string; timestamp: number; ttl: number }>();
  private modelCache = new Map<string, ModelConfig[]>();
  private lastModelList = 0;
  private readonly CACHE_TTL = 30000; // 30 segundos
  private readonly MODEL_LIST_CACHE_TTL = 10000; // 10 segundos
  private readonly DEFAULT_MODEL = 'phi3:mini';
  private isInitialized = false;

  /**
   * Inicializa o gerenciador Ollama e baixa o modelo padrão
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      Logger.ollama('🚀 Inicializando gerenciador Ollama...');
      
      // Verificar se o Ollama está instalado
      await this.checkOllamaInstallation();
      
      // Verificar se o servidor está rodando
      await this.checkOllamaServer();
      
      // Baixar modelo padrão se não existir
      await this.ensureDefaultModel();
      
      this.isInitialized = true;
      Logger.success('✅ Gerenciador Ollama inicializado com modelo padrão');
      
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
      const { stdout } = await execAsync('ollama list --json');
      Logger.ollama('✅ Servidor Ollama está rodando');
    } catch (error) {
      Logger.warn('⚠️ Servidor Ollama não está rodando');
      Logger.info('🚀 Iniciando servidor Ollama...');
      
      try {
        // Iniciar servidor Ollama em background
        exec('ollama serve', (error) => {
          if (error) {
            Logger.warn('⚠️ Erro ao iniciar servidor Ollama:', error.message);
          }
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
        const { stdout } = await execAsync('ollama list --json');
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
   * Garante que o modelo padrão está disponível
   */
  private async ensureDefaultModel(): Promise<void> {
    try {
      const models = await this.listModels();
      const defaultModel = models.find(m => m.name === this.DEFAULT_MODEL);
      
      if (defaultModel) {
        Logger.ollama(`✅ Modelo padrão ${this.DEFAULT_MODEL} já está disponível`);
        return;
      }
      
      Logger.ollama(`📥 Baixando modelo padrão ${this.DEFAULT_MODEL}...`);
      await this.downloadModel(this.DEFAULT_MODEL);
      Logger.success(`✅ Modelo padrão ${this.DEFAULT_MODEL} baixado com sucesso`);
      
    } catch (error) {
      Logger.error(`Erro ao baixar modelo padrão ${this.DEFAULT_MODEL}:`, error);
      throw error;
    }
  }

  /**
   * Faz download de um modelo
   */
  async downloadModel(modelName: string): Promise<void> {
    try {
      Logger.ollama(`📥 Fazendo download do modelo ${modelName}...`);
      
      // Usar o comando ollama pull com timeout
      const result = await Promise.race([
        execAsync(`ollama pull ${modelName}`),
        this.timeoutPromise(300000, `Timeout: download do modelo ${modelName} demorou mais de 5 minutos`) // 5 min
      ]) as { stdout: string; stderr: string };
      
      if (result.stderr && !result.stderr.includes('pulling')) {
        throw new Error(result.stderr);
      }
      
      Logger.ollama(`✅ Download do modelo ${modelName} concluído`);
      
      // Limpar cache de modelos para refletir a mudança
      this.modelCache.clear();
      
    } catch (error) {
      Logger.error(`Erro ao fazer download do modelo ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Gera resposta do modelo com otimizações de performance
   */
  async generateResponse(modelName: string, prompt: string, context?: string): Promise<{ response: string }> {
    // Garantir inicialização
    if (!this.isInitialized) {
      await this.initialize();
    }

    const cacheKey = `${modelName}:${this.hashPrompt(prompt)}`;
    
    // Verificar cache primeiro
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      Logger.ollama('⚡ Resposta retornada do cache');
      return { response: cached.response };
    }

    try {
      // Verificar se o modelo existe, se não, tentar baixar
      await this.ensureModelAvailable(modelName);
      
      // Garantir que o modelo está ativo (assíncrono)
      this.ensureModelActive(modelName).catch(() => {}); // Não bloquear

      Logger.ollama(`💬 Gerando resposta do modelo: ${modelName}`);
      
      // Usar timeout para evitar esperas longas
      const response = await Promise.race([
        this.callOllama(modelName, prompt, context),
        this.timeoutPromise(30000, 'Timeout: resposta demorou mais de 30s')
      ]);

      // Cache da resposta
      this.cache.set(cacheKey, {
        response: response as string,
        timestamp: Date.now(),
        ttl: this.CACHE_TTL
      });

      return { response: response as string };
    } catch (error) {
      Logger.error('Erro ao gerar resposta:', error);
      throw error;
    }
  }

  /**
   * Garante que o modelo está disponível
   */
  private async ensureModelAvailable(modelName: string): Promise<void> {
    const models = await this.listModels();
    const model = models.find(m => m.name === modelName);
    
    if (!model) {
      if (modelName === this.DEFAULT_MODEL) {
        // Para o modelo padrão, sempre tentar baixar
        await this.downloadModel(modelName);
      } else {
        // Para outros modelos, informar que precisa baixar
        throw new Error(`Modelo ${modelName} não encontrado. Use "ollama pull ${modelName}" para baixá-lo.`);
      }
    }
  }

  /**
   * Chama Ollama com otimizações
   */
  private async callOllama(modelName: string, prompt: string, context?: string): Promise<string> {
    const fullPrompt = context ? `${context}\n\nPergunta: ${prompt}` : prompt;
    
    const command = `ollama run ${modelName} "${fullPrompt.replace(/"/g, '\\"')}"`;
    
    const { stdout } = await execAsync(command, {
      timeout: 25000, // 25s timeout
      maxBuffer: 1024 * 1024 // 1MB buffer
    });

    return stdout.trim();
  }

  /**
   * Lista modelos com cache otimizado
   */
  async listModels(): Promise<ModelConfig[]> {
    const now = Date.now();
    
    // Verificar cache de modelos
    if (this.modelCache.has('all') && (now - this.lastModelList) < this.MODEL_LIST_CACHE_TTL) {
      return this.modelCache.get('all') || [];
    }

    try {
      Logger.ollama('📋 Listando modelos disponíveis...');
      
      const { stdout } = await execAsync('ollama list --json', {
        timeout: 5000, // 5s timeout para listar modelos
        maxBuffer: 1024 * 1024
      });

      const rawModels = JSON.parse(stdout);
      const models: ModelConfig[] = rawModels.map((model: any) => ({
        name: model.name,
        description: `Modelo Ollama: ${model.name}`,
        size: this.formatModelSize(model.size || 0),
        compatibility: 'Ollama',
        parameters: model.parameter_size || 0,
        contextLength: model.context_length || 0,
        isLocal: true,
        status: 'ready'
      }));
      
      // Cache dos modelos
      this.modelCache.set('all', models);
      this.lastModelList = now;
      
      Logger.ollama(`✅ ${models.length} modelos encontrados`);
      return models;
      
    } catch (error) {
      Logger.error('Erro ao listar modelos:', error);
      return [];
    }
  }

  /**
   * Garante que o modelo está ativo (otimizado)
   */
  async ensureModelActive(modelName: string): Promise<void> {
    try {
      // Verificar se o modelo já está rodando (sem bloquear)
      const models = await this.listModels();
      const model = models.find(m => m.name === modelName);
      
      if (model && model.status === 'ready') {
        return; // Modelo já está ativo
      }

      // Iniciar modelo em background
      Logger.ollama(`🚀 Iniciando modelo ${modelName}...`);
      
      exec(`ollama run ${modelName} "test"`, (error) => {
        if (error) {
          Logger.warn(`Modelo ${modelName} não pôde ser iniciado:`, error.message);
        }
      });

      // Aguardar um pouco para o modelo estar pronto
      await this.waitForModelReady(modelName);
      
    } catch (error) {
      Logger.warn(`Erro ao garantir modelo ativo ${modelName}:`, error);
    }
  }

  /**
   * Aguarda modelo estar pronto (com timeout)
   */
  private async waitForModelReady(modelName: string): Promise<void> {
    const maxWait = 10000; // 10s máximo
    const checkInterval = 500; // Verificar a cada 500ms
    
    for (let i = 0; i < maxWait; i += checkInterval) {
      try {
        const models = await this.listModels();
        const model = models.find(m => m.name === modelName);
        
        if (model && model.status === 'ready') {
          return;
        }
        
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      } catch {
        // Continuar tentando
      }
    }
    
    Logger.warn(`Modelo ${modelName} não ficou pronto em ${maxWait}ms`);
  }

  /**
   * Hash simples para cache de prompts
   */
  private hashPrompt(prompt: string): string {
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
      const char = prompt.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  /**
   * Promise com timeout
   */
  private timeoutPromise<T>(ms: number, message: string): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    });
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
   * Limpa cache manualmente
   */
  clearCache(): void {
    this.cache.clear();
    this.modelCache.clear();
    Logger.ollama('🗑️ Cache limpo');
  }

  /**
   * Obtém o modelo padrão
   */
  getDefaultModel(): string {
    return this.DEFAULT_MODEL;
  }
}
