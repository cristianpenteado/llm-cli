import { CLI } from '../../src/infrastructure/cli/CLI';
import { Agent } from '../../src/domain/agent/Agent';
import { Logger } from '../../src/application/ports/Logger';
import { ConversationContext } from '../../src/domain/agent/ConversationContext';
import { AgentResponse, TaskPlan, StepResult } from '../../src/domain/agent/Agent';

describe('CLI Integration Tests', () => {
  let cli: CLI;
  let mockAgent: jest.Mocked<Agent>;
  let mockLogger: jest.Mocked<Logger>;
  let mockConversationContext: jest.Mocked<ConversationContext>;

  beforeEach(() => {
    // Mock do Agent
    mockAgent = {
      processQuery: jest.fn(),
      createPlan: jest.fn(),
      executeStep: jest.fn(),
      readProject: jest.fn(),
      generateCode: jest.fn(),
      analyzeProjectStructure: jest.fn()
    };

    // Mock do Logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    // Mock do ConversationContext
    mockConversationContext = {
      messages: [],
      maxHistory: 10,
      getConversationHistory: jest.fn().mockReturnValue([]),
      getFormattedHistory: jest.fn().mockReturnValue('Histórico de conversa'),
      addMessage: jest.fn(),
      clear: jest.fn()
    } as any;

    cli = new CLI(mockAgent, mockLogger, mockConversationContext);
  });

  describe('CLI Initialization', () => {
    it('should initialize CLI with dependencies', () => {
      expect(cli).toBeDefined();
      expect(mockAgent.processQuery).toBeDefined();
      expect(mockLogger.info).toBeDefined();
      expect(mockConversationContext.addMessage).toBeDefined();
    });
  });

  describe('Command Processing', () => {
    it('should handle help command', async () => {
      // Simula o comando help
      await cli['handleInput']('help');
      
      // Verifica se não tentou processar como query
      expect(mockAgent.processQuery).not.toHaveBeenCalled();
    });

    it('should handle clear command', async () => {
      // Simula o comando clear
      await cli['handleInput']('clear');
      
      // Verifica se não tentou processar como query
      expect(mockAgent.processQuery).not.toHaveBeenCalled();
    });

    it('should handle status command', async () => {
      // Simula o comando status
      await cli['handleInput']('status');
      
      // Verifica se não tentou processar como query
      expect(mockAgent.processQuery).not.toHaveBeenCalled();
    });
  });

  describe('Query Processing', () => {
    it('should process normal queries through agent', async () => {
      const mockResponse: AgentResponse = {
        content: 'Esta é uma resposta de teste',
        type: 'technical'
      };

      mockAgent.processQuery.mockResolvedValue(mockResponse);

      // Simula uma query normal
      await cli['handleInput']('Como funciona JWT?');

      // Verifica se foi processada pelo agente
      expect(mockAgent.processQuery).toHaveBeenCalledWith('Como funciona JWT?');
      expect(mockConversationContext.addMessage).toHaveBeenCalledWith('user', 'Como funciona JWT?');
      expect(mockConversationContext.addMessage).toHaveBeenCalledWith('assistant', 'Esta é uma resposta de teste');
    });

    it('should detect implementation requests correctly', async () => {
      // Simula uma solicitação de implementação
      const isImplementation = cli['isImplementationRequest']('Quero criar uma API REST');
      
      expect(isImplementation).toBe(true);
    });

    it('should detect casual conversations correctly', async () => {
      // Simula uma conversa casual
      const isImplementation = cli['isImplementationRequest']('Como funciona JWT?');
      
      expect(isImplementation).toBe(false);
    });
  });

  describe('Plan Creation and Execution', () => {
    it('should create and execute plans', async () => {
      const mockPlan: TaskPlan = {
        id: 'plan-123',
        title: 'Criar API REST',
        description: 'Implementar uma API REST completa',
        steps: [
          {
            id: 'step-1',
            title: 'Setup inicial',
            description: 'Configurar projeto',
            type: 'implementation'
          }
        ],
        estimatedTime: '2 horas'
      };

      mockAgent.createPlan.mockResolvedValue(mockPlan);
      mockAgent.executeStep.mockResolvedValue({
        success: true,
        message: 'Passo executado com sucesso'
      });

      // Simula criação de plano
      await cli['createPlan']('Criar uma API REST');

      expect(mockAgent.createPlan).toHaveBeenCalledWith('Criar uma API REST');
    });
  });

  describe('Error Handling', () => {
    it('should handle agent errors gracefully', async () => {
      mockAgent.processQuery.mockRejectedValue(new Error('Erro do agente'));

      // Simula uma query que falha
      await cli['handleInput']('query com erro');

      // Verifica se o erro foi tratado (pode ser logado ou apenas capturado)
      expect(mockAgent.processQuery).toHaveBeenCalledWith('query com erro');
    });
  });

  describe('Conversation Context Integration', () => {
    it('should maintain conversation history', async () => {
      const mockResponse: AgentResponse = {
        content: 'Resposta do assistente',
        type: 'casual'
      };

      mockAgent.processQuery.mockResolvedValue(mockResponse);

      // Simula múltiplas mensagens
      await cli['handleInput']('oi');
      await cli['handleInput']('como vai?');

      // Verifica se o histórico foi mantido
      expect(mockConversationContext.addMessage).toHaveBeenCalledTimes(4); // 2 user + 2 assistant
    });
  });
});
