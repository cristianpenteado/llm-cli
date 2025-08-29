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
  private defaultModel = 'phi3:mini';
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
      // Tentar listar modelos para verificar se o servidor está respondendo
      const { stdout } = await execAsync('ollama list');
      Logger.ollama('✅ Servidor Ollama está rodando');
    } catch (error) {
      Logger.warn('⚠️ Servidor Ollama não está respondendo, verificando status...');
      
      try {
        // Tentar iniciar servidor Ollama
        const { stdout, stderr } = await execAsync('ollama serve', { timeout: 5000 });
        Logger.success('✅ Servidor Ollama iniciado');
        
      } catch (startError: any) {
        // Verificar se o erro é de porta em uso (Ollama já está rodando)
        if (startError.stderr && startError.stderr.includes('address already in use')) {
          Logger.ollama('✅ Porta 11434 em uso - Ollama já está rodando em background');
          // Não aguardar, continuar direto - o servidor pode demorar para responder
          return;
        }
        
        // Se não for erro de porta em uso, tentar verificar se o servidor já está rodando
        try {
          await this.waitForServerReady();
          Logger.ollama('✅ Servidor Ollama já estava rodando');
          return;
        } catch (waitError) {
          Logger.error('❌ Erro ao iniciar servidor Ollama:', startError);
          throw new Error('Falha ao iniciar servidor Ollama. Execute manualmente: ollama serve');
        }
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
        const { stdout } = await execAsync('ollama list');
        if (stdout && stdout.trim()) {
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
      Logger.ollama(`🔍 Verificando se modelo padrão ${this.defaultModel} está disponível...`);
      
      const models = await this.listModels();
      Logger.ollama(`📋 Modelos encontrados: ${models.length}`);
      
      if (models.length > 0) {
        Logger.ollama(`📝 Modelos: ${models.map(m => m.name).join(', ')}`);
      }
      
      const defaultModel = models.find(m => m.name === this.defaultModel);
      
      if (defaultModel) {
        Logger.ollama(`✅ Modelo padrão ${this.defaultModel} já está disponível`);
        return;
      }
      
      Logger.ollama(`❌ Modelo padrão ${this.defaultModel} não encontrado. Mostrando seletor...`);
      
      // Perguntar ao usuário se quer baixar o modelo padrão
      const shouldDownload = await this.askUserToDownloadDefault();
      
      if (shouldDownload) {
        Logger.ollama(`📥 Baixando modelo padrão ${this.defaultModel}...`);
        await this.downloadModelWithProgress(this.defaultModel);
        Logger.success(`✅ Modelo padrão ${this.defaultModel} baixado com sucesso`);
      } else {
        Logger.ollama(`🤖 Usuário escolheu selecionar outro modelo...`);
        // Permitir que o usuário escolha outro modelo
        const selectedModel = await this.selectModelInteractively();
        if (selectedModel) {
          Logger.ollama(`✅ Usando modelo selecionado: ${selectedModel}`);
          // Atualizar modelo padrão
          this.defaultModel = selectedModel;
        } else {
          throw new Error('Nenhum modelo selecionado. É necessário ter pelo menos um modelo disponível.');
        }
      }
      
    } catch (error) {
      Logger.error(`Erro ao garantir modelo padrão ${this.defaultModel}:`, error);
      throw error;
    }
  }

  /**
   * Pergunta ao usuário se quer baixar o modelo padrão
   */
  private async askUserToDownloadDefault(): Promise<boolean> {
    try {
      const inquirer = (await import('inquirer')).default;
      
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: `Modelo padrão ${this.defaultModel} não encontrado. O que você gostaria de fazer?`,
          choices: [
            { name: `📥 Baixar ${this.defaultModel} (recomendado)`, value: 'download' },
            { name: '🤖 Escolher outro modelo disponível', value: 'select' },
            { name: '❌ Cancelar', value: 'cancel' }
          ],
          default: 'download'
        }
      ]);

      if (action === 'cancel') {
        throw new Error('Operação cancelada pelo usuário');
      }

      return action === 'download';
    } catch (error) {
      // Se inquirer falhar, usar fallback
      Logger.info(`Modelo padrão ${this.defaultModel} não encontrado.`);
      Logger.info('Para baixar manualmente, execute: ollama pull phi3:mini');
      return false;
    }
  }

  /**
   * Permite ao usuário escolher um modelo interativamente
   */
  private async selectModelInteractively(): Promise<string | null> {
    try {
      const inquirer = (await import('inquirer')).default;
      
      // Listar modelos disponíveis
      const availableModels = await this.listAvailableModels();
      
      if (availableModels.length === 0) {
        Logger.warn('⚠️ Nenhum modelo disponível. Baixando modelo padrão...');
        await this.downloadModelWithProgress(this.defaultModel);
        return this.defaultModel;
      }

      const { selectedModel } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedModel',
          message: 'Escolha um modelo para usar:',
          choices: [
            ...availableModels.map(model => ({
              name: `${model} (recomendado)`,
              value: model
            })),
            { name: '📥 Baixar novo modelo', value: 'download_new' }
          ]
        }
      ]);

      if (selectedModel === 'download_new') {
        const { newModelName } = await inquirer.prompt([
          {
            type: 'input',
            name: 'newModelName',
            message: 'Digite o nome do modelo para baixar (ex: llama3.2:3b):',
            default: 'llama3.2:3b'
          }
        ]);

        if (newModelName.trim()) {
          Logger.ollama(`📥 Baixando modelo ${newModelName}...`);
          await this.downloadModelWithProgress(newModelName.trim());
          return newModelName.trim();
        }
      }

      return selectedModel;
    } catch (error) {
      Logger.error('Erro ao selecionar modelo:', error);
      return null;
    }
  }

  /**
   * Lista modelos disponíveis para download
   */
  private async listAvailableModels(): Promise<string[]> {
    try {
      // Modelos populares e leves
      return [
        'phi3:mini',
        'llama3.2:3b',
        'mistral:7b',
        'gemma2:2b',
        'qwen2.5:0.5b',
        'codellama:7b'
      ];
    } catch (error) {
      return ['phi3:mini']; // Fallback
    }
  }

  /**
   * Faz download de um modelo com progresso visual
   */
  async downloadModelWithProgress(modelName: string): Promise<void> {
    try {
      Logger.ollama(`📥 Iniciando download do modelo ${modelName}...`);
      
      // Usar spawn para capturar output em tempo real
      const { spawn } = await import('child_process');
      
      return new Promise((resolve, reject) => {
        const ollamaProcess = spawn('ollama', ['pull', modelName]);
        
        let output = '';
        let lastProgress = '';
        
        ollamaProcess.stdout.on('data', (data) => {
          const text = data.toString();
          output += text;
          
          // Mostrar progresso em tempo real
          if (text.includes('pulling')) {
            const progressMatch = text.match(/(\d+\.?\d*)%/);
            if (progressMatch && progressMatch[1] !== lastProgress) {
              lastProgress = progressMatch[1];
              process.stdout.write(`\r📥 Download: ${lastProgress}%`);
            }
          }
        });
        
        ollamaProcess.stderr.on('data', (data) => {
          const text = data.toString();
          if (text.includes('pulling')) {
            // Mostrar progresso do stderr também
            const progressMatch = text.match(/(\d+\.?\d*)%/);
            if (progressMatch && progressMatch[1] !== lastProgress) {
              lastProgress = progressMatch[1];
              process.stdout.write(`\r📥 Download: ${lastProgress}%`);
            }
          }
        });
        
        ollamaProcess.on('close', (code) => {
          process.stdout.write('\n'); // Nova linha após progresso
          
          if (code === 0) {
            Logger.ollama(`✅ Download do modelo ${modelName} concluído`);
            // Limpar cache de modelos para refletir a mudança
            this.modelCache.clear();
            resolve();
          } else {
            reject(new Error(`Download falhou com código ${code}`));
          }
        });
        
        ollamaProcess.on('error', (error) => {
          reject(error);
        });
        
        // Timeout de 10 minutos
        setTimeout(() => {
          ollamaProcess.kill();
          reject(new Error('Timeout: download demorou mais de 10 minutos'));
        }, 600000);
      });
      
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
      return { response: cached.response };
    }

    try {
      // Verificar se o modelo existe, se não, tentar baixar
      await this.ensureModelAvailable(modelName);
      
      // Garantir que o modelo está ativo (assíncrono)
      this.ensureModelActive(modelName).catch(() => {}); // Não bloquear

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
    try {
      // Tentar listar modelos com retry
      let models: ModelConfig[] = [];
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          models = await this.listModels();
          break;
        } catch (error) {
          attempts++;
          if (attempts >= maxAttempts) {
            throw new Error(`Não foi possível conectar ao servidor Ollama após ${maxAttempts} tentativas`);
          }
          // Aguardar um pouco antes de tentar novamente
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      const model = models.find(m => m.name === modelName);
      
      if (!model) {
        if (modelName === this.defaultModel) {
          // Para o modelo padrão, sempre tentar baixar
          await this.downloadModelWithProgress(modelName);
        } else {
          // Para outros modelos, informar que precisa baixar
          throw new Error(`Modelo ${modelName} não encontrado. Use "ollama pull ${modelName}" para baixá-lo.`);
        }
      }
    } catch (error) {
      Logger.error(`Erro ao verificar modelo ${modelName}:`, error);
      throw error;
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
      
      // Usar comando sem --json para compatibilidade com versões antigas
      const { stdout } = await execAsync('ollama list', {
        timeout: 5000, // 5s timeout para listar modelos
        maxBuffer: 1024 * 1024
      });

      // Parsear saída do comando ollama list
      const models: ModelConfig[] = this.parseOllamaListOutput(stdout);
      
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
   * Parseia a saída do comando ollama list
   */
  private parseOllamaListOutput(output: string): ModelConfig[] {
    try {
      const lines = output.trim().split('\n');
      const models: ModelConfig[] = [];
      
      // Pular cabeçalho se existir
      const startIndex = lines[0].includes('NAME') ? 1 : 0;
      
      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Parsear linha do formato: NAME                TAG                 SIZE       ID
        // Exemplo: phi3:mini         latest            3.8 GB     a1b2c3d4
        const parts = line.split(/\s+/);
        if (parts.length >= 3) {
          const name = parts[0];
          const tag = parts[1];
          const size = parts.slice(2, -1).join(' '); // Tamanho pode ter espaços
          const id = parts[parts.length - 1];
          
          models.push({
            name: name,
            description: `Modelo Ollama: ${name}:${tag}`,
            size: size,
            compatibility: 'Ollama',
            parameters: 0, // Não disponível na versão antiga
            contextLength: 0, // Não disponível na versão antiga
            isLocal: true,
            status: 'ready'
          });
        }
      }
      
      return models;
    } catch (error) {
      Logger.warn('Erro ao parsear saída do ollama list, retornando lista vazia');
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
    return this.defaultModel;
  }
}
