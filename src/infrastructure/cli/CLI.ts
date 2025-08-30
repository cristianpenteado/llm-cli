import * as readline from 'readline';
import chalk from 'chalk';
import { Agent, TaskPlan, TaskStep, ConfirmationResult } from '../../domain/agent/Agent';
import { ModelProvider } from '../../domain/communication/ModelProvider';
import { Configuration } from '../../domain/configuration/Configuration';
import { Logger } from '../../application/ports/Logger';

export class CLI {
  private rl: readline.Interface;
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
      output: process.stdout,
      prompt: chalk.cyan('> ')
    });
  }

  async run(): Promise<void> {
    this.showWelcome();
    await this.checkOllamaConnection();
    this.startInteractiveSession();
  }

  private showWelcome(): void {
    console.log(chalk.blue.bold('\n🤖 LLM-CLI - Assistente de IA para Desenvolvimento\n'));
    console.log(chalk.gray('Olá! Sou seu assistente de IA. Posso:'));
    console.log(chalk.gray('• Conversar e explicar conceitos de programação'));
    console.log(chalk.gray('• Detectar quando você quer implementar algo e criar planos automaticamente'));
    console.log(chalk.gray('• Sugerir e executar comandos no terminal (com sua aprovação)'));
    console.log(chalk.gray('• Gerar código e funcionalidades'));
    console.log(chalk.gray('\nConverse naturalmente comigo! Exemplos:'));
    console.log(chalk.cyan('  "Como funciona JWT?"'));
    console.log(chalk.cyan('  "Quero criar uma API REST com Express"'));
    console.log(chalk.cyan('  "Implementa autenticação no meu projeto"'));
    console.log(chalk.gray('\nDigite "help" para comandos básicos.\n'));
  }

  private async checkOllamaConnection(): Promise<void> {
    try {
      const isAvailable = await this.modelProvider.isAvailable();
      if (isAvailable) {
        console.log(chalk.green('✓ Conectado ao Ollama'));
        const models = await this.modelProvider.listModels();
        console.log(chalk.gray(`  Modelos disponíveis: ${models.map(m => m.name).join(', ')}\n`));
      } else {
        console.log(chalk.yellow('⚠ Ollama não está disponível. Verifique se está rodando na porta 11434\n'));
      }
    } catch (error) {
      console.log(chalk.red(`✗ Erro ao conectar com Ollama: ${error}\n`));
    }
  }

  private startInteractiveSession(): void {
    this.rl.prompt();
    
    this.rl.on('line', async (input: string) => {
      const trimmed = input.trim();
      
      if (!trimmed) {
        this.rl.prompt();
        return;
      }

      try {
        await this.handleInput(trimmed);
      } catch (error) {
        console.log(chalk.red(`Erro: ${error}`));
      }
      
      this.rl.prompt();
    });

    this.rl.on('close', () => {
      console.log(chalk.yellow('\nTchau! 👋'));
      process.exit(0);
    });
  }

  private async handleInput(input: string): Promise<void> {
    // Handle only essential system commands
    if (input === 'exit' || input === 'quit') {
      this.rl.close();
      return;
    }

    if (input === 'clear') {
      console.clear();
      this.showWelcome();
      return;
    }

    if (input === 'help') {
      this.showHelp();
      return;
    }

    // Everything else goes through conversational processing
    await this.processConversationalInput(input);
  }

  private async processConversationalInput(input: string): Promise<void> {
    console.log(chalk.gray('\n🤔 Processando...'));
    
    try {
      // Enhanced prompt to detect implementation requests and suggest actions
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
      
      console.log(chalk.green('\n💬 Resposta:'));
      console.log(this.formatResponse(response.content, response.type));
      
      // Check if response contains implementation plans or commands
      await this.handleResponseActions(response.content, input);
      
      if (response.metadata) {
        console.log(chalk.gray(`\n⏱️  Modelo: ${response.metadata.model} | Duração: ${Math.round((response.metadata.duration || 0) / 1000000)}ms`));
      }
    } catch (error) {
      console.log(chalk.red(`\n❌ Erro ao processar: ${error}`));
    }
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
      const confirmRl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      confirmRl.question(chalk.yellow('Executar os comandos sugeridos? [s/n]: '), (answer) => {
        confirmRl.close();
        resolve(['sim', 's', 'yes', 'y'].includes(answer.toLowerCase().trim()));
      });
    });
  }

  private async askCreatePlan(): Promise<boolean> {
    return new Promise((resolve) => {
      const confirmRl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      confirmRl.question(chalk.yellow('Quer que eu crie um plano detalhado para isso? [s/n]: '), (answer) => {
        confirmRl.close();
        resolve(['sim', 's', 'yes', 'y'].includes(answer.toLowerCase().trim()));
      });
    });
  }

  private async askExecutePlan(): Promise<boolean> {
    return new Promise((resolve) => {
      const confirmRl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      confirmRl.question(chalk.yellow('Executar o plano agora? [s/n]: '), (answer) => {
        confirmRl.close();
        resolve(['sim', 's', 'yes', 'y'].includes(answer.toLowerCase().trim()));
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
    console.log(chalk.yellow(`\n⚡ Executando: ${command}`));
    
    try {
      // Here you would implement actual command execution
      // For now, we'll simulate it
      console.log(chalk.green(`✅ Comando executado: ${command}`));
    } catch (error) {
      console.log(chalk.red(`❌ Erro ao executar comando: ${error}`));
    }
  }

  private async createPlan(task: string): Promise<void> {
    console.log(chalk.gray('\n📋 Criando plano...'));
    
    try {
      this.currentPlan = await this.agent.createPlan(task);
      this.currentStepIndex = 0;
      
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
      console.log(chalk.red(`\n❌ Erro ao criar plano: ${error}`));
    }
  }

  private async executePlan(): Promise<void> {
    if (!this.currentPlan) {
      console.log(chalk.yellow('⚠ Nenhum plano ativo. Use "plan <tarefa>" para criar um.'));
      return;
    }

    console.log(chalk.blue('\n🚀 Executando plano...'));
    
    for (let i = this.currentStepIndex; i < this.currentPlan.steps.length; i++) {
      const step = this.currentPlan.steps[i];
      this.currentStepIndex = i;
      
      console.log(chalk.cyan(`\n📍 Passo ${i + 1}: ${step.title}`));
      console.log(chalk.gray(step.description));
      
      if (step.files && step.files.length > 0) {
        console.log(chalk.gray(`📁 Arquivos: ${step.files.join(', ')}`));
      }
      
      if (step.commands && step.commands.length > 0) {
        console.log(chalk.gray(`⚡ Comandos: ${step.commands.join(', ')}`));
      }
      
      const confirmation = await this.askConfirmation();
      
      if (confirmation.action === 'stop') {
        console.log(chalk.yellow('⏹️  Execução interrompida'));
        return;
      }
      
      const result = await this.agent.executeStep(step, confirmation);
      
      if (result.success) {
        console.log(chalk.green('✅ Passo concluído'));
        if (result.output) {
          console.log(chalk.gray(result.output));
        }
        if (result.filesModified && result.filesModified.length > 0) {
          console.log(chalk.blue(`📝 Arquivos modificados: ${result.filesModified.join(', ')}`));
        }
      } else {
        console.log(chalk.red('❌ Passo falhou'));
        if (result.error) {
          console.log(chalk.red(result.error));
        }
        
        const continueExecution = await this.askContinue();
        if (!continueExecution) {
          console.log(chalk.yellow('⏹️  Execução interrompida'));
          return;
        }
      }
    }
    
    console.log(chalk.green('\n🎉 Plano executado com sucesso!'));
    this.currentPlan = null;
    this.currentStepIndex = 0;
  }

  private async askConfirmation(): Promise<ConfirmationResult> {
    return new Promise((resolve) => {
      const confirmRl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      confirmRl.question(chalk.yellow('Executar este passo? [sim/skip/stop]: '), (answer) => {
        confirmRl.close();
        
        const action = answer.toLowerCase().trim();
        if (['sim', 's', 'yes', 'y'].includes(action)) {
          resolve({ action: 'sim' });
        } else if (['skip', 'pular', 'p'].includes(action)) {
          resolve({ action: 'skip' });
        } else {
          resolve({ action: 'stop' });
        }
      });
    });
  }

  private async askContinue(): Promise<boolean> {
    return new Promise((resolve) => {
      const confirmRl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      confirmRl.question(chalk.yellow('Continuar execução apesar do erro? [s/n]: '), (answer) => {
        confirmRl.close();
        resolve(['sim', 's', 'yes', 'y'].includes(answer.toLowerCase().trim()));
      });
    });
  }

  private showPlanStatus(): void {
    if (!this.currentPlan) {
      console.log(chalk.yellow('⚠ Nenhum plano ativo'));
      return;
    }
    
    console.log(chalk.blue(`\n📋 Plano: ${this.currentPlan.title}`));
    console.log(chalk.gray(`Progresso: ${this.currentStepIndex}/${this.currentPlan.steps.length} passos`));
    
    this.currentPlan.steps.forEach((step, index) => {
      let status = '⏸️';
      if (index < this.currentStepIndex) status = '✅';
      else if (index === this.currentStepIndex) status = '▶️';
      
      console.log(`  ${status} ${index + 1}. ${step.title}`);
    });
  }

  private async listModels(): Promise<void> {
    try {
      console.log(chalk.gray('\n🔍 Listando modelos...'));
      const models = await this.modelProvider.listModels();
      
      console.log(chalk.blue('\n📦 Modelos disponíveis:'));
      models.forEach(model => {
        const current = model.name === this.config.model.defaultModel ? ' (atual)' : '';
        console.log(`  • ${chalk.cyan(model.name)}${chalk.green(current)}`);
        console.log(chalk.gray(`    Família: ${model.family} | Tamanho: ${model.size}`));
      });
    } catch (error) {
      console.log(chalk.red(`\n❌ Erro ao listar modelos: ${error}`));
    }
  }

  private showConfig(): void {
    console.log(chalk.blue('\n⚙️  Configuração atual:'));
    console.log(chalk.cyan('Modelo:'));
    console.log(`  • Padrão: ${this.config.model.defaultModel}`);
    console.log(`  • Temperature: ${this.config.model.temperature}`);
    console.log(`  • Max tokens: ${this.config.model.maxTokens}`);
    
    console.log(chalk.cyan('\nAgente:'));
    console.log(`  • Nome: ${this.config.agent.name}`);
    console.log(`  • Personalidade: ${this.config.agent.personality}`);
    console.log(`  • Auto-confirmar: ${this.config.agent.autoConfirm ? 'Sim' : 'Não'}`);
    
    console.log(chalk.cyan('\nOllama:'));
    console.log(`  • Host: ${this.config.ollama.host}:${this.config.ollama.port}`);
    console.log(`  • Timeout: ${this.config.ollama.timeout}ms`);
  }

  private showHelp(): void {
    console.log(chalk.blue('\n📚 Comandos básicos:'));
    console.log('  • help  - Mostra esta ajuda');
    console.log('  • clear - Limpa a tela');
    console.log('  • exit  - Sai do programa');
    console.log(chalk.blue('\n💬 Como usar (conversa natural):'));
    console.log(chalk.green('📚 Perguntas conceituais:'));
    console.log(chalk.gray('  • "Como funciona JWT?"'));
    console.log(chalk.gray('  • "Explique o padrão Repository"'));
    console.log(chalk.gray('  • "Qual a diferença entre REST e GraphQL?"'));
    console.log(chalk.green('\n🛠️ Implementação (detecta automaticamente):'));
    console.log(chalk.gray('  • "Quero criar uma API REST com Express"'));
    console.log(chalk.gray('  • "Implementa autenticação no meu projeto"'));
    console.log(chalk.gray('  • "Fazer um sistema de login completo"'));
    console.log(chalk.gray('  • "Configurar TypeScript no projeto"'));
    console.log(chalk.yellow('\n✨ O assistente vai:'));
    console.log(chalk.gray('  • Detectar quando você quer implementar algo'));
    console.log(chalk.gray('  • Criar planos automaticamente'));
    console.log(chalk.gray('  • Sugerir comandos para executar'));
    console.log(chalk.gray('  • Pedir sua aprovação antes de executar'));
    console.log(chalk.cyan('\n💡 Dica: Converse naturalmente, sem comandos especiais!'));
  }

  private async executeCommand(command: string): Promise<void> {
    console.log(chalk.yellow(`\n⚡ Executando comando: ${command}`));
    
    try {
      // Ask for confirmation before executing system commands
      const shouldExecute = await this.askCommandConfirmation(command);
      
      if (!shouldExecute) {
        console.log(chalk.gray('Comando cancelado pelo usuário.'));
        return;
      }

      // Here you would implement actual command execution
      // For now, we'll simulate it and let the agent handle it
      const response = await this.agent.processQuery(`Execute o seguinte comando do sistema: ${command}`);
      
      console.log(chalk.green('\n✅ Comando processado:'));
      console.log(this.formatResponse(response.content, response.type));
      
    } catch (error) {
      console.log(chalk.red(`\n❌ Erro ao executar comando: ${error}`));
    }
  }

  private async handleCreationRequest(request: string): Promise<void> {
    console.log(chalk.cyan('\n🛠️ Processando solicitação de criação...'));
    
    try {
      // Extract what the user wants to create
      const whatToCreate = request.replace(/^(create|gerar)\s+/i, '');
      
      // Use the agent to generate code/functionality
      const codeSpec = {
        language: 'typescript', // Default, could be detected
        description: whatToCreate,
        requirements: [whatToCreate],
        context: await this.agent.readProject()
      };
      
      const result = await this.agent.generateCode(codeSpec);
      
      console.log(chalk.green('\n📝 Código gerado:'));
      
      result.files.forEach(file => {
        console.log(chalk.cyan(`\n📄 ${file.path}:`));
        console.log('```' + (file.path.endsWith('.ts') ? 'typescript' : ''));
        console.log(file.content);
        console.log('```');
      });
      
      if (result.instructions.length > 0) {
        console.log(chalk.blue('\n📋 Instruções:'));
        result.instructions.forEach((instruction, index) => {
          console.log(`${index + 1}. ${instruction}`);
        });
      }
      
      // Ask if user wants to save the files
      const shouldSave = await this.askSaveConfirmation();
      if (shouldSave) {
        console.log(chalk.green('💾 Arquivos salvos! (implementação pendente)'));
      }
      
    } catch (error) {
      console.log(chalk.red(`\n❌ Erro ao criar funcionalidade: ${error}`));
    }
  }

  private async askCommandConfirmation(command: string): Promise<boolean> {
    return new Promise((resolve) => {
      const confirmRl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      confirmRl.question(chalk.yellow(`⚠️  Executar comando "${command}"? [s/n]: `), (answer) => {
        confirmRl.close();
        resolve(['sim', 's', 'yes', 'y'].includes(answer.toLowerCase().trim()));
      });
    });
  }

  private async askSaveConfirmation(): Promise<boolean> {
    return new Promise((resolve) => {
      const confirmRl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      confirmRl.question(chalk.yellow('💾 Salvar arquivos gerados? [s/n]: '), (answer) => {
        confirmRl.close();
        resolve(['sim', 's', 'yes', 'y'].includes(answer.toLowerCase().trim()));
      });
    });
  }

  private formatResponse(content: string, type: string): string {
    switch (type) {
      case 'code':
        return content; // Code blocks are already formatted
      case 'error':
        return chalk.red(content);
      case 'plan':
        return chalk.blue(content);
      default:
        return content;
    }
  }
}
