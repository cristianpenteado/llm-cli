import * as readline from 'readline';
import chalk from 'chalk';
import { Agent, TaskPlan, TaskStep, ConfirmationResult } from '../../domain/agent/Agent';
import { ModelProvider } from '../../domain/communication/ModelProvider';
import { Configuration } from '../../domain/configuration/Configuration';
import { Logger } from '../../application/ports/Logger';

export class SimpleCLI {
  private rl: readline.Interface;
  private messages: Array<{content: string, type: 'user' | 'assistant' | 'error'}> = [];
  private currentPlan: TaskPlan | null = null;
  private currentStepIndex = 0;

  constructor(
    private agent: Agent,
    private modelProvider: ModelProvider,
    private config: Configuration,
    private logger: Logger
  ) {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async run(selectedModel?: string): Promise<void> {
    if (selectedModel) {
      this.config.model.defaultModel = selectedModel;
    }
    await this.checkOllamaConnection();
    this.showWelcome();
    this.startInteractiveSession();
  }

  private showWelcome(): void {
    console.clear();
    console.log('\n');
    console.log(chalk.hex('#8B5CF6')('██╗     ██╗     ███╗   ███╗     ██████╗██╗     ██╗'));
    console.log(chalk.hex('#A78BFA')('██║     ██║     ████╗ ████║    ██╔════╝██║     ██║'));
    console.log(chalk.hex('#C4B5FD')('██║     ██║     ██╔████╔██║    ██║     ██║     ██║'));
    console.log(chalk.hex('#EDE9FE')('██║     ██║     ██║╚██╔╝██║    ██║     ██║     ██║'));
    console.log(chalk.hex('#F3F4F6')('███████╗███████╗██║ ╚═╝ ██║    ╚██████╗███████╗██║'));
    console.log(chalk.hex('#DDDFFE')('╚══════╝╚══════╝╚═╝     ╚═╝     ╚═════╝╚══════╝╚═╝'));
    console.log('\n');
    console.log(chalk.hex('#8B5CF6').bold('                AI Agent Terminal'));
    console.log(chalk.hex('#C4B5FD')('        Desenvolvido para a comunidade ❤️'));
    console.log('\n');
    
    // Add welcome message
    this.addMessage('Olá! Sou seu assistente de IA. Converse naturalmente comigo - posso explicar conceitos, detectar quando você quer implementar algo e criar planos automaticamente!', 'assistant');
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

  private startInteractiveSession(): void {
    this.displayMessages();
    this.promptUser();
    
    this.rl.on('line', async (input: string) => {
      const trimmed = input.trim();
      
      if (!trimmed) {
        this.promptUser();
        return;
      }

      await this.handleInput(trimmed);
      this.promptUser();
    });

    this.rl.on('close', () => {
      console.log(chalk.yellow('\nTchau! 👋'));
      process.exit(0);
    });
  }

  private promptUser(): void {
    this.rl.setPrompt(chalk.cyan('\n> '));
    this.rl.prompt();
  }

  private async handleInput(input: string): Promise<void> {
    // Handle system commands
    if (input === 'exit' || input === 'quit') {
      this.rl.close();
      return;
    }

    if (input === 'clear') {
      this.messages = [];
      this.showWelcome();
      return;
    }

    if (input === 'help') {
      this.showHelp();
      return;
    }

    // Add user message
    this.addMessage(input, 'user');
    
    // Process conversational input
    await this.processConversationalInput(input);
  }

  private addMessage(content: string, type: 'user' | 'assistant' | 'error'): void {
    this.messages.push({ content, type });
    this.displayLastMessage();
  }

  private displayMessages(): void {
    console.log('\n' + '─'.repeat(80));
    this.messages.forEach(msg => {
      this.displayMessage(msg);
    });
    console.log('─'.repeat(80));
  }

  private displayLastMessage(): void {
    if (this.messages.length > 0) {
      const lastMessage = this.messages[this.messages.length - 1];
      this.displayMessage(lastMessage);
    }
  }

  private displayMessage(msg: {content: string, type: 'user' | 'assistant' | 'error'}): void {
    const timestamp = new Date().toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    switch (msg.type) {
      case 'user':
        console.log(chalk.blue(`\n[${timestamp}] Você:`));
        console.log(chalk.white(`  ${msg.content}`));
        break;
      case 'assistant':
        console.log(chalk.green(`\n[${timestamp}] Assistente:`));
        console.log(chalk.white(`  ${msg.content}`));
        break;
      case 'error':
        console.log(chalk.red(`\n[${timestamp}] Erro:`));
        console.log(chalk.red(`  ${msg.content}`));
        break;
    }
  }

  private async processConversationalInput(input: string): Promise<void> {
    const spinner = this.showSpinner();
    
    try {
      const enhancedPrompt = `${input}

INSTRUÇÕES ESPECIAIS PARA O ASSISTENTE:
- Se o usuário está pedindo para implementar, criar, fazer, desenvolver algo, você deve:
  1. Primeiro responder explicando o que vai fazer
  2. Criar um plano detalhado em JSON no formato especificado
  3. Sugerir comandos específicos se necessário
  
- Se o usuário está fazendo uma pergunta conceitual, apenas responda normalmente
- Se você sugerir comandos, formate-os como: COMANDO_SUGERIDO: comando aqui
- Seja conversacional e natural`;

      const response = await this.agent.processQuery(enhancedPrompt);
      this.clearSpinner(spinner);
      
      this.addMessage(response.content, response.type === 'error' ? 'error' : 'assistant');
      
      // Check if response contains implementation plans or commands
      await this.handleResponseActions(response.content, input);
      
    } catch (error) {
      this.clearSpinner(spinner);
      this.addMessage(`Erro ao processar consulta: ${error}`, 'error');
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

    if (isImplementationRequest) {
      const shouldCreatePlan = await this.askCreatePlan();
      if (shouldCreatePlan) {
        try {
          const plan = await this.agent.createPlan(originalInput);
          this.currentPlan = plan;
          this.currentStepIndex = 0;
          this.displayPlan(plan);
          
          const shouldExecutePlan = await this.askExecutePlan();
          if (shouldExecutePlan) {
            await this.executePlan();
          }
        } catch (error) {
          this.addMessage(`Erro ao criar plano: ${error}`, 'error');
        }
      }
    }
  }

  private showHelp(): void {
    console.log(chalk.blue('\n📖 Comandos disponíveis:'));
    console.log(chalk.gray('  help  - Mostra esta ajuda'));
    console.log(chalk.gray('  clear - Limpa a conversa'));
    console.log(chalk.gray('  exit  - Sair do programa'));
    console.log(chalk.gray('\n💬 Converse naturalmente para usar o assistente!'));
  }

  private async askExecuteCommands(): Promise<boolean> {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.question(chalk.yellow('\n❓ Executar comandos sugeridos? [s/n]: '), (answer: any) => {
        rl.close();
        resolve(answer.toLowerCase().startsWith('s'));
      });
    });
  }

  private async askCreatePlan(): Promise<boolean> {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.question(chalk.yellow('\n🎯 Detectei uma solicitação de implementação!\n❓ Quer que eu crie um plano detalhado para isso? [s/n]: '), (answer: any) => {
        rl.close();
        resolve(answer.toLowerCase().startsWith('s'));
      });
    });
  }

  private async askExecutePlan(): Promise<boolean> {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.question(chalk.yellow('\n❓ Executar o plano agora? [s/n]: '), (answer: any) => {
        rl.close();
        resolve(answer.toLowerCase().startsWith('s'));
      });
    });
  }

  private displayPlan(plan: TaskPlan): void {
    console.log(chalk.green(`\n✅ Plano criado: ${plan.title}`));
    console.log(chalk.gray(`📝 ${plan.description}`));
    console.log(chalk.blue('\n📋 Passos:'));
    
    plan.steps.forEach((step, index) => {
      const status = index === 0 ? '▶️' : '⏸️';
      console.log(chalk.cyan(`  ${status} ${index + 1}. ${step.title}`));
      console.log(chalk.gray(`     ${step.description}`));
    });
    
    if (plan.estimatedTime) {
      console.log(chalk.gray(`\n⏱️ Tempo estimado: ${plan.estimatedTime}`));
    }
  }

  private async executePlan(): Promise<void> {
    if (!this.currentPlan) return;

    console.log(chalk.green('\n🚀 Executando plano...'));
    
    for (let i = this.currentStepIndex; i < this.currentPlan.steps.length; i++) {
      const step = this.currentPlan.steps[i];
      console.log(chalk.blue(`\n📍 Passo ${i + 1}: ${step.title}`));
      
      const confirmation = await this.askStepConfirmation(step);
      const result = await this.agent.executeStep(step, confirmation);
      
      if (result.success) {
        console.log(chalk.green('✅ Passo concluído'));
        if (result.output) {
          console.log(chalk.gray(result.output));
        }
        this.currentStepIndex = i + 1;
      } else {
        console.log(chalk.red('❌ Passo falhou'));
        if (result.error) {
          console.log(chalk.red(result.error));
        }
        if (confirmation.action === 'stop') {
          break;
        }
      }
    }
    
    if (this.currentStepIndex >= this.currentPlan.steps.length) {
      console.log(chalk.green('\n🎉 Plano executado com sucesso!'));
      this.currentPlan = null;
      this.currentStepIndex = 0;
    }
  }

  private async askStepConfirmation(step: TaskStep): Promise<ConfirmationResult> {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.question(chalk.yellow('Executar este passo? [sim/skip/stop]: '), (answer: any) => {
        rl.close();
        const action = answer.toLowerCase();
        if (action.startsWith('skip')) {
          resolve({ action: 'skip' });
        } else if (action.startsWith('stop')) {
          resolve({ action: 'stop' });
        } else {
          resolve({ action: 'sim' });
        }
      });
    });
  }

  private async executeSystemCommand(command: string): Promise<void> {
    console.log(chalk.blue(`\n🔧 Executando: ${command}`));
    // Simulate command execution
    console.log(chalk.gray('(Execução de comandos será implementada em versão futura)'));
  }
}
