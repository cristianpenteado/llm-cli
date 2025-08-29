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

  constructor(modelManager: ModelManager) {
    this.modelManager = modelManager;
    this.initializeCommands();
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
   * Inicia uma nova conversa
   */
  async startConversation(modelName: string): Promise<void> {
    Banner.showChat();
    Logger.info('💬 Iniciando nova conversa...');

    try {
      // Criar nova sessão
      this.currentSession = {
        id: uuidv4(),
        model: modelName,
        startTime: new Date(),
        messages: [],
        context: this.projectContext || {
          projectPath: process.cwd(),
          currentFile: undefined,
          recentFiles: [],
          language: 'Unknown',
          framework: 'Unknown',
          dependencies: []
        }
      };

      // Adicionar mensagem de sistema
      this.addMessage('system', `Sessão iniciada com modelo ${modelName}. Digite /help para ver comandos disponíveis.`);

      Logger.success('✅ Conversa iniciada');
      Logger.info('💡 Digite suas perguntas ou use /help para ver comandos disponíveis');

      // Iniciar loop de conversa
      await this.conversationLoop();

    } catch (error) {
      Logger.error('Erro ao iniciar conversa:', error);
      throw error;
    }
  }

  /**
   * Loop principal da conversa
   */
  private async conversationLoop(): Promise<void> {
    const inquirer = (await import('inquirer')).default;
    
    // Mostrar instruções iniciais
    this.showChatInstructions();
    
    while (true) {
      try {
        // Criar uma interface mais elegante para o input
        const { userInput } = await inquirer.prompt([
          {
            type: 'input',
            name: 'userInput',
            message: '',
            prefix: '',
            suffix: '',
            transformer: (input: string) => {
              // Destacar o input do usuário
              return chalk.hex('#8B5CF6').bold(`🤖 ${input}`);
            }
          }
        ]);

        const trimmedInput = userInput.trim();
        
        if (trimmedInput === '') {
          continue;
        }

        // Mostrar separador visual
        this.showInputSeparator(trimmedInput);

        // Verificar se é um comando
        if (trimmedInput.startsWith('/')) {
          await this.handleCommand(trimmedInput);
        } else {
          // Processar mensagem do usuário
          await this.processUserMessage(trimmedInput);
        }

        // Mostrar separador após resposta
        this.showResponseSeparator();
        
      } catch (error) {
        Logger.error('Erro ao processar entrada:', error);
      }
    }
  }

  /**
   * Processa mensagem do usuário
   */
  private async processUserMessage(message: string): Promise<void> {
    if (!this.currentSession) {
      Logger.error('Nenhuma sessão ativa');
      return;
    }

    // Adicionar mensagem do usuário
    this.addMessage('user', message);

    try {
      // Enviar para o modelo
      const response = await this.modelManager.sendPrompt(
        this.currentSession.model,
        message,
        this.currentSession.context
      );

      // Adicionar resposta do modelo
      this.addMessage('assistant', response.content);

      // Processar mudanças se houver
      if (response.changes && response.changes.length > 0) {
        await this.processModelChanges(response.changes);
      }

      // Mostrar sugestões se houver
      if (response.suggestions && response.suggestions.length > 0) {
        Logger.info('💡 Sugestões:');
        response.suggestions.forEach((suggestion, index) => {
          Logger.info(`  ${index + 1}. ${suggestion}`);
        });
      }

    } catch (error) {
      Logger.error('Erro ao processar mensagem:', error);
      this.addMessage('assistant', 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.');
    }
  }

  /**
   * Processa mudanças sugeridas pelo modelo
   */
  private async processModelChanges(changes: any[]): Promise<void> {
    if (changes.length === 0) return;

    Logger.info('🔧 Mudanças sugeridas pelo modelo:');
    changes.forEach((change, index) => {
      Logger.info(`  ${index + 1}. ${change.description}`);
    });

    // Perguntar se o usuário quer aplicar as mudanças
    const inquirer = (await import('inquirer')).default;
    
    const { shouldApply } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldApply',
        message: '❓ Deseja aplicar essas mudanças?',
        default: false
      }
    ]);
    
    if (shouldApply) {
      Logger.info('✅ Aplicando mudanças...');
      // Aqui você implementaria a lógica para aplicar as mudanças
      // Por exemplo, usando o FileManager
    } else {
      Logger.info('❌ Mudanças não aplicadas');
    }
  }

  /**
   * Adiciona mensagem à sessão
   */
  private addMessage(role: 'user' | 'assistant' | 'system', content: string): void {
    if (!this.currentSession) return;

    const message: ChatMessage = {
      id: uuidv4(),
      role,
      content,
      timestamp: new Date()
    };

    this.currentSession.messages.push(message);
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
        this.currentSession.model = modelName;
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
    Logger.info(`Modelo: ${this.currentSession.model}`);
    Logger.info(`Iniciada em: ${this.currentSession.startTime.toLocaleString()}`);
    Logger.info(`Mensagens: ${this.currentSession.messages.length}`);
    
    if (this.currentSession.context) {
      Logger.info(`Projeto: ${this.currentSession.context.projectPath}`);
      Logger.info(`Linguagem: ${this.currentSession.context.language}`);
      Logger.info(`Framework: ${this.currentSession.context.framework}`);
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
    if (!this.currentSession?.context) {
      Logger.warn('❌ Nenhum contexto de projeto disponível');
      return;
    }

    Logger.header('Contexto do Projeto');
    Logger.info(`Caminho: ${this.currentSession.context.projectPath}`);
    Logger.info(`Linguagem: ${this.currentSession.context.language}`);
    Logger.info(`Framework: ${this.currentSession.context.framework}`);
    
    if (this.currentSession.context.dependencies.length > 0) {
      Logger.info('Dependências:');
      this.currentSession.context.dependencies.forEach(dep => {
        Logger.info(`  - ${dep}`);
      });
    }

    if (this.currentSession.context.recentFiles.length > 0) {
      Logger.info('Arquivos Recentes:');
      this.currentSession.context.recentFiles.forEach(file => {
        Logger.info(`  - ${file}`);
      });
    }
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
      model: this.currentSession.model,
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
    console.log(chalk.hex('#8B5CF6')('🔄 Processando...'));
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
}
