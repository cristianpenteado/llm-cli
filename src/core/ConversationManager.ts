import { ModelManager } from './ModelManager';
import { ChatSession, ChatMessage, ChatCommand, ProjectContext } from '../types';
import { Logger } from '../utils/Logger';
import { Banner } from '../utils/Banner';

import * as fs from 'fs-extra';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';

export class ConversationManager {
  private modelManager: ModelManager;
  private currentSession: ChatSession | null = null;
  private commands: Map<string, ChatCommand> = new Map();
  private projectContext: ProjectContext | null = null;
  private processingInterval: NodeJS.Timeout | null = null;
  private verboseLogs: boolean;

  constructor(modelManager: ModelManager, verboseLogs: boolean = false) {
    this.modelManager = modelManager;
    this.verboseLogs = verboseLogs;
    this.initializeCommands();
    if (verboseLogs) {
      Logger.info('🔍 [LOGS] ConversationManager inicializado com logs verbosos');
    }
  }

  /**
   * Inicializa comandos disponíveis
   */
  private initializeCommands(): void {
    this.commands.set('/help', {
      name: 'help',
      description: 'Mostra ajuda sobre comandos disponíveis',
      usage: '/help [comando]',
      examples: ['/help', '/help /change-model'],
      handler: this.handleHelp.bind(this)
    });

    this.commands.set('/change-model', {
      name: 'change-model',
      description: 'Troca o modelo LLM ativo',
      usage: '/change-model <nome-do-modelo>',
      examples: ['/change-model phi-3:3.8b-instruct', '/change-model deepseek-coder:6.7b-instruct'],
      handler: this.handleChangeModel.bind(this)
    });

    this.commands.set('/status', {
      name: 'status',
      description: 'Mostra status da sessão atual',
      usage: '/status',
      examples: ['/status'],
      handler: this.handleStatus.bind(this)
    });

    this.commands.set('/clear', {
      name: 'clear',
      description: 'Limpa o histórico da conversa',
      usage: '/clear',
      examples: ['/clear'],
      handler: this.handleClear.bind(this)
    });

    this.commands.set('/save', {
      name: 'save',
      description: 'Salva a conversa atual',
      usage: '/save [nome]',
      examples: ['/save', '/save sessao-importante'],
      handler: this.handleSave.bind(this)
    });

    this.commands.set('/load', {
      name: 'load',
      description: 'Carrega uma conversa salva',
      usage: '/load <nome>',
      examples: ['/load load sessao-importante'],
      handler: this.handleLoad.bind(this)
    });

    this.commands.set('/context', {
      name: 'context',
      description: 'Mostra contexto atual do projeto',
      usage: '/context',
      examples: ['/context'],
      handler: this.handleContext.bind(this)
    });

    this.commands.set('/exit', {
      name: 'exit',
      description: 'Sai da conversa',
      usage: '/exit',
      examples: ['/exit'],
      handler: this.handleExit.bind(this)
    });
  }

