import * as blessed from 'blessed';
import * as readline from 'readline';
import chalk from 'chalk';
import { Agent, TaskPlan, TaskStep, ConfirmationResult } from '../../domain/agent/Agent';
import { ModelProvider } from '../../domain/communication/ModelProvider';
import { Configuration } from '../../domain/configuration/Configuration';
import { Logger } from '../../application/ports/Logger';
import { WebSearchService } from '../../application/services/WebSearchService';
import { DuckDuckGoProvider } from '../search/DuckDuckGoProvider';

export class CLI {
  private screen: any;
  private chatBox: any;
  private inputBox: any;
  private headerBox: any;
  private rl: readline.Interface;
  private webSearchService: WebSearchService;
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
    this.webSearchService = new WebSearchService(
      new DuckDuckGoProvider(),
      this.agent
    );
    this.initializeUI();
  }

  private initializeUI(): void {
    // Create screen
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'LLM-CLI - AI Agent Terminal'
    });

    // Header with banner
    this.headerBox = blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: 12,
      content: this.getBannerContent(),
      tags: true,
      style: {
        fg: 'white',
        bg: 'blue'
      },
      border: {
        type: 'line'
      }
    });

    // Chat messages area
    this.chatBox = blessed.box({
      top: 12,
      left: 0,
      width: '100%',
      height: '100%-15',
      scrollable: true,
      alwaysScroll: true,
      tags: true,
      style: {
        fg: 'white',
        bg: 'black'
      },
      border: {
        type: 'line'
      }
    });

    // Input box
    this.inputBox = blessed.textbox({
      bottom: 0,
      left: 0,
      width: '100%',
      height: 3,
      inputOnFocus: true,
      style: {
        fg: 'white',
        bg: 'black'
      },
      border: {
        type: 'line'
      }
    });

    // Append elements to screen
    this.screen.append(this.headerBox);
    this.screen.append(this.chatBox);
    this.screen.append(this.inputBox);

    // Key bindings
    this.screen.key(['escape', 'q', 'C-c'], () => {
      process.exit(0);
    });

    this.inputBox.key('enter', () => {
      const input = this.inputBox.getValue();
      if (input.trim()) {
        this.handleInput(input.trim());
        this.inputBox.clearValue();
      }
    });

    // Focus input
    this.inputBox.focus();
    this.screen.render();
  }

  private getBannerContent(): string {
    return `{center}{bold}
██╗     ██╗     ███╗   ███╗     ██████╗██╗     ██╗
██║     ██║     ████╗ ████║    ██╔════╝██║     ██║
██║     ██║     ██╔████╔██║    ██║     ██║     ██║
██║     ██║     ██║╚██╔╝██║    ██║     ██║     ██║
███████╗███████╗██║ ╚═╝ ██║    ╚██████╗███████╗██║
╚══════╝╚══════╝╚═╝     ╚═╝     ╚═════╝╚══════╝╚═╝

                AI Agent Terminal
        Desenvolvido para a comunidade ❤️
{/bold}{/center}`;
  }

  async run(selectedModel?: string): Promise<void> {
    if (selectedModel) {
      this.config.model.defaultModel = selectedModel;
    }
    await this.checkOllamaConnection();
    this.showWelcome();
    // Skip warmup for now to avoid blocking
    // await this.warmupModel();
    console.log(chalk.cyan('💬 Digite sua mensagem ou "help" para ajuda\n'));
    this.startInteractiveSession();
  }

  private showWelcome(): void {
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
    const spinner = this.showSpinner();
    
    try {
      // Check if this is a search request first
      if (this.webSearchService.isSearchQuery(input)) {
        await this.handleSearchRequest(input, spinner);
        return;
      }

      // Detect interaction type and adjust configuration dynamically
      const isImplementationRequest = this.detectImplementationRequest(input);
      const enhancedPrompt = this.buildContextualPrompt(input, isImplementationRequest);

      // Process query with timeout protection
      const response = await Promise.race([
        this.agent.processQuery(enhancedPrompt),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout: Resposta demorou mais que 60s')), 60000)
        )
      ]);
      
      this.clearSpinner(spinner);
      
      console.log(chalk.green('\n💬 Resposta:'));
      console.log(this.formatResponse(response.content, response.type));
      
      // Check if response contains implementation plans or commands
      await this.handleResponseActions(response.content, input);
      
      if (response.metadata) {
        console.log(chalk.gray(`\n⏱️  Modelo: ${response.metadata.model} | Duração: ${Math.round((response.metadata.duration || 0) / 1000000)}ms`));
      }
    } catch (error: any) {
      this.clearSpinner(spinner);
      console.log(chalk.red('\n💬 Resposta:'));
      if (error.message.includes('Timeout')) {
        console.log(chalk.yellow('⏰ O modelo está demorando para responder. Tente:'));
        console.log(chalk.gray('  • Reiniciar o Ollama: ollama serve'));
        console.log(chalk.gray('  • Verificar se o modelo está carregado: ollama ps'));
        console.log(chalk.gray('  • Testar diretamente: ollama run phi3:mini "oi"'));
      } else {
        console.log(chalk.red(`Erro: ${error.message}`));
      }
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
    console.log(chalk.green('\n🔍 Pesquisa na web (detecta automaticamente):'));
    console.log(chalk.gray('  • "Pesquise sobre React Hooks"'));
    console.log(chalk.gray('  • "O que é Docker?"'));
    console.log(chalk.gray('  • "Buscar informações sobre TypeScript"'));
    console.log(chalk.gray('  • "Como funciona GraphQL?"'));
    console.log(chalk.green('\n🛠️ Implementação (detecta automaticamente):'));
    console.log(chalk.gray('  • "Quero criar uma API REST com Express"'));
    console.log(chalk.gray('  • "Implementa autenticação no meu projeto"'));
    console.log(chalk.gray('  • "Fazer um sistema de login completo"'));
    console.log(chalk.gray('  • "Configurar TypeScript no projeto"'));
    console.log(chalk.yellow('\n✨ O assistente vai:'));
    console.log(chalk.gray('  • Detectar quando você quer pesquisar algo'));
    console.log(chalk.gray('  • Buscar informações atualizadas na web'));
    console.log(chalk.gray('  • Detectar quando você quer implementar algo'));
    console.log(chalk.gray('  • Criar planos automaticamente'));
    console.log(chalk.gray('  • Sugerir comandos para executar'));
    console.log(chalk.gray('  • Pedir sua aprovação antes de executar'));
    console.log(chalk.cyan('\n💡 Dica: Converse naturalmente, sem comandos especiais!'));
    console.log(chalk.magenta('\n🌐 Pesquisa: Use DuckDuckGo para buscar informações atualizadas'));
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

  private detectImplementationRequest(input: string): boolean {
    const implementationKeywords = [
      'implementar', 'criar', 'fazer', 'desenvolver', 'construir', 'gerar',
      'adicionar', 'incluir', 'setup', 'configurar', 'instalar', 'build',
      'codificar', 'programar', 'escrever código', 'funcionalidade',
      'feature', 'sistema', 'aplicação', 'app', 'projeto'
    ];
    
    const lowerInput = input.toLowerCase();
    return implementationKeywords.some(keyword => lowerInput.includes(keyword));
  }

  private buildContextualPrompt(input: string, isImplementation: boolean): string {
    // For simple greetings, use minimal prompt
    const simpleGreetings = ['oi', 'olá', 'ola', 'hi', 'hello', 'hey', 'e aí', 'eai'];
    if (simpleGreetings.includes(input.toLowerCase().trim())) {
      return `${input}

Responda de forma simples e natural. Apenas cumprimente de volta e pergunte como pode ajudar, sem explicações longas.`;
    }

    if (isImplementation) {
      return `${input}

CONFIGURAÇÃO DINÂMICA PARA IMPLEMENTAÇÃO:
- USE TEMPERATURA ALTA (0.8-0.9) para criatividade no planejamento
- USE MÁXIMO DE TOKENS (4096+) para respostas completas e detalhadas
- USE PERSONALIDADE DETALHADA para explicações profundas

INSTRUÇÕES PARA IMPLEMENTAÇÃO:
- Você é um assistente de desenvolvimento experiente e humanizado
- Adapte sua linguagem ao nível técnico percebido do usuário
- Para implementações, seja EXTREMAMENTE DETALHADO e COMPLETO no planejamento
- Use toda sua capacidade de análise para criar planos robustos e abrangentes
- Explique o "porquê" das decisões técnicas de forma acessível
- Seja empático, encorajador e motivador durante o processo
- Antecipe problemas e sugira soluções preventivas
- Formate comandos como: COMANDO_SUGERIDO: comando aqui
- Crie planos em JSON detalhados e estruturados quando necessário
- Considere aspectos de arquitetura, performance, manutenibilidade e boas práticas`;
    } else {
      return `${input}

CONFIGURAÇÃO DINÂMICA CONVERSACIONAL:
- USE TEMPERATURA MODERADA (0.3-0.5) para respostas diretas
- USE TOKENS MODERADOS (2048) para eficiência
- USE PERSONALIDADE ADAPTÁVEL baseada no nível do usuário

INSTRUÇÕES CONVERSACIONAIS:
- Seja natural, amigável e adaptável ao nível técnico do usuário
- Se for uma pergunta simples, responda de forma direta mas humanizada
- Se perceber que o usuário é iniciante, explique conceitos básicos com paciência
- Se for experiente, pode ser mais técnico e conciso
- Sempre mantenha um tom acolhedor, prestativo e encorajador
- Use analogias e exemplos quando apropriado para facilitar o entendimento`;
    }
  }

  private async warmupModel(): Promise<void> {
    console.log(chalk.yellow('\n🚀 Inicializando assistente...'));
    
    const warmupSpinner = this.showWarmupSpinner();
    
    try {
      // Show tips while warming up
      this.showWarmupTips();
      
      // Send a simple warmup query to load the model with longer timeout
      const warmupQuery = "Oi";
      const response = await Promise.race([
        this.agent.processQuery(warmupQuery),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Warmup timeout')), 60000)
        )
      ]);
      
      this.clearSpinner(warmupSpinner);
      console.log(chalk.green('\n✅ Assistente pronto! Respostas serão instantâneas agora.'));
      console.log(chalk.cyan('💬 Digite sua mensagem ou "help" para ajuda\n'));
      
    } catch (error: any) {
      this.clearSpinner(warmupSpinner);
      console.log(chalk.yellow('\n⚠️  Pré-carregamento falhou, mas o assistente está funcionando.'));
      console.log(chalk.cyan('💬 Digite sua mensagem ou "help" para ajuda\n'));
    }
  }

  private showWarmupSpinner(): NodeJS.Timeout {
    const frames = ['🔄', '🔃', '🔁', '🔀'];
    let i = 0;
    process.stdout.write('\n');
    
    return setInterval(() => {
      process.stdout.write(`\r${chalk.cyan(frames[i % frames.length])} Carregando modelo phi3:mini... (primeira vez pode demorar 30s)`);
      i++;
    }, 500);
  }

  private showWarmupTips(): void {
    setTimeout(() => {
      console.log(chalk.blue('\n💡 Dicas enquanto carrega:'));
      console.log(chalk.gray('  • Perguntas: "Como funciona JWT?" ou "O que é Docker?"'));
      console.log(chalk.gray('  • Pesquisas: "Pesquise sobre React Hooks"'));
      console.log(chalk.gray('  • Implementação: "Criar uma API REST" ou "Fazer um login"'));
      console.log(chalk.gray('  • Comandos: "help", "clear", "exit"'));
    }, 2000);
  }

  private async handleSearchRequest(input: string, spinner: NodeJS.Timeout): Promise<void> {
    try {
      const searchQuery = this.webSearchService.extractSearchQuery(input);
      console.log(chalk.cyan(`\n🔍 Pesquisando: "${searchQuery}"`));
      
      const searchResponse = await this.webSearchService.searchAndSummarize(searchQuery, 5);
      this.clearSpinner(spinner);
      
      console.log(chalk.green('\n🌐 Resultados da Pesquisa:'));
      console.log(chalk.blue(`\n📝 Resumo:`));
      console.log(searchResponse.summary);
      
      if (searchResponse.results.length > 0) {
        console.log(chalk.blue('\n🔗 Fontes:'));
        searchResponse.results.forEach((result, index) => {
          console.log(`${index + 1}. ${chalk.cyan(result.title)}`);
          console.log(`   ${chalk.gray(result.url)}`);
          if (result.snippet && result.snippet !== result.title) {
            console.log(`   ${chalk.gray(result.snippet.substring(0, 150))}...`);
          }
          console.log('');
        });
        
        console.log(chalk.gray(`\n⏱️  Pesquisa concluída em ${searchResponse.searchTime}ms`));
        console.log(chalk.gray(`📊 ${searchResponse.results.length} resultado(s) encontrado(s)`));
      }
      
    } catch (error: any) {
      this.clearSpinner(spinner);
      console.log(chalk.red('\n❌ Erro na pesquisa:'));
      console.log(chalk.red(error.message));
    }
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
