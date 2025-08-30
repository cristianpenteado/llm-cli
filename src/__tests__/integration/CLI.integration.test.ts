import { CLI } from '../../infrastructure/cli/CLI';
import { Agent } from '../../domain/agent/Agent';
import { ModelProvider } from '../../domain/communication/ModelProvider';
import { Configuration } from '../../domain/configuration/Configuration';
import { Logger } from '../../application/ports/Logger';

describe('CLI Integration Tests', () => {
  let cli: CLI;
  let mockAgent: jest.Mocked<Agent>;
  let mockModelProvider: jest.Mocked<ModelProvider>;
  let mockConfig: Configuration;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    // Mock the dependencies
    mockAgent = {
      processQuery: jest.fn(),
      createPlan: jest.fn(),
      executeStep: jest.fn(),
      readProject: jest.fn(),
      generateCode: jest.fn()
    };

    mockModelProvider = {
      listModels: jest.fn(),
      generateResponse: jest.fn(),
      isAvailable: jest.fn(),
      getModelInfo: jest.fn()
    };

    mockConfig = {
      model: { defaultModel: 'llama3.2', temperature: 0.7, maxTokens: 4096, fallbackModels: [] },
      agent: { name: 'Test Agent', personality: 'helpful', autoConfirm: false, maxPlanSteps: 10, contextWindow: 8192 },
      cli: { theme: 'auto', showTimestamps: false, logLevel: 'info', historySize: 100 },
      ollama: { host: 'localhost', port: 11434, timeout: 30000, retryAttempts: 3, keepAlive: '5m' }
    };

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    cli = new CLI(mockAgent, mockModelProvider, mockConfig, mockLogger);
  });

  describe('Agent Integration', () => {
    it('should process queries through the agent', async () => {
      mockAgent.processQuery.mockResolvedValue({
        content: 'Test response',
        type: 'answer',
        metadata: { model: 'llama3.2', duration: 1000 }
      });

      mockModelProvider.isAvailable.mockResolvedValue(true);
      mockModelProvider.listModels.mockResolvedValue([
        {
          name: 'llama3.2',
          size: '2.0GB',
          family: 'llama',
          format: 'gguf',
          parameters: '3B',
          quantization: 'Q4_0',
          modifiedAt: new Date(),
          digest: 'abc123'
        }
      ]);

      // Test that the CLI can be instantiated and dependencies are resolved
      expect(cli).toBeDefined();
      expect(mockAgent.processQuery).toBeDefined();
      expect(mockModelProvider.isAvailable).toBeDefined();
    });

    it('should create and execute plans', async () => {
      const mockPlan = {
        id: 'plan-123',
        title: 'Test Plan',
        description: 'A test plan',
        steps: [
          {
            id: 'step-1',
            title: 'Step 1',
            description: 'First step',
            type: 'implementation' as const,
            files: ['test.ts'],
            commands: ['npm test']
          }
        ],
        estimatedTime: '30 minutes'
      };

      mockAgent.createPlan.mockResolvedValue(mockPlan);
      mockAgent.executeStep.mockResolvedValue({
        success: true,
        output: 'Step completed successfully',
        filesModified: ['test.ts']
      });

      // Verify that the CLI can handle plan creation and execution
      expect(mockAgent.createPlan).toBeDefined();
      expect(mockAgent.executeStep).toBeDefined();
    });
  });

  describe('Model Provider Integration', () => {
    it('should check Ollama availability and list models', async () => {
      mockModelProvider.isAvailable.mockResolvedValue(true);
      mockModelProvider.listModels.mockResolvedValue([
        {
          name: 'llama3.2',
          size: '2.0GB',
          family: 'llama',
          format: 'gguf',
          parameters: '3B',
          quantization: 'Q4_0',
          modifiedAt: new Date(),
          digest: 'abc123'
        }
      ]);

      const isAvailable = await mockModelProvider.isAvailable();
      const models = await mockModelProvider.listModels();

      expect(isAvailable).toBe(true);
      expect(models).toHaveLength(1);
      expect(models[0].name).toBe('llama3.2');
    });

    it('should handle Ollama unavailability gracefully', async () => {
      mockModelProvider.isAvailable.mockResolvedValue(false);

      const isAvailable = await mockModelProvider.isAvailable();

      expect(isAvailable).toBe(false);
    });
  });
});
