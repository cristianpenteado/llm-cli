import {
  Logger,
  ProjectAnalysis,
  CommandResult
} from '../../domain/interfaces';
import { Agent, TaskStep, TaskPlan } from '../../domain/agent/Agent';
import { ConversationContext } from '../../domain/agent/ConversationContext';
import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as readline from 'readline';

export class CLI {
  private currentPlan: TaskPlan | null = null;
  private currentStepIndex: number = 0;
  private isStreaming: boolean = false;
  private isProcessing: boolean = false;
  private currentStreamAbortController: AbortController | null = null;
  private readonly agent: Agent;
  private readonly logger: Logger;
  private readonly conversationContext: ConversationContext;
  private rl: readline.Interface;

  constructor(
    agent: Agent,
    logger: Logger,
    conversationContext: ConversationContext
  ) {
    this.agent = agent;
    this.logger = logger;
    this.conversationContext = conversationContext;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  public async run(selectedModel: string): Promise<void> {
    try {
      // Exibe o banner colorido
      console.clear();
      console.log(this.getBannerContent());
      
      // Exibe informações do modelo
      console.log(chalk.blue(`\n🤖 Iniciando CLI com modelo ${selectedModel}`));
      console.log(chalk.gray('💡 Digite "help" para ver comandos disponíveis'));
      console.log(chalk.gray('🚪 Digite "exit" ou "quit" para sair\n'));
      
      this.rl.on('line', async (input) => {
        if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
          this.rl.close();
          return;
        }
        await this.handleInput(input);
      });

      this.rl.on('close', () => {
        console.log(chalk.blue('\n👋 Até logo!'));
        process.exit(0);
      });

    } catch (error: unknown) {
      console.error(chalk.red('\n❌ Erro:'),
        error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  public async handleInput(input: string): Promise<void> {
    try {
      // Se já está processando, ignora novas entradas (exceto exit)
      if (this.isProcessing && !['exit', 'quit'].includes(input.toLowerCase())) {
        console.log(chalk.yellow('\n⏳ Aguardando processamento anterior...'));
        return;
      }
      
      // Comandos especiais
      if (input.toLowerCase() === 'help') {
        this.showHelp();
        return;
      }
      
      if (input.toLowerCase() === 'clear') {
        console.clear();
        console.log(this.getBannerContent());
        console.log(chalk.blue(`\n🤖 CLI limpa - modelo ativo: ${this.getCurrentModel()}`));
        console.log(chalk.gray('💡 Digite "help" para ver comandos disponíveis\n'));
        return;
      }
      
      if (input.toLowerCase() === 'status') {
        this.showStatus();
        return;
      }
      
      // Marca como processando
      this.isProcessing = true;
      
      try {
        // Verifica se é uma solicitação de implementação
        if (this.isImplementationRequest(input)) {
          console.log(chalk.yellow('\n🎯 Detectei uma solicitação de implementação!'));
          const shouldCreatePlan = await this.askCreatePlan();
          if (shouldCreatePlan) {
            await this.createPlan(input);
            if (this.currentPlan) {
              const shouldExecute = await this.askExecutePlan();
              if (shouldExecute) {
                await this.executePlan();
              }
            }
          }
        } else {
          // Conversa normal - processa a query sem criar plano
          await this.processNormalQuery(input);
        }
      } finally {
        // Sempre marca como não processando no final
        this.isProcessing = false;
      }
      
    } catch (error: unknown) {
      this.isProcessing = false;
      console.error(chalk.red('\n❌ Erro:'),
        error instanceof Error ? error.message : String(error));
    }
  }

  private showSpinner(text: string): NodeJS.Timeout {
    const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;
    process.stdout.write('\n');
    return setInterval(() => {
      process.stdout.write(`\r${spinner[i]} ${text}`);
      i = (i + 1) % spinner.length;
    }, 80);
  }

  private clearSpinner(spinner: NodeJS.Timeout): void {
    clearInterval(spinner);
    process.stdout.write('\r');
  }

  private getBannerContent(): string {
    const lines = [
      chalk.hex('#8B5CF6')('╭─────────────────────────────────────────╮'),
      chalk.hex('#7C3AED')('│           🚀 LLM-CLI v2.0.0            │'),
      chalk.hex('#6D28D9')('│      AI Development Assistant           │'),
      chalk.hex('#8B5CF6')('╰─────────────────────────────────────────╯'),
      '',
      chalk.gray('💡 Type "help" for commands • "exit" to quit'),
      chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'),
      ''
    ];
    
    return lines.join('\n');
  }

  private getCurrentModel(): string {
    return 'default'; // TODO: Implementar rastreamento do modelo atual
  }

  private showHelp(): void {
    console.log(chalk.hex('#8B5CF6')('\n📚 Available Commands:'));
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.white('  help     - Show this help'));
    console.log(chalk.white('  clear    - Clear screen and show banner'));
    console.log(chalk.white('  status   - Show current CLI status'));
    console.log(chalk.white('  exit     - Exit application'));
    console.log(chalk.white('  quit     - Exit application'));
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.hex('#8B5CF6')('\n💬 To chat, just type your message!'));
    console.log(chalk.gray('   Example: "How to create a REST API?"\n'));
  }

  private showStatus(): void {
    console.log(chalk.hex('#8B5CF6')('\n📊 CLI Status:'));
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.white(`  Active Model: ${this.getCurrentModel()}`));
    console.log(chalk.white(`  Current Plan: ${this.currentPlan ? this.currentPlan.title : 'None'}`));
    console.log(chalk.white(`  Current Step: ${this.currentPlan ? this.currentStepIndex + 1 : 0}/${this.currentPlan?.steps.length || 0}`));
    console.log(chalk.white(`  Streaming: ${this.isStreaming ? 'Active' : 'Inactive'}`));
    console.log(chalk.white(`  History: ${this.conversationContext.getConversationHistory().length} messages`));
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log('');
  }

