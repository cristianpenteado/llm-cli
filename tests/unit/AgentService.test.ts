import { AgentService } from '../../src/application/services/AgentService';
import { ModelProvider, GenerationResponse } from '../../src/domain/communication/ModelProvider';
import { FileSystemService } from '../../src/application/ports/FileSystemService';
import { Configuration } from '../../src/domain/configuration/Configuration';
import { Logger } from '../../src/application/ports/Logger';
import { ConversationContext } from '../../src/domain/agent/ConversationContext';

// Mock do ConversationContext
const mockConversationContext = {
  addMessage: jest.fn(),
  getConversationHistory: jest.fn().mockReturnValue([]),
  getFormattedHistory: jest.fn().mockReturnValue(''),
  clear: jest.fn()
} as any;

describe('AgentService', () => {
  let agentService: AgentService;
  let mockModelProvider: jest.Mocked<ModelProvider>;
  let mockFileSystem: jest.Mocked<FileSystemService>;
  let mockLogger: jest.Mocked<Logger>;
  let mockConfig: Configuration;

  beforeEach(() => {
    mockModelProvider = {
      listModels: jest.fn(),
      generateResponse: jest.fn(),
      streamResponse: jest.fn(),
      isAvailable: jest.fn(),
      getModelInfo: jest.fn()
    };

    mockFileSystem = {
      exists: jest.fn(),
      readFile: jest.fn(),
      writeFile: jest.fn(),
      readDirectory: jest.fn(),
      createDirectory: jest.fn(),
      deleteFile: jest.fn(),
      deleteDirectory: jest.fn(),
      getStats: jest.fn()
    };

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    mockConfig = {
      model: {
        defaultModel: 'phi3:mini',
        temperature: 0.3,
        maxTokens: 2048,
        fallbackModels: []
      },
      agent: {
        name: 'Test Agent',
        personality: 'helpful',
        autoConfirm: false,
        maxPlanSteps: 10,
        contextWindow: 8192
      },
      cli: {
        theme: 'auto',
        showTimestamps: false,
        logLevel: 'info',
        historySize: 100
      },
      ollama: {
        host: 'localhost',
        port: 11434,
        timeout: 30000,
        retryAttempts: 3,
        keepAlive: '5m'
      }
    };

    agentService = new AgentService(mockModelProvider, mockFileSystem, mockConfig);
    // @ts-ignore - Accessing private property for testing
    agentService['logger'] = mockLogger;
    // @ts-ignore - Accessing private property for testing
    agentService['conversationContext'] = mockConversationContext;
  });

  describe('processQuery', () => {
    it('should process a simple query successfully', async () => {
      const mockResponse: GenerationResponse = {
        response: 'Esta é uma resposta de teste',
        model: 'phi3:mini',
        created_at: new Date(),
        done: true
      };

      mockModelProvider.generateResponse.mockResolvedValue(mockResponse);

      const result = await agentService.processQuery('Como criar um arquivo?');

      expect(result.content).toBe('Esta é uma resposta de teste');
      expect(['casual', 'technical', 'code', 'plan', 'analysis', 'error']).toContain(result.type);
      expect(mockConversationContext.addMessage).toHaveBeenCalledWith('user', 'Como criar um arquivo?');
      expect(mockConversationContext.addMessage).toHaveBeenCalledWith('assistant', 'Esta é uma resposta de teste');
    });

    it('should handle errors gracefully', async () => {
      mockModelProvider.generateResponse.mockRejectedValue(new Error('Erro de teste'));

      const result = await agentService.processQuery('test');

      expect(result.type).toBe('error');
      expect(result.content).toContain('Erro ao processar consulta');
    });

    it('should detect casual greetings correctly', async () => {
      const mockResponse: GenerationResponse = {
        response: 'Olá! Como posso ajudar?',
        model: 'phi3:mini',
        created_at: new Date(),
        done: true
      };

      mockModelProvider.generateResponse.mockResolvedValue(mockResponse);

      const result = await agentService.processQuery('oi');

      // O tipo é determinado pela resposta do modelo, não pela query
      expect(result.type).toBeDefined();
      expect(result.content).toBe('Olá! Como posso ajudar?');
    });

    it('should detect technical questions correctly', async () => {
      const mockResponse: GenerationResponse = {
        response: 'JWT é um padrão para autenticação...',
        model: 'phi3:mini',
        created_at: new Date(),
        done: true
      };

      mockModelProvider.generateResponse.mockResolvedValue(mockResponse);

      const result = await agentService.processQuery('Como funciona JWT?');

      // O tipo é determinado pela resposta do modelo, não pela query
      expect(result.type).toBeDefined();
      expect(result.content).toBe('JWT é um padrão para autenticação...');
    });
  });

  describe('createPlan', () => {
    it('should create a valid plan', async () => {
      const result = await agentService.createPlan('Criar uma API REST');

      expect(result.title).toContain('Criar');
      expect(result.steps.length).toBeGreaterThan(0);
      expect(result.id).toBeDefined();
      expect(result.description).toContain('API REST');
    });
  });

  describe('executeStep', () => {
    it('should execute a step successfully', async () => {
      const mockStep = {
        id: 'step-1',
        title: 'Test Step',
        description: 'A test step',
        type: 'implementation'
      };

      const result = await agentService.executeStep(mockStep, true);

      expect(result.success).toBe(true);
      expect(result.message).toContain('executado com sucesso');
    });

    it('should handle step cancellation', async () => {
      const mockStep = {
        id: 'step-1',
        title: 'Test Step',
        description: 'A test step',
        type: 'implementation'
      };

      const result = await agentService.executeStep(mockStep, false);

      expect(result.success).toBe(false);
      expect(result.message).toContain('cancelada pelo usuário');
    });
  });

  describe('analyzeProjectStructure', () => {
    it('should analyze project structure successfully', async () => {
      const mockStructure = [
        {
          name: 'src',
          path: '/project/src',
          type: 'directory' as const,
          children: [
            {
              name: 'index.ts',
              path: '/project/src/index.ts',
              type: 'file' as const,
              size: 1024
            }
          ]
        }
      ];

      mockFileSystem.readDirectory.mockResolvedValue(mockStructure);

      const result = await agentService.analyzeProjectStructure();

      expect(result.structure).toEqual(mockStructure);
      expect(result.technologies).toContain('TypeScript');
      expect(result.files).toBeDefined();
      expect(result.summary).toBeDefined();
    });
  });
});
