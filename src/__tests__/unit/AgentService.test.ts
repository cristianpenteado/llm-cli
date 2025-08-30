import { AgentService } from '../../application/services/AgentService';
import { ModelProvider, GenerationResponse } from '../../domain/communication/ModelProvider';
import { FileSystemService } from '../../application/ports/FileSystemService';
import { Configuration } from '../../domain/configuration/Configuration';
import { Logger } from '../../application/ports/Logger';

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
        defaultModel: 'llama3.2',
        temperature: 0.7,
        maxTokens: 4096,
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

    agentService = new AgentService(mockModelProvider, mockFileSystem, mockConfig, mockLogger);
  });

  describe('processQuery', () => {
    it('should process a simple query successfully', async () => {
      const mockResponse: GenerationResponse = {
        response: 'Esta é uma resposta de teste',
        model: 'llama3.2',
        created_at: new Date(),
        done: true,
        total_duration: 1000000
      };

      mockModelProvider.generateResponse.mockResolvedValue(mockResponse);

      const result = await agentService.processQuery('Como criar um arquivo?');

      expect(result.content).toBe('Esta é uma resposta de teste');
      expect(result.type).toBe('answer');
      expect(result.metadata?.model).toBe('llama3.2');
      expect(mockModelProvider.generateResponse).toHaveBeenCalledWith({
        model: 'llama3.2',
        prompt: 'Como criar um arquivo?',
        system: expect.stringContaining('Test Agent'),
        options: {
          temperature: 0.7,
          num_predict: 4096
        }
      });
    });

    it('should handle errors gracefully', async () => {
      mockModelProvider.generateResponse.mockRejectedValue(new Error('Connection failed'));

      const result = await agentService.processQuery('test query');

      expect(result.type).toBe('error');
      expect(result.content).toContain('Erro ao processar consulta');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('createPlan', () => {
    it('should create a valid plan from model response', async () => {
      const mockPlanResponse = {
        title: 'Criar API REST',
        description: 'Implementar uma API REST completa',
        steps: [
          {
            id: 'step-1',
            title: 'Setup inicial',
            description: 'Configurar projeto',
            type: 'implementation',
            files: ['package.json'],
            commands: ['npm init']
          }
        ],
        estimatedTime: '2 horas'
      };

      mockModelProvider.generateResponse.mockResolvedValue({
        response: JSON.stringify(mockPlanResponse),
        model: 'llama3.2',
        created_at: new Date(),
        done: true
      });

      const result = await agentService.createPlan('Criar uma API REST');

      expect(result.title).toBe('Criar API REST');
      expect(result.steps).toHaveLength(1);
      expect(result.steps[0].title).toBe('Setup inicial');
      expect(result.id).toMatch(/^plan-\d+$/);
    });

    it('should handle invalid JSON response', async () => {
      mockModelProvider.generateResponse.mockResolvedValue({
        response: 'invalid json response',
        model: 'llama3.2',
        created_at: new Date(),
        done: true
      });

      await expect(agentService.createPlan('test task')).rejects.toThrow('Falha ao criar plano');
    });
  });

  describe('readProject', () => {
    it('should read project structure successfully', async () => {
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

      const mockPackageJson = {
        name: 'test-project',
        description: 'A test project',
        dependencies: {
          'express': '^4.18.0'
        }
      };

      mockFileSystem.readDirectory.mockResolvedValue(mockStructure);
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readFile.mockResolvedValue(JSON.stringify(mockPackageJson));

      const result = await agentService.readProject('/project');

      expect(result.structure).toEqual(mockStructure);
      expect(result.technologies).toContain('TypeScript');
      expect(result.dependencies).toEqual(mockPackageJson.dependencies);
      expect(result.description).toBe('A test project');
    });
  });
});
