import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from '../utils/Logger';
import { ModelConfig } from '../types';

const execAsync = promisify(exec);

export class OllamaManager {
  private cache = new Map<string, { response: string; timestamp: number; ttl: number }>();
  private modelCache = new Map<string, ModelConfig[]>();
  private lastModelList = 0;
  private readonly CACHE_TTL = 300000; // 5 minutos
  private readonly MODEL_LIST_CACHE_TTL = 60000; // 1 minuto
  private defaultModel = 'phi3:mini';
  private isInitialized = false;
  private isFirstRun = true; // Adicionado para controlar a primeira execução
  private activeSession: any = null; // Sessão ativa com o modelo
  private backgroundProcess: any = null; // Processo em background
  private persistentModelProcess: any = null; // Processo persistente do modelo
  private verboseLogs: boolean;

  constructor(verboseLogs: boolean = false) {
    this.verboseLogs = verboseLogs;
    // Inicializar cache limpo
  }

  /**
   * Inicializa o gerenciador Ollama
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      Logger.ollama('🚀 Inicializando gerenciador Ollama...');

      // Verificar instalação
      await this.checkOllamaInstallation();

      // Verificar servidor
      await this.checkOllamaServer();

      // Garantir modelo padrão
      await this.ensureDefaultModel();

      // Iniciar modelo em background automaticamente (não-bloqueante)
      this.startModelInBackgroundAsync(this.defaultModel);

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
   * Gera resposta do modelo com sessão contínua
   */
  async generateResponse(modelName: string, prompt: string, context?: string): Promise<{ response: string }> {
    // Garantir inicialização
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Verificar se o modelo existe, se não, tentar baixar
      await this.ensureModelAvailable(modelName);
      
      // Iniciar ou usar sessão ativa
      if (!this.activeSession || this.activeSession.modelName !== modelName) {
        await this.startModelSession(modelName);
      }

      // Enviar prompt para a sessão ativa
      const response = await this.sendToActiveSession(prompt, context);

      // Cache da resposta
      const cacheKey = `${modelName}:${this.hashPrompt(prompt)}`;
      this.cache.set(cacheKey, {
        response: response,
        timestamp: Date.now(),
        ttl: this.CACHE_TTL
      });

      // Marcar que não é mais a primeira execução
      this.isFirstRun = false;

      return { response: response };
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
    // Para conversas simples, usar apenas o prompt
    let fullPrompt = prompt;
    
    // Adicionar contexto apenas se for necessário e não for conversa simples
    if (context && context.trim() && !this.isSimplePrompt(prompt)) {
      fullPrompt = `${context}\n\nPergunta: ${prompt}`;
    }
    
    // Usar spawn para melhor controle do processo
    const { spawn } = await import('child_process');
    
    return new Promise((resolve, reject) => {
      const ollamaProcess = spawn('ollama', ['run', modelName, fullPrompt]);
      
      let stdout = '';
      let stderr = '';
      
      ollamaProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      ollamaProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      ollamaProcess.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`Ollama process exited with code ${code}. Stderr: ${stderr}`));
        }
      });
      
      ollamaProcess.on('error', (error) => {
        reject(error);
      });
      
      // Timeout fixo de 60 segundos para primeira execução
      const timeoutId = setTimeout(() => {
        ollamaProcess.kill('SIGTERM');
        reject(new Error('Timeout: resposta demorou mais de 60s'));
      }, 60000);
      
      // Limpar timeout se o processo terminar antes
      ollamaProcess.on('close', () => clearTimeout(timeoutId));
      ollamaProcess.on('error', () => clearTimeout(timeoutId));
    });
  }

  /**
   * Verifica se é um prompt simples (conversa)
   */
  private isSimplePrompt(prompt: string): boolean {
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
   * Lista modelos com cache otimizado
   */
  async listModels(): Promise<ModelConfig[]> {
    const now = Date.now();
    
    // Verificar cache de modelos
    if (this.modelCache.has('all') && (now - this.lastModelList) < this.MODEL_LIST_CACHE_TTL) {
      return this.modelCache.get('all') || [];
    }

    try {
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
   * Inicia o modelo em modo persistente para respostas imediatas
   */
  private startModelInBackgroundAsync(modelName: string): void {
    // Executar em background sem bloquear
    setImmediate(async () => {
      try {
        // Parar processo anterior se existir
        if (this.persistentModelProcess) {
          if (this.verboseLogs) {
            Logger.ollama(`🔄 [LOGS] Parando processo anterior PID: ${this.persistentModelProcess.pid}`);
          }
          this.persistentModelProcess.kill('SIGTERM');
          this.persistentModelProcess = null;
        }

        if (this.verboseLogs) {
          Logger.ollama(`🚀 [LOGS] Iniciando spawn do modelo ${modelName}`);
        }

        // Iniciar modelo em modo persistente com stdio para comunicação
        const { spawn } = await import('child_process');
        
        this.persistentModelProcess = spawn('ollama', ['run', modelName], {
          stdio: ['pipe', 'pipe', 'pipe'], // Manter stdin/stdout para comunicação
          detached: false // Processo controlado
        });

        if (this.verboseLogs) {
          Logger.ollama(`🔍 [LOGS] Processo spawnado com PID: ${this.persistentModelProcess.pid}`);
          Logger.ollama(`🔍 [LOGS] stdio configurado: pipe, pipe, pipe`);
        }

        // Configurar listeners para o processo
        this.persistentModelProcess.on('error', (error: Error) => {
          if (this.verboseLogs) {
            Logger.ollama(`❌ [LOGS] Erro no processo: ${error}`);
          }
          Logger.error('Erro no processo persistente:', error);
        });

        this.persistentModelProcess.on('exit', (code: number | null, signal: NodeJS.Signals | null) => {
          if (this.verboseLogs) {
            Logger.ollama(`⚠️ [LOGS] Processo encerrado: código ${code}, sinal ${signal}`);
          }
          Logger.warn(`Processo persistente encerrado: código ${code}, sinal ${signal}`);
          this.persistentModelProcess = null;
        });

        Logger.ollama(`✅ Modelo ${modelName} iniciado em modo persistente`);
        
      } catch (error) {
        if (this.verboseLogs) {
          Logger.ollama(`❌ [LOGS] Erro ao iniciar processo: ${error}`);
        }
        Logger.warn(`Modelo ${modelName} não pôde ser iniciado em modo persistente:`, error);
      }
    });
  }

  /**
   * Envia prompt para o processo persistente para resposta imediata
   */
  private async sendToPersistentProcess(prompt: string): Promise<string> {
    if (this.verboseLogs) {
      Logger.ollama(`🔍 [LOGS] Enviando prompt para processo persistente: "${prompt}"`);
      Logger.ollama(`🔍 [LOGS] Processo PID: ${this.persistentModelProcess?.pid}`);
      Logger.ollama(`🔍 [LOGS] Processo alive: ${this.persistentModelProcess?.killed === false}`);
    }

    return new Promise((resolve, reject) => {
      if (!this.persistentModelProcess || !this.persistentModelProcess.pid) {
        const error = 'Processo persistente não está disponível';
        if (this.verboseLogs) Logger.ollama(`❌ [LOGS] ${error}`);
        reject(new Error(error));
        return;
      }

      let response = '';
      let hasResponse = false;
      let stderrData = '';
      
      if (this.verboseLogs) {
        Logger.ollama(`🔍 [LOGS] Configurando listeners para stdout, stderr e stdin`);
      }
      
      // Capturar stderr para debug
      this.persistentModelProcess.stderr.on('data', (data: Buffer) => {
        const dataStr = data.toString();
        stderrData += dataStr;
        if (this.verboseLogs) {
          Logger.ollama(`⚠️ [LOGS] Recebido stderr: "${dataStr}"`);
        }
      });
      
      // Capturar stdout para resposta
      this.persistentModelProcess.stdout.on('data', (data: Buffer) => {
        const dataStr = data.toString();
        response += dataStr;
        if (this.verboseLogs) {
          Logger.ollama(`📥 [LOGS] Recebido stdout: "${dataStr}"`);
          Logger.ollama(`📥 [LOGS] Resposta acumulada: "${response}"`);
        }
        
        // Verificar se temos uma resposta válida
        if (response.trim() && !hasResponse) {
          hasResponse = true;
          if (this.verboseLogs) {
            Logger.ollama(`✅ [LOGS] Resposta completa recebida: "${response.trim()}"`);
          }
          resolve(response.trim());
        }
      });
      
      // Timeout de 15 segundos para resposta completa
      const timeoutId = setTimeout(() => {
        if (!hasResponse) {
          const error = `Timeout: resposta demorou mais de 15s. stderr: "${stderrData}"`;
          if (this.verboseLogs) Logger.ollama(`⏰ [LOGS] ${error}`);
          reject(new Error(error));
        }
      }, 15000);
      
      // Enviar prompt
      if (this.verboseLogs) {
        Logger.ollama(`📤 [LOGS] Enviando prompt via stdin: "${prompt}"`);
      }
      
      // Adicionar quebra de linha e aguardar um pouco
      this.persistentModelProcess.stdin.write(prompt + '\n');
      
      // Aguardar um pouco mais para o modelo processar
      setTimeout(() => {
        if (!hasResponse) {
          if (this.verboseLogs) {
            Logger.ollama(`⚠️ [LOGS] Aguardando resposta... (5s)`);
          }
        }
      }, 5000);
      
      // Se não houver resposta em 10s, tentar detectar se o modelo está processando
      setTimeout(() => {
        if (!hasResponse) {
          if (this.verboseLogs) {
            Logger.ollama(`⚠️ [LOGS] Aguardando resposta... (10s)`);
            Logger.ollama(`⚠️ [LOGS] stderr acumulado: "${stderrData}"`);
          }
        }
      }, 10000);
    });
  }

  /**
   * Envia prompt para o processo em background
   */
  private async sendToBackgroundProcess(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.backgroundProcess || !this.backgroundProcess.pid) {
        reject(new Error('Processo em background não está disponível'));
        return;
      }

      // Usar exec para enviar prompt ao modelo em background
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      const command = `ollama run ${this.activeSession.modelName} "${prompt.replace(/"/g, '\\"')}"`;
      
      execAsync(command, {
        timeout: 60000,
        maxBuffer: 1024 * 1024
      }).then(({ stdout }: any) => {
        resolve(stdout.trim());
      }).catch((error: any) => {
        reject(error);
      });
    });
  }

  /**
   * Inicia uma sessão contínua com o modelo
   */
  async startModelSession(modelName: string): Promise<void> {
    try {
      // Parar sessão anterior se existir
      if (this.activeSession) {
        await this.stopModelSession();
      }

      // Para versões antigas do Ollama, usar exec em vez de spawn
      // pois ollama run não funciona bem com stdin/stdout
      this.activeSession = {
        modelName,
        process: null,
        isReady: true
      };
      
    } catch (error) {
      Logger.error(`Erro ao iniciar sessão com ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Para a sessão ativa do modelo
   */
  async stopModelSession(): Promise<void> {
    if (this.activeSession) {
      try {
        this.activeSession.process.kill('SIGTERM');
        this.activeSession = null;
      } catch (error) {
        Logger.warn('Erro ao parar sessão do modelo:', error);
      }
    }
  }

  /**
   * Aguarda a sessão estar pronta
   */
  private async waitForSessionReady(): Promise<void> {
    if (!this.activeSession) return;
    
    return new Promise((resolve) => {
      const checkReady = () => {
        if (this.activeSession && this.activeSession.process.pid) {
          this.activeSession.isReady = true;
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    });
  }

  /**
   * Envia prompt para a sessão ativa
   */
  private async sendToActiveSession(prompt: string, context?: string): Promise<string> {
    if (!this.activeSession || !this.activeSession.isReady) {
      throw new Error('Sessão do modelo não está ativa');
    }

    try {
      // Para conversas simples, usar apenas o prompt
      let fullPrompt = prompt;
      
      // Adicionar contexto apenas se for necessário e não for conversa simples
      if (context && context.trim() && !this.isSimplePrompt(prompt)) {
        fullPrompt = `${context}\n\nPergunta: ${prompt}`;
      }
      
      // Tentar usar o processo persistente primeiro para resposta imediata
      if (this.persistentModelProcess && this.persistentModelProcess.pid) {
        try {
          if (this.verboseLogs) {
            Logger.ollama(`🔍 [LOGS] Tentando processo persistente primeiro...`);
          }
          
          // Timeout reduzido para 8 segundos
          const response = await Promise.race([
            this.sendToPersistentProcess(fullPrompt),
            new Promise<string>((_, reject) => 
              setTimeout(() => reject(new Error('Processo persistente lento')), 8000)
            )
          ]);
          
          if (this.verboseLogs) {
            Logger.ollama(`✅ [LOGS] Resposta do processo persistente: "${response}"`);
          }
          
          return response;
        } catch (persistentError) {
          if (this.verboseLogs) {
            Logger.ollama(`⚠️ [LOGS] Processo persistente falhou: ${persistentError}`);
          }
          Logger.warn('Processo persistente falhou, usando fallback...');
        }
      }
      
      // Fallback: usar exec diretamente
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      const command = `ollama run ${this.activeSession.modelName} "${fullPrompt.replace(/"/g, '\\"')}"`;
      
      // Timeout progressivo: 120s para primeira execução, 60s para subsequentes
      const timeout = this.isFirstRun ? 120000 : 60000;
      
      const { stdout } = await execAsync(command, {
        timeout: timeout,
        maxBuffer: 1024 * 1024 // 1MB buffer
      });

      // Marcar que não é mais a primeira execução
      this.isFirstRun = false;

      return stdout.trim();
    } catch (error) {
      Logger.error(`Erro ao enviar prompt para ${this.activeSession.modelName}:`, error);
      throw error;
    }
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
