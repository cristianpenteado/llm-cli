import * as readline from 'readline';
import chalk from 'chalk';
import { Agent, TaskPlan, ConfirmationResult, AgentResponse } from '../../domain/agent/Agent';
import { ConversationContext } from '../../domain/agent/ConversationContext';
import { ModelProvider } from '../../domain/communication/ModelProvider';
import { Configuration } from '../../domain/configuration/Configuration';
import { Logger } from '../../application/ports/Logger';
import { WebSearchService } from '../../application/services/WebSearchService';
import { DuckDuckGoProvider } from '../search/DuckDuckGoProvider';

export class CLI {
  private rl: readline.Interface | null = null;
  private webSearchService: WebSearchService;
  private conversationContext: ConversationContext;
  private currentPlan: TaskPlan | null = null;
  private currentStepIndex = 0;
  private isProcessing = false;
  private isInitialized = false;

  constructor(
    private agent: Agent,
    private modelProvider: ModelProvider,
    private config: Configuration,
    private logger: Logger
  ) {
    this.conversationContext = new ConversationContext(10);
    this.webSearchService = new WebSearchService(
      new DuckDuckGoProvider(),
      this.agent
    );
  }

  private initializeUI(): void {
    // Clear the screen and show banner immediately
    console.clear();
    process.stdout.write(this.getBannerContent());
    
    // Set up SIGINT handler
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\nTchau! 👋'));
      if (this.rl) this.rl.close();
      process.exit(0);
    });
    
    // Force immediate output
    process.stdout.write('');
  }

  private getBannerContent(): string {
    return chalk.hex('#8B5CF6')(`
██╗     ██╗     ███╗   ███╗     ██████╗██╗     ██╗
██║     ██║     ████╗ ████║    ██╔════╝██║     ██║
██║     ██║     ██╔████╔██║    ██║     ██║     ██║
██║     ██║     ██║╚██╔╝██║    ██║     ██║     ██║
███████╗███████╗██║ ╚═╝ ██║    ╚██████╗███████╗██║
╚══════╝╚══════╝╚═╝     ╚═╝     ╚═════╝╚══════╝╚═╝

     Agente de programação para Ollama v1.0.0
     Desenvolvido para a comunidade ❤️\n`);
  }

  async run(selectedModel?: string): Promise<void> {
    try {
      // Set selected model if provided
      if (selectedModel) {
        this.config.model.defaultModel = selectedModel;
      }
      
      // Check Ollama connection
      await this.checkOllamaConnection();
      
      // Clear screen and show banner immediately
      console.clear();
      console.log(this.getBannerContent());
      
      // Initialize the rest of the UI
      this.initializeUI();
      
      // Start the interactive session
      await this.startInteractiveSession();
      
    } catch (error) {
      console.error('\nErro ao iniciar a aplicação:', error);
      process.exit(1);
    }
  }

  private renderChatHistory(showBanner: boolean = true): void {
    console.clear();
    
    // Always show banner at the top when clearing the screen
    console.log(this.getBannerContent());
    
    // Show chat history if there are any messages
    if (this.chatHistory.length > 0) {
      console.log(chalk.blue('\n📝 Histórico da Conversa:\n'));
      
      for (let i = 0; i < this.chatHistory.length; i++) {
        const message = this.chatHistory[i];
        
        const prefix = message.role === 'user' 
          ? chalk.cyan('👤 Você: ') 
          : chalk.green('🤖 AI: ');
        
        console.log(prefix + message.content);
        
        // Add separator between messages
        if (i < this.chatHistory.length - 1) {
          const terminalWidth = process.stdout.columns || 80;
          console.log('\n' + '─'.repeat(Math.min(terminalWidth, 60)) + '\n');
        }
      }
    }
  }

  private showWelcome(): void {
    // O banner agora é mostrado no initializeUI
  }

  private async checkOllamaConnection(): Promise<void> {
    try {
      const isAvailable = await this.modelProvider.isAvailable();
      if (!isAvailable) {
        console.log(chalk.red('✗ Ollama não disponível'));
        console.log(chalk.yellow('Certifique-se de que o Ollama está rodando na porta 11434\n'));
      }
    } catch (error) {
      console.log(chalk.red('✗ Erro ao conectar com Ollama'));
      console.log(chalk.yellow('Certifique-se de que o Ollama está rodando na porta 11434\n'));
    }
  }

  private async startInteractiveSession(): Promise<void> {
    // Garantir que temos uma instância válida do readline
    if (!this.rl) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
    }

    const askQuestion = () => {
      if (!this.rl) return; // Verificação de segurança
      
      this.rl.question(chalk.blue('\n> '), async (input) => {
        const trimmed = input.trim();
        
        if (trimmed === 'exit' || trimmed === 'quit') {
          console.log(chalk.yellow('\nTchau! 👋'));
          if (this.rl) this.rl.close();
          process.exit(0);
          return;
        }
        
        if (trimmed === 'clear') {
          console.clear();
          console.log(this.getBannerContent());
          askQuestion();
          return;
        }
        
        if (!trimmed) {
          askQuestion();
          return;
        }

        try {
          await this.handleInput(trimmed);
        } catch (error) {
          console.log(chalk.red(`\n[Erro] ${error}`));
        }
        
        // Continue a sessão
        askQuestion();
      });
    };

    // Iniciar a sessão
    askQuestion();
  }

  private showHelp(): void {
    console.log(chalk.blue('\n📚 Comandos disponíveis:'));
    console.log(chalk.gray('  • clear - Limpa o histórico da conversa'));
    console.log(chalk.gray('  • exit/quit - Sai do programa'));
    console.log(chalk.gray('  • help - Mostra esta ajuda'));
    console.log(chalk.gray('  • plan <tarefa> - Cria um plano para executar uma tarefa'));
    console.log(chalk.gray('  • execute - Executa o plano atual'));
    console.log(chalk.gray('  • pesquise <termo> - Realiza uma pesquisa na web'));
    console.log('');
  }

  private async askContinue(): Promise<boolean> {
    if (!this.rl) {
      console.log(chalk.yellow('\n⚠️  Interface de leitura não disponível. Continuando...'));
      return true;
    }
    
    const question = (query: string): Promise<string> => {
      return new Promise((resolve) => {
        this.rl?.question(query, resolve);
      });
    };
    
    const answer = await question('\nDeseja continuar? (s/n): ');
    return answer.trim().toLowerCase() === 's';
  }

  private async handleSearchRequest(input: string, spinner?: NodeJS.Timeout): Promise<void> {
    try {
      const searchQuery = input.replace(/^(pesquise|pesquisar)\s*/i, '').trim();
      if (!searchQuery) {
        if (spinner) this.clearSpinner(spinner);
        console.log(chalk.yellow('\n⚠️  Por favor, especifique o termo de pesquisa.'));
        return;
      }

      console.log(chalk.cyan(`\n🔍 Pesquisando: "${searchQuery}"`));
      
      // Simulate search (replace with actual search implementation)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (spinner) {
        this.clearSpinner(spinner);
      }
      console.log(chalk.green('\n✅ Pesquisa concluída'));
      console.log(chalk.gray('\nEsta é uma simulação de pesquisa. Implemente a lógica de pesquisa real aqui.'));
      
    } catch (error) {
      if (spinner) {
        this.clearSpinner(spinner);
      }
      console.error(chalk.red('\n❌ Erro ao realizar pesquisa:'), error);
    }
  }

  private async handleInput(input: string): Promise<void> {
    if (!input.trim()) return;

    // Process special commands first
    const command = input.trim().toLowerCase();
    if (command === 'clear') {
      this.chatHistory = [];
      this.renderChatHistory();
      return;
    } else if (command === 'exit' || command === 'quit') {
      console.log(chalk.yellow('\nAté mais! 👋'));
      process.exit(0);
    } else if (command === 'help') {
      this.showHelp();
      return;
    }

    // Add to chat history
    this.chatHistory.push({ role: 'user', content: input });
    
    // Show user input immediately
    console.log('\n' + chalk.cyan('[Você]') + '\n> ' + input);
    
    // Check if it's a search request
    if (input.toLowerCase().startsWith('pesquise') || input.toLowerCase().startsWith('pesquisar')) {
      const spinner = this.showSpinner();
      await this.handleSearchRequest(input, spinner);
      return;
    }

    // Process regular input
    await this.processConversationalInput(input);
  }

  private isStreaming = false;
  private currentStreamAbortController: AbortController | null = null;
  private chatHistory: Array<{role: 'user' | 'assistant', content: string}> = [];

  private async processConversationalInput(input: string): Promise<void> {
    if (this.isProcessing) {
      console.log(chalk.yellow('\nAguarde o processamento da mensagem atual...'));
      return;
    }
    
    if (!this.rl) {
      console.error(chalk.red('Erro: Interface de leitura não inicializada'));
      return;
    }

    this.isProcessing = true;
    const spinner = this.showSpinner();
    
    try {
      // Add user message to context with clear instruction
      const userMessage = `Instrução: ${input}\n\nPor favor, forneça uma resposta direta e objetiva, focada apenas no que foi solicitado.`;
      this.conversationContext.addMessage('user', userMessage);

      // Prepara o prompt com o histórico da conversa
      const isImplementationRequest = this.detectImplementationRequest(input);
      const enhancedPrompt = this.buildContextualPrompt(input, isImplementationRequest);

      // Limpa o spinner antes de mostrar a resposta
      this.clearSpinner(spinner);
      
      // Exibe o histórico do chat
      this.renderChatHistory();
      
      // Processa a consulta com streaming
      let fullResponse = '';
      this.isStreaming = true;
      this.currentStreamAbortController = new AbortController();
      
      try {
        const response = await new Promise<AgentResponse>((resolve, reject) => {
          // Configura o manipulador de interrupção (Ctrl+C)
          const handleInterrupt = () => {
            if (this.currentStreamAbortController) {
              this.currentStreamAbortController.abort();
              console.log(chalk.yellow('\n\n✂️  Geração interrompida pelo usuário'));
              reject(new Error('Geração interrompida pelo usuário'));
            }
          };
          
          process.on('SIGINT', handleInterrupt);
          
          let buffer = '';
          
          const onChunk = (chunk: string) => {
            if (!this.isStreaming) return;
            process.stdout.write(chunk);
            buffer += chunk;
            fullResponse = buffer;
          };
          
          const processPromise = this.agent.processQuery(
            enhancedPrompt, 
            onChunk, 
            this.currentStreamAbortController?.signal
          ).then(response => ({
            ...response,
            content: buffer
          }));
          
          const timeoutPromise = new Promise<never>((_, rej) => 
            setTimeout(() => rej(new Error('Ainda estou processando sua solicitação. Por favor, aguarde mais um pouco...')), 120000) // 2 minutes timeout
          );
          
          Promise.race([processPromise, timeoutPromise])
            .then(resolve)
            .catch(reject)
            .finally(() => {
              process.off('SIGINT', handleInterrupt);
            });
        });
        
        // Adiciona a resposta ao contexto e histórico
        this.conversationContext.addMessage('assistant', fullResponse);
        this.chatHistory.push({ role: 'assistant', content: fullResponse });
        
        // Verifica se há ações a serem tomadas
        await this.handleResponseActions(fullResponse, input);
        
        if (response.metadata) {
          console.log(chalk.gray(`\n⏱️  Modelo: ${response.metadata.model} | Duração: ${Math.round((response.metadata.duration || 0) / 1000000)}ms`));
        }
      } catch (error: any) {
        this.clearSpinner(spinner);
        if (error.name === 'AbortError') {
          console.log(chalk.yellow('\nOperação interrompida pelo usuário'));
        } else {
          console.log(chalk.yellow('\n' + (error.message || 'Ocorreu um erro ao processar sua solicitação')));
        }
      } finally {
        this.isStreaming = false;
        this.currentStreamAbortController = null;
        this.isProcessing = false;
        console.log('\n');
      }
    } catch (error: any) {
      this.clearSpinner(spinner);
      console.log(chalk.yellow('\n' + (error.message || 'Ocorreu um erro ao processar sua solicitação')));
    } finally {
      this.isProcessing = false;
      this.isStreaming = false;
      this.currentStreamAbortController = null;
    }
  }

  private showSpinner(): NodeJS.Timeout {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;
    process.stdout.write('\n');
    
    return setInterval(() => {
      process.stdout.write(`\r${chalk.cyan(frames[i % frames.length])} Processando...`);
      i++;
    }, 100);
  }

  private clearSpinner(spinner: NodeJS.Timeout): void {
    clearInterval(spinner);
    process.stdout.write('\r' + ' '.repeat(20) + '\r');
  }

  private async handleResponseActions(responseContent: string, originalInput: string): Promise<void> {
    // Check for suggested commands
    const commandMatches = responseContent.match(/COMANDO_SUGERIDO:\s*(.+)/g);
    if (commandMatches) {
      console.log(chalk.yellow('\n💡 Comandos sugeridos:'));
      for (const match of commandMatches) {
        const command = match.replace('COMANDO_SUGERIDO:', '').trim();
        console.log(chalk.cyan(`  • ${command}`));
      }
      
      const shouldExecute = await this.askExecuteCommands();
      if (shouldExecute) {
        for (const match of commandMatches) {
          const command = match.replace('COMANDO_SUGERIDO:', '').trim();
          await this.executeSystemCommand(command);
        }
      }
    }

    // Check if this looks like an implementation request
    const implementationKeywords = [
      'implementar', 'criar', 'fazer', 'desenvolver', 'construir', 'gerar',
      'adicionar', 'incluir', 'setup', 'configurar', 'instalar'
    ];
    
    const isImplementationRequest = implementationKeywords.some(keyword => 
      originalInput.toLowerCase().includes(keyword)
    );

    if (isImplementationRequest && !this.currentPlan) {
      console.log(chalk.blue('\n🎯 Detectei uma solicitação de implementação!'));
      const shouldCreatePlan = await this.askCreatePlan();
      
      if (shouldCreatePlan) {
        try {
          this.currentPlan = await this.agent.createPlan(originalInput);
          this.currentStepIndex = 0;
          this.showCreatedPlan();
          
          const shouldExecutePlan = await this.askExecutePlan();
          if (shouldExecutePlan) {
            await this.executePlan();
          }
        } catch (error) {
          console.log(chalk.red(`Erro ao criar plano: ${error}`));
        }
      }
    }
  }

  private async askExecuteCommands(): Promise<boolean> {
    return new Promise((resolve) => {
      // Pause the main readline interface to avoid conflicts
      if (this.rl) {
        this.rl.pause();
      }
      
      const confirmRl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      confirmRl.question(chalk.yellow('Executar os comandos sugeridos? [s/n]: '), (answer) => {
        confirmRl.close();
        if (this.rl) {
          this.rl.resume();
        }
        const response = answer.toLowerCase().trim();
        resolve(['sim', 's', 'yes', 'y'].includes(response));
      });
    });
  }

  private async askCreatePlan(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.rl) {
        this.rl.pause();
      }
      
      const confirmRl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      confirmRl.question(chalk.yellow('Quer que eu crie um plano detalhado para isso? [s/n]: '), (answer) => {
        confirmRl.close();
        if (this.rl) {
          this.rl.resume();
        }
        const response = answer.toLowerCase().trim();
        resolve(['sim', 's', 'yes', 'y'].includes(response));
      });
    });
  }

  private async askExecutePlan(): Promise<boolean> {
    if (!this.rl) return false;
    return new Promise((resolve) => {
      if (this.rl) {
        this.rl.pause();
      }
      
      const confirmRl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      confirmRl.question(chalk.yellow('Executar o plano agora? [s/n]: '), (answer) => {
        confirmRl.close();
        if (this.rl) {
          this.rl.resume();
        }
        const response = answer.toLowerCase().trim();
        resolve(['sim', 's', 'yes', 'y'].includes(response));
      });
    });
  }

  private showCreatedPlan(): void {
    if (!this.currentPlan) return;
    
    console.log(chalk.green(`\n✅ Plano criado: ${this.currentPlan.title}`));
    console.log(chalk.gray(this.currentPlan.description));
    
    if (this.currentPlan.estimatedTime) {
      console.log(chalk.yellow(`⏱️  Tempo estimado: ${this.currentPlan.estimatedTime}`));
    }
    
    console.log(chalk.blue('\n📝 Passos:'));
    this.currentPlan.steps.forEach((step, index) => {
      const status = index === 0 ? '▶️' : '⏸️';
      console.log(`  ${status} ${index + 1}. ${step.title}`);
      console.log(chalk.gray(`     ${step.description}`));
    });
  }

  private async executeSystemCommand(command: string): Promise<void> {
    if (!command) return;
    
    console.log(chalk.yellow(`\n⚡ Executing: ${command}`));
    
    try {
      // Here you would implement actual command execution
      // For now, we'll simulate it
      console.log(chalk.green(`✅ Command executed: ${command}`));
    } catch (error) {
      console.error(chalk.red(`❌ Error executing command: ${error}`));
      throw error; // Re-throw to allow proper error handling upstream
    }
  }

  private buildContextualPrompt(input: string, isImplementationRequest: boolean = false): string {
    // Start with clear instructions
    let prompt = `You are a programming assistant focused on helping with JavaScript/TypeScript. 
Keep responses direct and focused on what was asked.`;
    
    // Add conversation history
    prompt += `\n\n${this.conversationContext.getFormattedHistory()}`;
    
    // Add specific instructions for implementation requests
    if (isImplementationRequest) {
      const config = this.getImplementationConfig();
      if (config && config.promptPrefix) {
        prompt += `\n\n${config.promptPrefix}`;
      }
    }
    
    // Add the current input with clear instruction
    prompt += `\n\nInstruction: ${input}\n\nResponse: `;
    
    return prompt;
  }


  private async createPlan(task: string): Promise<void> {
    console.log(chalk.gray('\n📋 Criando plano...'));
    
    try {
      this.currentPlan = await this.agent.createPlan(task);
      this.currentStepIndex = 0;
      
      if (!this.currentPlan) {
        console.log(chalk.yellow('\n⚠️  Não foi possível criar um plano para esta tarefa.'));
        return;
      }
      
      console.log(chalk.green(`\n✅ Plano criado: ${this.currentPlan.title}`));
      console.log(chalk.gray(this.currentPlan.description));
      
      if (this.currentPlan.estimatedTime) {
        console.log(chalk.yellow(`⏱️  Tempo estimado: ${this.currentPlan.estimatedTime}`));
      }
      
      console.log(chalk.blue('\n📝 Passos:'));
      this.currentPlan.steps.forEach((step, index) => {
        const status = index === 0 ? '▶️' : '⏸️';
        console.log(`  ${status} ${index + 1}. ${step.title}`);
        console.log(chalk.gray(`     ${step.description}`));
      });
      
      console.log(chalk.cyan('\n💡 Use "execute" para executar o plano ou "status" para ver o progresso'));
    } catch (error) {
      console.error(chalk.red('\n❌ Erro ao criar plano:'), error);
    }
  }

  private async executePlan(): Promise<void> {
    if (!this.currentPlan) {
      console.log(chalk.yellow('\n⚠️  Nenhum plano encontrado. Crie um plano primeiro.'));
      return;
    }

    console.log(chalk.blue(`\n🚀 Executando plano: ${this.currentPlan.title}`));

    for (let i = this.currentStepIndex; i < this.currentPlan.steps.length; i++) {
      const step = this.currentPlan.steps[i];
      this.currentStepIndex = i;

      console.log(chalk.blue(`\n🔧 Passo ${i + 1}/${this.currentPlan.steps.length}: ${step.title}`));
      console.log(chalk.gray(step.description));

      try {
        // Ask for confirmation before each step
        const confirmation: ConfirmationResult = await this.askForConfirmation(step);
        
        if (confirmation.action === 'stop') {
          console.log(chalk.yellow('\n⏹️  Execução do plano interrompida pelo usuário.'));
          break;
        }

        if (confirmation.action === 'skip') {
          console.log(chalk.yellow(`\n⏭️  Pulando passo: ${step.title}`));
          continue;
        }

        // Execute the step
        const result = await this.agent.executeStep(step, confirmation);
        
        if (result.success) {
          console.log(chalk.green(`\n✅ Passo concluído com sucesso!`));
          if (result.output) {
            console.log(chalk.gray(result.output));
          }
        } else {
          console.error(chalk.red(`\n❌ Erro ao executar passo: ${step.title}`));
          if (result.error) {
            console.error(chalk.red(result.error));
          }
          
          const shouldContinue = await this.askContinue();
          if (!shouldContinue) {
            break;
          }
        }
      } catch (error) {
        console.error(chalk.red(`\n❌ Erro inesperado ao executar passo: ${step.title}`), error);
        
        const shouldContinue = await this.askContinue();
        if (!shouldContinue) {
          break;
        }
      }
    }

    if (this.currentStepIndex >= this.currentPlan.steps.length - 1) {
      console.log(chalk.green('\n🎉 Plano executado com sucesso!'));
      this.currentPlan = null;
      this.currentStepIndex = 0;
    } else {
      console.log(chalk.yellow(`\n⏸️  Execução pausada no passo ${this.currentStepIndex + 1}/${this.currentPlan.steps.length}`));
    }
  }

  private async askForConfirmation(step: any): Promise<ConfirmationResult> {
    if (!this.rl) {
      return { action: 'sim' }; // Default to 'sim' if readline is not available
    }

    const question = (query: string): Promise<string> => {
      return new Promise((resolve) => {
        this.rl?.question(query, resolve);
      });
    };

    while (true) {
      const answer = await question(
        `\nDeseja executar este passo? (sim/skip/stop): `
      ).then(a => a.trim().toLowerCase());

      if (['sim', 's', 'y', 'yes', ''].includes(answer)) {
        return { action: 'sim' as const };
      } else if (['skip', 's', 'pular'].includes(answer)) {
        return { action: 'skip' as const, reason: 'Skipped by user' };
      } else if (['stop', 'sair', 'exit', 'quit', 'q'].includes(answer)) {
        return { action: 'stop' as const, reason: 'Stopped by user' };
      }

      console.log(chalk.yellow('Opção inválida. Use "sim", "skip" ou "stop".'));
    }
  }


  private detectImplementationRequest(input: string): boolean {
    const implementationKeywords = [
      'implemente', 'crie', 'desenvolva', 'faça', 'construa',
      'implementar', 'criar', 'desenvolver', 'fazer', 'construir',
      'como criar', 'como implementar', 'como desenvolver',
      'mostre o código', 'mostrar o código', 'código para',
      'exemplo de código', 'código exemplo'
    ];

    const lowerInput = input.toLowerCase();
    return implementationKeywords.some(keyword => lowerInput.includes(keyword));
  }

  private getImplementationConfig(): any {
    return {
      temperature: 0.8,
      maxTokens: 4096,
      personality: 'detailed',
      contextWindow: 8192
    };
  }

  private formatResponse(content: string, type: string): string {
    switch(type) {
      case 'code':
        return chalk.green(content);
      case 'error':
        return chalk.red(content);
      case 'warning':
        return chalk.yellow(content);
      default:
        return content;
    }
  }
}