  private isImplementationRequest(input: string): boolean {
    // Palavras-chave que indicam que o usuário quer IMPLEMENTAR algo
    const implementationKeywords = [
      'criar', 'fazer', 'implementar', 'desenvolver', 'construir', 'gerar',
      'adicionar', 'incluir', 'setup', 'configurar', 'instalar', 'montar',
      'escrever', 'programar', 'codificar', 'estruturar', 'organizar'
    ];
    
    // Palavras-chave que indicam que é apenas uma PERGUNTA
    const questionKeywords = [
      'como funciona', 'o que é', 'explique', 'entenda', 'diferenca',
      'quando usar', 'por que', 'qual', 'quem', 'onde', 'quando'
    ];
    
    const normalized = input.toLowerCase();
    
    // Se contém palavras de implementação E não é apenas uma pergunta
    const hasImplementationIntent = implementationKeywords.some(keyword => 
      normalized.includes(keyword)
    );
    
    const isJustQuestion = questionKeywords.some(keyword => 
      normalized.includes(keyword) && !hasImplementationIntent
    );
    
    // Retorna true se tem intenção de implementação e não é apenas pergunta
    return hasImplementationIntent && !isJustQuestion;
  }

  private async processNormalQuery(input: string): Promise<void> {
    const spinner = this.showSpinner('Pensando...');
    
    try {
      // Adiciona a mensagem do usuário ao contexto
      this.conversationContext.addMessage('user', input);
      
      // Processa a query normalmente com o agente
      const response = await this.agent.processQuery(input);
      
      // Para o spinner
      this.clearSpinner(spinner);
      
      // Adiciona a resposta do assistente ao contexto
      this.conversationContext.addMessage('assistant', response.content);
      
      // Exibe a resposta com design moderno
      console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
      console.log(chalk.hex('#8B5CF6')('💬 AI Response:'));
      console.log(chalk.white(response.content));
      
      // Se for uma resposta de código, oferece para salvar
      if (response.type === 'code') {
        console.log(chalk.hex('#F59E0B')('\n💻 Code detected!'));
        const shouldSave = await this.askForConfirmation('Save this code to a file?');
        if (shouldSave) {
          await this.saveCodeToFile(response.content);
        }
      }
      
      console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
      console.log('');
      
    } catch (error) {
      this.clearSpinner(spinner);
      console.error(chalk.red('\n❌ Erro ao processar query:'), error);
    }
  }