  /**
   * Pergunta algo ao usuário
   */
  async askUser(options: { type: 'confirm'; message: string; default?: boolean }): Promise<{ shouldInit: boolean }> {
    const inquirer = (await import('inquirer')).default;
    
    const { shouldInit } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldInit',
        message: options.message,
        default: options.default || false
      }
    ]);
    
    return { shouldInit };
  }

  /**
   * Inicia uma conversa interativa com o modelo
   */
  async startConversation(modelName: string): Promise<void> {
    try {
      // Mostrar banner do chat
      Banner.showChat();
      
      // Configurar sessão
      this.currentSession = {
        id: uuidv4(),
        modelName,
        messages: [],
        startTime: new Date(),
        isActive: true
      };

      // Mostrar informações da sessão
      this.showSessionInfo(modelName);
      
      // Loop principal da conversa
      while (this.currentSession.isActive) {
        try {
          // Mostrar prompt intuitivo
          const userInput = await this.getUserInput();
          
          if (!userInput.trim()) continue;
          
          // Processar comando especial
          if (userInput.startsWith('/')) {
            await this.processCommand(userInput);
            continue;
          }

          // Adicionar mensagem do usuário ao histórico
          this.addUserMessage(userInput);
          
          // Mostrar indicador de processamento
          this.showProcessingIndicator();
          
          // Processar resposta da IA
          const response = await this.processUserInput(userInput);
          
          // Parar indicador de processamento
          this.stopProcessingIndicator();
          
          // Adicionar resposta da IA ao histórico
          this.addAIMessage(response);
          
          // Mostrar resposta formatada
          this.showAIResponse(response);
          
        } catch (error) {
          this.stopProcessingIndicator();
          Logger.error('Erro na conversa:', error);
          
          // Mostrar erro de forma amigável
          this.showError(error);
        }
      }
      
    } catch (error) {
      Logger.error('Erro ao iniciar conversa:', error);
      throw error;
    }
  }

  /**
   * Mostra informações da sessão de forma elegante
   */
  private showSessionInfo(modelName: string): void {
    Logger.newline();
    Logger.info('🎯 Sessão de Chat Iniciada');
    Logger.info('═'.repeat(60));
    Logger.info(`🤖 Modelo: ${chalk.hex('#8B5CF6')(modelName)}`);
    Logger.info(`⏰ Iniciado em: ${new Date().toLocaleTimeString('pt-BR')}`);
    Logger.info(`💡 Digite /help para ver comandos disponíveis`);
    Logger.info(`🔄 Digite /exit para sair do chat`);
    Logger.info('═'.repeat(60));
    Logger.newline();
  }

  /**
   * Obtém input do usuário com interface intuitiva
   */
  private async getUserInput(): Promise<string> {
    const inquirer = (await import('inquirer')).default;
    
    const { message } = await inquirer.prompt([
      {
        type: 'input',
        name: 'message',
        message: chalk.hex('#8B5CF6')('💬 Digite sua mensagem:'),
        prefix: chalk.hex('#8B5CF6')('➤'),
        suffix: chalk.gray('(Enter para enviar, Ctrl+C para sair)'),
        validate: (input: string) => {
          if (!input.trim()) {
            return 'Por favor, digite uma mensagem';
          }
          return true;
        }
      }
    ]);
    
    return message.trim();
  }



  /**
   * Adiciona mensagem do usuário ao histórico
   */
  private addUserMessage(content: string): void {
    if (this.currentSession) {
      this.currentSession.messages.push({
        id: uuidv4(),
        role: 'user',
        content,
        timestamp: new Date()
      });
    }
  }

  /**
   * Adiciona mensagem da IA ao histórico
   */
  private addAIMessage(content: string): void {
    if (this.currentSession) {
      this.currentSession.messages.push({
        id: uuidv4(),
        role: 'assistant',
        content,
        timestamp: new Date()
      });
    }
  }

  /**
   * Mostra resposta da IA de forma elegante
   */
  private showAIResponse(response: string): void {
    Logger.newline();
    
    // Cabeçalho da resposta
    Logger.info(chalk.hex('#10B981')('🤖 Resposta da IA:'));
    Logger.info(chalk.hex('#10B981')('─'.repeat(50)));
    
    // Conteúdo da resposta
    const lines = response.split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        Logger.info(chalk.white(`  ${line}`));
      }
    });
    
    // Rodapé da resposta
    Logger.info(chalk.hex('#10B981')('─'.repeat(50)));
    Logger.info(chalk.gray(`⏰ ${new Date().toLocaleTimeString('pt-BR')}`));
    Logger.newline();
  }

  /**
   * Mostra erro de forma amigável
   */
  private showError(error: any): void {
    Logger.newline();
    Logger.error(chalk.red('❌ Erro na conversa:'));
    Logger.error(chalk.red('─'.repeat(50)));
    Logger.error(chalk.white(`  ${error.message || error}`));
    Logger.error(chalk.red('─'.repeat(50)));
    Logger.info(chalk.yellow('💡 Tente novamente ou digite /help para ajuda'));
    Logger.newline();
  }

  /**
   * Processa input do usuário e retorna resposta da IA
   */
  private async processUserInput(userInput: string): Promise<string> {
    try {
      // Detectar tipo de input
      const inputType = this.detectInputType(userInput);
      
      if (inputType === 'conversation') {
        return await this.handleAsConversation(userInput);
      } else {
        return await this.handleAsAgent(userInput);
      }
      
    } catch (error) {
      Logger.error('Erro ao processar input:', error);
      throw error;
    }
  }

  /**
   * Detecta o tipo de input do usuário
   */
  private detectInputType(input: string): 'conversation' | 'action' {
    const actionKeywords = [
      'crie', 'criar', 'implemente', 'implementar', 'adicione', 'adicionar',
      'modifique', 'modificar', 'edite', 'editar', 'remova', 'remover',
      'faça', 'fazer', 'gere', 'gerar', 'escreva', 'escrever'
    ];
    
    const lowerInput = input.toLowerCase();
    return actionKeywords.some(keyword => lowerInput.includes(keyword)) 
      ? 'action' 
      : 'conversation';
  }

  /**
   * Trata input como conversa normal
   */
  private async handleAsConversation(userInput: string): Promise<string> {
    try {
      const response = await this.modelManager.sendPrompt(
        this.currentSession!.modelName,
        userInput
      );
      
      return this.extractResponseText(response);
      
    } catch (error) {
      Logger.error('Erro ao processar conversa:', error);
      throw error;
    }
  }

  /**
   * Trata input como ação/agente
   */
  private async handleAsAgent(userInput: string): Promise<string> {
    try {
      // Construir prompt para modo agente
      const agentPrompt = `Você é um assistente de desenvolvimento inteligente. 
      
Contexto: ${this.getProjectContext()}

Ação solicitada: ${userInput}

Por favor, execute a ação solicitada e forneça:
1. Explicação clara do que foi feito
2. Código ou arquivos modificados/criados
3. Próximos passos recomendados

Seja direto e prático.`;

      const response = await this.modelManager.sendPrompt(
        this.currentSession!.modelName,
        agentPrompt
      );
      
      return this.extractResponseText(response);
      
    } catch (error) {
      Logger.error('Erro ao processar ação:', error);
      throw error;
    }
  }

  /**
   * Extrai texto da resposta da IA
   */
  private extractResponseText(response: any): string {
    if (typeof response === 'string') {
      return response;
    }
    
    if (response && typeof response === 'object') {
      if (response.response) {
        return response.response;
      }
      
      if (response.content) {
        if (Array.isArray(response.content)) {
          return response.content.map((item: any) => item.text || item.content || '').join('\n');
        }
        
        if (typeof response.content === 'string') {
          return response.content;
        }
        
        if (response.content.text) {
          return response.content.text;
        }
      }
    }
    
    return 'Resposta não pôde ser processada';
  }

  /**
   * Obtém contexto do projeto atual
   */
  private getProjectContext(): string {
    // Implementar lógica para obter contexto do projeto
    return 'Projeto ativo detectado';
  }

  /**
   * Processa comandos especiais
   */
  private async processCommand(command: string): Promise<void> {
    const args = command.split(' ');
    const cmd = args[0].toLowerCase();
    
    switch (cmd) {
      case '/help':
        await this.handleHelp(args.slice(1));
        break;
      case '/exit':
        this.currentSession!.isActive = false;
        Logger.info('👋 Até logo!');
        break;
      case '/clear':
        this.clearConversation();
        break;
      case '/status':
        this.showStatus();
        break;
      case '/change-model':
        await this.handleChangeModel(args.slice(1));
        break;
      default:
        Logger.warn(`❓ Comando desconhecido: ${cmd}. Digite /help para ver comandos disponíveis.`);
    }
  }

  /**
   * Processa comando
   */
  private async handleCommand(input: string): Promise<void> {
    const [command, ...args] = input.split(' ');
    const chatCommand = this.commands.get(command);

    if (chatCommand) {
      try {
        await chatCommand.handler(args);
      } catch (error) {
        Logger.error(`Erro ao executar comando ${command}:`, error);
      }
    } else {
      Logger.warn(`Comando desconhecido: ${command}. Use /help para ver comandos disponíveis.`);
    }
  }

  /**
   * Manipula comando de ajuda
   */
  private async handleHelp(args: string[]): Promise<void> {
    if (args.length === 0) {
      Logger.header('Comandos Disponíveis');
      this.commands.forEach((command, key) => {
        Logger.info(`${key} - ${command.description}`);
      });
      Logger.info('\n💡 Use /help <comando> para mais detalhes sobre um comando específico.');
    } else {
      const commandName = args[0];
      const command = this.commands.get(commandName);
      
      if (command) {
        Logger.header(`Comando: ${commandName}`);
        Logger.info(`Descrição: ${command.description}`);
        Logger.info(`Uso: ${command.usage}`);
        Logger.info('Exemplos:');
        command.examples.forEach(example => {
          Logger.info(`  ${example}`);
        });
      } else {
        Logger.warn(`Comando não encontrado: ${commandName}`);
      }
    }
  }

  /**
   * Manipula comando de troca de modelo
   */
  private async handleChangeModel(args: string[]): Promise<void> {
    if (args.length === 0) {
      Logger.warn('❌ Nome do modelo não especificado');
      Logger.info('Uso: /change-model <nome-do-modelo>');
      return;
    }

    const modelName = args[0];
    Logger.info(`🔄 Trocando modelo para: ${modelName}`);

    try {
      // Verificar se o modelo está disponível
      const availableModels = await this.modelManager.listAvailableModels();
      const modelExists = availableModels.some(m => m.name === modelName);
      
      if (!modelExists) {
        Logger.error(`❌ Modelo "${modelName}" não encontrado`);
        return;
      }

      // Atualizar modelo da sessão
      if (this.currentSession) {
        this.currentSession.modelName = modelName;
        Logger.success(`✅ Modelo alterado para: ${modelName}`);
      }

    } catch (error) {
      Logger.error('Erro ao trocar modelo:', error);
    }
  }

  /**
   * Manipula comando de status
   */
  private async handleStatus(args: string[]): Promise<void> {
    if (!this.currentSession) {
      Logger.warn('❌ Nenhuma sessão ativa');
      return;
    }

    Logger.header('Status da Sessão');
    Logger.info(`ID da Sessão: ${this.currentSession.id}`);
    Logger.info(`Modelo: ${this.currentSession.modelName}`);
    Logger.info(`Iniciada em: ${this.currentSession.startTime.toLocaleString()}`);
    Logger.info(`Mensagens: ${this.currentSession.messages.length}`);
    
    if (this.currentSession) {
      Logger.info(`Modelo: ${this.currentSession.modelName}`);
      Logger.info(`Sessão: ${this.currentSession.id}`);
    }
  }

  /**
   * Manipula comando de limpar
   */
  private async handleClear(args: string[]): Promise<void> {
    if (!this.currentSession) {
      Logger.warn('❌ Nenhuma sessão ativa');
      return;
    }

    this.currentSession.messages = [];
    Logger.success('✅ Histórico da conversa limpo');
  }

  /**
   * Manipula comando de salvar
   */
  private async handleSave(args: string[]): Promise<void> {
    if (!this.currentSession) {
      Logger.warn('❌ Nenhuma sessão ativa');
      return;
    }

    const name = args[0] || `conversa-${Date.now()}`;
    const savePath = path.join(process.cwd(), '.llm-cli', 'conversations', `${name}.json`);

    try {
      await fs.ensureDir(path.dirname(savePath));
      await fs.writeJson(savePath, this.currentSession, { spaces: 2 });
      Logger.success(`✅ Conversa salva como: ${name}`);
    } catch (error) {
      Logger.error('Erro ao salvar conversa:', error);
    }
  }

  /**
   * Manipula comando de carregar
   */
  private async handleLoad(args: string[]): Promise<void> {
    if (args.length === 0) {
      Logger.warn('❌ Nome da conversa não especificado');
      Logger.info('Uso: /load <nome>');
      return;
    }

    const name = args[0];
    const loadPath = path.join(process.cwd(), '.llm-cli', 'conversations', `${name}.json`);

    try {
      if (await fs.pathExists(loadPath)) {
        const savedSession = await fs.readJson(loadPath);
        this.currentSession = savedSession;
        Logger.success(`✅ Conversa carregada: ${name}`);
      } else {
        Logger.warn(`❌ Conversa não encontrada: ${name}`);
      }
    } catch (error) {
      Logger.error('Erro ao carregar conversa:', error);
    }
  }

  /**
   * Manipula comando de contexto
   */
  private async handleContext(args: string[]): Promise<void> {
    if (!this.currentSession) {
      Logger.warn('❌ Nenhuma sessão ativa');
      return;
    }

    Logger.header('Informações da Sessão');
    Logger.info(`Modelo: ${this.currentSession.modelName}`);
    Logger.info(`Sessão: ${this.currentSession.id}`);
    Logger.info(`Iniciada em: ${this.currentSession.startTime.toLocaleString()}`);
    Logger.info(`Mensagens: ${this.currentSession.messages.length}`);
  }

  /**
   * Manipula comando de sair
   */
  private async handleExit(args: string[]): Promise<void> {
    Logger.info('👋 Encerrando conversa...');
    process.exit(0);
  }

  /**
   * Define contexto do projeto
   */
  setProjectContext(context: ProjectContext): void {
    this.projectContext = context;
  }

  /**
   * Obtém sessão atual
   */
  getCurrentSession(): ChatSession | null {
    return this.currentSession;
  }

  /**
   * Obtém estatísticas da conversa
   */
  getConversationStats(): any {
    if (!this.currentSession) {
      return null;
    }

    const userMessages = this.currentSession.messages.filter(m => m.role === 'user').length;
    const assistantMessages = this.currentSession.messages.filter(m => m.role === 'assistant').length;
    const systemMessages = this.currentSession.messages.filter(m => m.role === 'system').length;

    return {
      sessionId: this.currentSession.id,
      model: this.currentSession.modelName,
      startTime: this.currentSession.startTime,
      duration: Date.now() - this.currentSession.startTime.getTime(),
      totalMessages: this.currentSession.messages.length,
      userMessages,
      assistantMessages,
      systemMessages
    };
  }

  /**
   * Mostra separador visual para a resposta
   */
  private showResponseSeparator(): void {
    console.log('\n');
    console.log(chalk.hex('#8B5CF6')('┌─ ' + chalk.bold('ASSISTENTE') + ' ─' + '─'.repeat(50) + '┐'));
  }

  /**
   * Mostra instruções iniciais do chat
   */
  private showChatInstructions(): void {
    console.log('\n');
    console.log(chalk.hex('#8B5CF6').bold('╔══════════════════════════════════════════════════════════════╗'));
    console.log(chalk.hex('#A78BFA').bold('║                        💬 CHAT ATIVO                         ║'));
    console.log(chalk.hex('#C4B5FD').bold('║              Digite suas perguntas ou use /help               ║'));
    console.log(chalk.hex('#DDD6FE').bold('║              Desenvolvido para a comunidade ❤️               ║'));
    console.log(chalk.hex('#EDE9FE').bold('╚══════════════════════════════════════════════════════════════╝'));
    console.log('\n');
  }

  /**
   * Mostra separador visual para o input do usuário
   */
  private showInputSeparator(input: string): void {
    console.log('\n');
    console.log(chalk.hex('#8B5CF6')('┌─ ' + chalk.bold('USUÁRIO') + ' ─' + '─'.repeat(Math.max(0, 60 - input.length)) + '┐'));
    console.log(chalk.hex('#A78BFA')(`│ ${chalk.white(input)}${' '.repeat(Math.max(0, 58 - input.length))} │`));
    console.log(chalk.hex('#C4B5FD')('└' + '─'.repeat(62) + '┘'));
    console.log('\n');
  }

  /**
   * Mostra indicador de processamento
   */
  private showProcessingIndicator(): void {
    process.stdout.write(chalk.hex('#8B5CF6')('🔄 Processando'));
    
    // Animar o indicador
    const dots = ['.', '..', '...'];
    let dotIndex = 0;
    
    this.processingInterval = setInterval(() => {
      process.stdout.write('\r' + chalk.hex('#8B5CF6')('🔄 Processando' + dots[dotIndex]));
      dotIndex = (dotIndex + 1) % dots.length;
    }, 500);
  }

  /**
   * Para o indicador de processamento
   */
  private stopProcessingIndicator(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      process.stdout.write('\r' + ' '.repeat(50) + '\r'); // Limpar linha
    }
  }

  /**
   * Mostra resposta de forma elegante
   */
  private showResponse(content: string): void {
    console.log('\n');
    
    // Dividir conteúdo em linhas para melhor formatação
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      if (line.trim() === '') {
        console.log('');
      } else {
        const padding = ' '.repeat(2);
        console.log(chalk.hex('#A78BFA')(`${padding}${line}`));
      }
    });
    
    console.log('\n');
    console.log(chalk.hex('#C4B5FD')('└' + '─'.repeat(62) + '┘'));
  }

  /**
   * Mostra sugestões de forma elegante
   */
  private showSuggestions(suggestions: string[]): void {
    console.log('\n');
    console.log(chalk.hex('#8B5CF6')('┌─ ' + chalk.bold('💡 SUGESTÕES') + ' ─' + '─'.repeat(45) + '┐'));
    
    suggestions.forEach((suggestion, index) => {
      const padding = ' '.repeat(2);
      console.log(chalk.hex('#A78BFA')(`${padding}${index + 1}. ${suggestion}`));
    });
    
    console.log(chalk.hex('#C4B5FD')('└' + '─'.repeat(62) + '┘'));
    console.log('\n');
  }

  /**
   * Mostra resposta de erro de forma elegante
   */
  private showErrorResponse(): void {
    console.log('\n');
    console.log(chalk.hex('#EF4444')('┌─ ' + chalk.bold('❌ ERRO') + ' ─' + '─'.repeat(52) + '┐'));
    console.log(chalk.hex('#F87171')(`  Desculpe, ocorreu um erro ao processar sua mensagem.`));
    console.log(chalk.hex('#F87171')(`  Tente novamente ou use /help para ver comandos disponíveis.`));
    console.log(chalk.hex('#FCA5A5')('└' + '─'.repeat(62) + '┘'));
    console.log('\n');
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
   * Mostra ajuda sobre comandos disponíveis
   */
  private showHelp(): void {
    console.log('\n');
    console.log(chalk.hex('#8B5CF6')('┌─ ' + chalk.bold('💡 COMANDOS DISPONÍVEIS') + ' ─' + '─'.repeat(35) + '┐'));
    console.log(chalk.hex('#A78BFA')('  /help     - Mostra esta ajuda'));
    console.log(chalk.hex('#A78BFA')('  /clear    - Limpa o histórico da conversa'));
    console.log(chalk.hex('#A78BFA')('  /status   - Mostra status da sessão atual'));
    console.log(chalk.hex('#A78BFA')('  /exit     - Sai do chat'));
    console.log(chalk.hex('#C4B5FD')('└' + '─'.repeat(62) + '┘'));
    console.log('\n');
  }

  /**
   * Limpa o histórico da conversa
   */
  private clearConversation(): void {
    if (this.currentSession) {
      this.currentSession.messages = [];
      console.log(chalk.hex('#8B5CF6')('🧹 Histórico da conversa limpo'));
      console.log('\n');
    }
  }

  /**
   * Mostra status da sessão atual
   */
  private showStatus(): void {
    if (this.currentSession) {
      console.log('\n');
      console.log(chalk.hex('#8B5CF6')('┌─ ' + chalk.bold('📊 STATUS DA SESSÃO') + ' ─' + '─'.repeat(40) + '┐'));
      console.log(chalk.hex('#A78BFA')(`  Modelo: ${this.currentSession.modelName}`));
      console.log(chalk.hex('#A78BFA')(`  Sessão: ${this.currentSession.id}`));
      console.log(chalk.hex('#A78BFA')(`  Início: ${this.currentSession.startTime.toLocaleString()}`));
      console.log(chalk.hex('#A78BFA')(`  Mensagens: ${this.currentSession.messages.length}`));
      console.log(chalk.hex('#C4B5FD')('└' + '─'.repeat(62) + '┘'));
      console.log('\n');
    }
  }

  /**
   * Mostra modo agente
   */
  private showAgentMode(message: string): void {
    const agentBanner = chalk.blue.bold('🤖 MODO AGENTE ATIVADO');
    const action = chalk.yellow(`Executando: ${message}`);
    
    console.log('\n' + '='.repeat(50));
    console.log(agentBanner);
    console.log(action);
    console.log('='.repeat(50) + '\n');
  }

  /**
   * Mostra que está executando ação
   */
  private showExecutingAction(): void {
    console.log(chalk.blue('⚡ Executando ação...'));
  }

  /**
   * Mostra resultado da ação
   */
  private showActionResult(content: string): void {
    console.log(chalk.green('✅ Ação executada com sucesso!'));
    console.log(chalk.cyan('📋 Resultado:'));
    console.log(content);
    console.log('\n' + '─'.repeat(50) + '\n');
  }
}

