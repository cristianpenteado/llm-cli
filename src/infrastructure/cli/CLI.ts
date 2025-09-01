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
      
      // Exibe informações do modelo de forma mais sutil
      console.log(chalk.gray(`Model: ${selectedModel}`));
      const terminalWidth = process.stdout.columns || 80;
      const separator = '─'.repeat(Math.max(terminalWidth - 2, 20));
      console.log(chalk.gray(`━━${separator}━━`));
      console.log('');
      
      // Área de digitação destacada
      this.showInputPrompt();
      
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
        console.log(chalk.gray('\n⏳ Waiting for previous request...'));
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
        console.log(chalk.gray(`Model: ${this.getCurrentModel()}`));
        const terminalWidth = process.stdout.columns || 80;
        const separator = '─'.repeat(Math.max(terminalWidth - 2, 20));
        console.log(chalk.gray(`━━${separator}━━`));
        console.log('');
        
        // Mostra o prompt destacado novamente
        this.showInputPrompt();
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
          console.log(chalk.hex('#F59E0B')('\n🎯 Implementation request detected'));
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
      process.stdout.write(`\r${chalk.gray(spinner[i])} ${chalk.gray(text)}`);
      i = (i + 1) % spinner.length;
    }, 80);
  }

  private clearSpinner(spinner: NodeJS.Timeout): void {
    clearInterval(spinner);
    process.stdout.write('\r');
  }

  private getBannerContent(): string {
    const terminalWidth = process.stdout.columns || 80;
    const minWidth = 40;
    const width = Math.max(terminalWidth, minWidth);
    
    // Banner grande e destacado
    const lines = [
      '',
      chalk.hex('#6366F1')('╭─' + '─'.repeat(width - 8) + '─╮'),
      chalk.hex('#6366F1')('│' + ' '.repeat(Math.floor((width - 8) / 2)) + chalk.bold.white('LLM CLI') + ' '.repeat(Math.floor((width - 8) / 2)) + '│'),
      chalk.hex('#6366F1')('╰─' + '─'.repeat(width - 8) + '─╯'),
      '',
      chalk.gray('Digite sua mensagem abaixo para começar a conversar...'),
      chalk.gray('Comandos: help • clear • status • exit'),
      ''
    ];
    
    return lines.join('\n');
  }

  private getCurrentModel(): string {
    return 'default'; // TODO: Implementar rastreamento do modelo atual
  }

  private showInputPrompt(): void {
    const terminalWidth = process.stdout.columns || 80;
    const promptWidth = Math.min(terminalWidth - 4, 60);
    
    // Cria uma caixa visual destacada para a área de digitação
    console.log(chalk.hex('#6366F1')('╭─' + '─'.repeat(promptWidth) + '─╮'));
    console.log(chalk.hex('#6366F1')('│') + chalk.white(' Digite sua mensagem aqui...') + chalk.hex('#6366F1')('│'));
    console.log(chalk.hex('#6366F1')('╰─' + '─'.repeat(promptWidth) + '─╯'));
    console.log('');
    
    // Prompt visual claro e destacado
    console.log(chalk.hex('#10B981')('┌─ ') + chalk.white('Você: ') + chalk.hex('#10B981')('▸'));
  }

  private async streamResponse(content: string): Promise<void> {
    const terminalWidth = process.stdout.columns || 80;
    const separator = '─'.repeat(Math.max(terminalWidth - 2, 20));
    
    console.log(chalk.gray(`━━${separator}━━`));
    
    // Detecta se há código na resposta
    const codeBlocks = this.extractCodeBlocks(content);
    
    if (codeBlocks.length > 0) {
      // Resposta com código - aplica syntax highlighting
      await this.streamWithCodeHighlighting(content, codeBlocks);
    } else {
      // Resposta normal - stream simples
      await this.streamText(content);
    }
    
    console.log(chalk.gray(`━━${separator}━━`));
    console.log('');
  }

  private extractCodeBlocks(content: string): Array<{language: string, code: string, start: number, end: number}> {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const blocks: Array<{language: string, code: string, start: number, end: number}> = [];
    let match;
    
    while ((match = codeBlockRegex.exec(content)) !== null) {
      blocks.push({
        language: match[1] || 'text',
        code: match[2],
        start: match.index,
        end: match.index + match[0].length
      });
    }
    
    return blocks;
  }

  private async streamWithCodeHighlighting(content: string, codeBlocks: Array<{language: string, code: string, start: number, end: number}>): Promise<void> {
    let currentPos = 0;
    
    for (const block of codeBlocks) {
      // Stream texto antes do bloco de código
      if (block.start > currentPos) {
        const textBefore = content.substring(currentPos, block.start);
        await this.streamText(textBefore);
      }
      
      // Stream do bloco de código com syntax highlighting
      await this.streamCodeBlock(block.language, block.code);
      
      currentPos = block.end;
    }
    
    // Stream texto restante após o último bloco de código
    if (currentPos < content.length) {
      const remainingText = content.substring(currentPos);
      await this.streamText(remainingText);
    }
  }

  private async streamText(text: string): Promise<void> {
    const words = text.split(' ');
    
    for (const word of words) {
      process.stdout.write(chalk.yellow(word + ' '));
      await this.delay(50); // Delay pequeno para efeito de stream
    }
    console.log(''); // Nova linha após o texto
  }

  private async streamCodeBlock(language: string, code: string): Promise<void> {
    // Cabeçalho do bloco de código
    console.log(chalk.hex('#6366F1')('```' + language));
    
    // Stream do código com syntax highlighting
    const lines = code.split('\n');
    
    for (const line of lines) {
      const highlightedLine = this.highlightSyntax(language, line);
      process.stdout.write(highlightedLine + '\n');
      await this.delay(20); // Stream mais rápido para código
    }
    
    // Fechamento do bloco de código
    console.log(chalk.hex('#6366F1')('```'));
  }

  private highlightSyntax(language: string, line: string): string {
    // Syntax highlighting básico para linguagens comuns
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'js':
      case 'typescript':
      case 'ts':
        return this.highlightJavaScript(line);
      case 'python':
      case 'py':
        return this.highlightPython(line);
      case 'html':
        return this.highlightHTML(line);
      case 'css':
        return this.highlightCSS(line);
      case 'json':
        return this.highlightJSON(line);
      case 'bash':
      case 'shell':
        return this.highlightBash(line);
      default:
        return chalk.white(line);
    }
  }

  private highlightJavaScript(line: string): string {
    // Keywords JavaScript/TypeScript
    const keywords = /\b(const|let|var|function|if|else|for|while|return|class|import|export|from|default|async|await|try|catch|finally)\b/g;
    const strings = /(["'`])((?:\\.|[^\\])*?)\1/g;
    const numbers = /\b\d+\.?\d*\b/g;
    const comments = /\/\/.*$/g;
    
    let highlighted = line;
    
    // Aplica highlighting
    highlighted = highlighted.replace(keywords, chalk.hex('#FF6B6B')('$&'));
    highlighted = highlighted.replace(strings, chalk.hex('#4ECDC4')('$&'));
    highlighted = highlighted.replace(numbers, chalk.hex('#45B7D1')('$&'));
    highlighted = highlighted.replace(comments, chalk.gray('$&'));
    
    return highlighted;
  }

  private highlightPython(line: string): string {
    // Keywords Python
    const keywords = /\b(def|class|if|elif|else|for|while|try|except|finally|with|import|from|as|return|yield|lambda|True|False|None)\b/g;
    const strings = /(["'`])((?:\\.|[^\\])*?)\1/g;
    const numbers = /\b\d+\.?\d*\b/g;
    const comments = /#.*$/g;
    
    let highlighted = line;
    
    highlighted = highlighted.replace(keywords, chalk.hex('#FF6B6B')('$&'));
    highlighted = highlighted.replace(strings, chalk.hex('#4ECDC4')('$&'));
    highlighted = highlighted.replace(numbers, chalk.hex('#45B7D1')('$&'));
    highlighted = highlighted.replace(comments, chalk.gray('$&'));
    
    return highlighted;
  }

  private highlightHTML(line: string): string {
    // Tags HTML
    const tags = /<[^>]*>/g;
    const attributes = /\s(\w+)=/g;
    const strings = /(["'])((?:\\.|[^\\])*?)\1/g;
    
    let highlighted = line;
    
    highlighted = highlighted.replace(tags, chalk.hex('#FF6B6B')('$&'));
    highlighted = highlighted.replace(attributes, chalk.hex('#4ECDC4')(' $1='));
    highlighted = highlighted.replace(strings, chalk.hex('#45B7D1')('$&'));
    
    return highlighted;
  }

  private highlightCSS(line: string): string {
    // Propriedades CSS
    const properties = /([a-zA-Z-]+):/g;
    const values = /:\s*([^;]+);?/g;
    const selectors = /([.#][a-zA-Z0-9_-]+)/g;
    
    let highlighted = line;
    
    highlighted = highlighted.replace(properties, chalk.hex('#FF6B6B')('$1:'));
    highlighted = highlighted.replace(values, ': ' + chalk.hex('#4ECDC4')('$1'));
    highlighted = highlighted.replace(selectors, chalk.hex('#45B7D1')('$1'));
    
    return highlighted;
  }

  private highlightJSON(line: string): string {
    // Keys e valores JSON
    const keys = /"([^"]+)":/g;
    const strings = /"([^"]*)"/g;
    const numbers = /\b\d+\.?\d*\b/g;
    const booleans = /\b(true|false|null)\b/gi;
    
    let highlighted = line;
    
    highlighted = highlighted.replace(keys, chalk.hex('#FF6B6B')('"$1":'));
    highlighted = highlighted.replace(strings, chalk.hex('#4ECDC4')('"$1"'));
    highlighted = highlighted.replace(numbers, chalk.hex('#45B7D1')('$&'));
    highlighted = highlighted.replace(booleans, chalk.hex('#FFA500')('$&'));
    
    return highlighted;
  }

  private highlightBash(line: string): string {
    // Comandos bash
    const commands = /^\s*(\w+)/g;
    const flags = /(-\w+)/g;
    const paths = /(\/[^\s]+)/g;
    
    let highlighted = line;
    
    highlighted = highlighted.replace(commands, chalk.hex('#FF6B6B')('$1'));
    highlighted = highlighted.replace(flags, chalk.hex('#4ECDC4')('$1'));
    highlighted = highlighted.replace(paths, chalk.hex('#45B7D1')('$1'));
    
    return highlighted;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private showHelp(): void {
    const terminalWidth = process.stdout.columns || 80;
    const separator = '─'.repeat(Math.max(terminalWidth - 2, 20));
    
    console.log(chalk.hex('#6366F1')('\nComandos:'));
    console.log(chalk.gray(`━━${separator}━━`));
    console.log(chalk.white('  help     - Mostra esta ajuda'));
    console.log(chalk.white('  clear    - Limpa a tela'));
    console.log(chalk.white('  status   - Mostra status'));
    console.log(chalk.white('  exit     - Sair'));
    console.log(chalk.gray(`━━${separator}━━`));
    console.log(chalk.gray('\nApenas digite sua mensagem para começar a conversar...\n'));
  }

  private showStatus(): void {
    const terminalWidth = process.stdout.columns || 80;
    const separator = '─'.repeat(Math.max(terminalWidth - 2, 20));
    
    console.log(chalk.hex('#6366F1')('\nStatus:'));
    console.log(chalk.gray(`━━${separator}━━`));
    console.log(chalk.white(`  Modelo: ${this.getCurrentModel()}`));
    console.log(chalk.white(`  Plano: ${this.currentPlan ? this.currentPlan.title : 'Nenhum'}`));
    console.log(chalk.white(`  Passo: ${this.currentPlan ? this.currentStepIndex + 1 : 0}/${this.currentPlan?.steps.length || 0}`));
    console.log(chalk.white(`  Histórico: ${this.conversationContext.getConversationHistory().length} mensagens`));
    console.log(chalk.gray(`━━${separator}━━`));
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
      
      // Processa a query com stream para resposta rápida
      const response = await this.agent.processQuery(input);
      
      // Para o spinner
      this.clearSpinner(spinner);
      
      // Adiciona a resposta do assistente ao contexto
      this.conversationContext.addMessage('assistant', response.content);
      
      // Exibe a resposta com stream e syntax highlighting
      await this.streamResponse(response.content);
      
      // Se for uma resposta de código, oferece para salvar
      if (response.type === 'code') {
        console.log(chalk.hex('#F59E0B')('\n💻 Código detectado!'));
        const shouldSave = await this.askForConfirmation('Salvar este código em um arquivo?');
        if (shouldSave) {
          await this.saveCodeToFile(response.content);
        }
      }
      
      // Mostra claramente onde o usuário pode digitar novamente
      this.showInputPrompt();
      
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
      console.log(chalk.hex('#F59E0B')(`💾 ${fileName}`));
      console.log(chalk.gray('   (File saving in development)'));
      
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