  private async saveCodeToFile(codeContent: string): Promise<void> {
    try {
      // Extrai o código do markdown se necessário
      const codeMatch = codeContent.match(/```(\w+)?\n([\s\S]*?)```/);
      const code = codeMatch ? codeMatch[2] : codeContent;
      const language = codeMatch ? codeMatch[1] || 'txt' : 'txt';
      
      // Gera nome do arquivo baseado no timestamp
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '');
      const fileName = `generated_${timestamp}.${language}`;
      
      // Salva o arquivo usando o serviço de arquivo
      // TODO: Implementar acesso ao serviço de arquivo
      console.log(chalk.hex('#F59E0B')(`\n💾 File would be saved as: ${fileName}`));
      console.log(chalk.gray('   (File saving functionality in development)'));
      
    } catch (error) {
      console.error(chalk.red('\n❌ Erro ao salvar arquivo:'), error);
    }
  }

  private async askForConfirmation(prompt: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      if (!this.rl) {
        resolve(false);
        return;
      }
      this.rl.question(chalk.yellow(`\n❓ ${prompt} (s/N): `), (answer) => {
        resolve(answer.toLowerCase() === 's');
      });
    });
  }

  private async askCreatePlan(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      if (!this.rl) {
        resolve(false);
        return;
      }
      this.rl.question(
        chalk.yellow('\n❓ Deseja criar um plano para esta tarefa? (s/N): '),
        (answer) => {
          resolve(answer.toLowerCase() === 's');
        }
      );
    });
  }

  private async askExecutePlan(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      if (!this.rl) {
        resolve(false);
        return;
      }
      this.rl.question(
        chalk.yellow('\n❓ Deseja executar o plano agora? (s/N): '),
        (answer) => {
          resolve(answer.toLowerCase() === 's');
        }
      );
    });
  }

  private getImplementationConfig(): string {
    return `
    - Use TypeScript
    - Follow clean code principles
    - Implement error handling
    - Add JSDoc comments for public methods
    - Follow the project's existing patterns and conventions
    `;
  }

  private buildContextualPrompt(input: string, isImplementationRequest: boolean = false): string {
    let prompt = '';

    if (this.conversationContext) {
      prompt += `\n\n${this.conversationContext.getFormattedHistory()}`;
    }

    if (isImplementationRequest) {
      const config = this.getImplementationConfig();
      prompt += `\n\nImplementation Configuration:\n${config}`;
    }

    prompt += `\n\nInstruction: ${input}\n\nResponse: `;
    return prompt;
  }

  private async analyzeProjectStructure(path: string = process.cwd()): Promise<ProjectAnalysis> {
    const spinner = this.showSpinner('Analisando estrutura do projeto...');

    try {
      const analysis = await this.agent.analyzeProjectStructure(path);
      this.clearSpinner(spinner);
      console.log(chalk.green('\n✅ Análise concluída com sucesso!'));
      return analysis;
    } catch (error: unknown) {
      this.clearSpinner(spinner);
      console.error(chalk.red('\n❌ Erro na análise:'),
        error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  private async createPlan(task: string): Promise<void> {
    try {
      console.log(chalk.blue(`\n📋 Criando plano para: ${task}`));
      const spinner = this.showSpinner('Analisando tarefa e criando plano...');

      try {
        const isCodeTask: boolean = /\b(criar|modificar|implementar|desenvolver|escrever|codar|programar)\b/i.test(task);

        if (isCodeTask) {
          const projectAnalysis = await this.agent.analyzeProjectStructure();
          this.logger.debug('Project analysis:', projectAnalysis);
        }

        this.currentPlan = await this.agent.createPlan(task);
        this.currentStepIndex = 0;
        
        this.clearSpinner(spinner);
        this.showCreatedPlan();

      } catch (error) {
        this.clearSpinner(spinner);
        throw error;
      }
    } catch (error: unknown) {
      console.error(chalk.red('\n❌ Erro ao criar plano:'), 
        error instanceof Error ? error.message : String(error));
    }
  }

  private showCreatedPlan(): void {
    if (!this.currentPlan) return;

    console.log(chalk.green(`\n✅ Plano criado: ${this.currentPlan.title}`));
    console.log(chalk.gray(this.currentPlan.description));

    if (this.currentPlan.estimatedTime) {
      console.log(chalk.blue(`⏱️  Tempo estimado: ${this.currentPlan.estimatedTime}`));
    }

    if (this.currentPlan.steps.length > 0) {
      console.log(chalk.blue('\nPassos do plano:'));
      this.currentPlan.steps.forEach((step: TaskStep, index: number) => {
        console.log(chalk.blue(`\n${index + 1}. ${step.title}`));
        if (step.command) {
          console.log(chalk.gray(`   Comando: ${step.command}`));
        }
      });
    }
  }

  private async executePlan(): Promise<void> {
    if (!this.currentPlan) {
      console.log(chalk.yellow('\n⚠️ Nenhum plano para executar.'));
      return;
    }

    console.log(chalk.blue(`\n🚀 Executando plano: ${this.currentPlan.title}`));

    for (let i = this.currentStepIndex; i < this.currentPlan.steps.length; i++) {
      const step = this.currentPlan.steps[i];
      this.currentStepIndex = i;

      console.log(`\n${chalk.blue('▶️  Passo')} ${i + 1}/${this.currentPlan.steps.length}: ${step.title}`);

      if (!step.command) {
        continue;
      }

      const confirmation = await this.askForConfirmation(step.title);
      if (!confirmation) {
        console.log(chalk.yellow('\n⏸️  Execução pausada pelo usuário.'));
        return;
      }

      const spinner = this.showSpinner('Executando...');

      try {
        const result = await this.agent.executeStep(step, confirmation);
        this.clearSpinner(spinner);

        if (result.success) {
          console.log(chalk.green('\n✅ Passo executado com sucesso!'));
          
          if (result.message) {
            console.log(chalk.gray(result.message));
          }

          if (result.filesModified && result.filesModified.length > 0) {
            console.log(chalk.blue('\nArquivos modificados:'));
            result.filesModified.forEach(file => console.log(`  - ${chalk.blue(file)}`));
          }
        }
      } catch (error) {
        this.clearSpinner(spinner);
        console.error(chalk.red('\n❌ Erro ao executar passo:'),
          error instanceof Error ? error.message : String(error));
        
        const continueConfirmation = await this.askForConfirmation('Deseja continuar com o próximo passo?');
        if (!continueConfirmation) {
          console.log(chalk.yellow('\n⏸️  Execução pausada pelo usuário.'));
          return;
        }
      }
    }

    if (this.currentStepIndex >= this.currentPlan.steps.length - 1) {
      console.log(chalk.green('\n✅ Plano executado completamente!'));
      this.currentPlan = null;
      this.currentStepIndex = 0;
    } else {
      console.log(chalk.yellow(`\n⏸️  Execução pausada no passo ${this.currentStepIndex + 1}/${this.currentPlan.steps.length}`));
    }
  }

  private async executeSystemCommand(command: string): Promise<void> {
    if (!command) return;

    try {
      console.log(chalk.yellow(`\n⚡ Executando: ${command}`));
      const execPromise = promisify(exec);
      await execPromise(command);
      console.log(chalk.green(`✅ Comando executado: ${command}`));
    } catch (error: unknown) {
      console.error(chalk.red('\n❌ Erro ao executar comando:'), 
        error instanceof Error ? error.message : String(error));
      throw error;
    }
  }
}
