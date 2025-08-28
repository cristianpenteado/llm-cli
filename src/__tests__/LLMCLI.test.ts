import { LLMCLI } from '../core/LLMCLI';
import { Logger, LogLevel } from '../utils/Logger';

// Mocks globais para testes
jest.mock('fs-extra', () => ({
  pathExists: jest.fn(),
  readJson: jest.fn(),
  writeJson: jest.fn(),
  ensureDir: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  copy: jest.fn(),
  remove: jest.fn(),
  readdir: jest.fn(),
  stat: jest.fn(),
}));

jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

// Mock do SDK MCP para testes
jest.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    close: jest.fn(),
    callTool: jest.fn(),
    listModels: jest.fn()
  }))
}));

jest.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: jest.fn().mockImplementation(() => ({}))
}));

// Configurar logger para testes
beforeAll(() => {
  Logger.setLevel(LogLevel.ERROR);
  Logger.setColored(false);
});

describe('LLMCLI', () => {
  let cli: LLMCLI;

  beforeEach(() => {
    cli = new LLMCLI();
  });

  describe('constructor', () => {
    it('should create a new LLMCLI instance', () => {
      expect(cli).toBeInstanceOf(LLMCLI);
    });
  });

  describe('setDefaultModel', () => {
    it('should set default model', async () => {
      // Mock das dependências necessárias
      const mockOllamaManager = {
        listModels: jest.fn().mockResolvedValue([
          { name: 'test-model', description: 'Test Model' }
        ])
      };

      // Substituir o ollamaManager mockado
      (cli as any).ollamaManager = mockOllamaManager;

      await expect(cli.setDefaultModel('test-model')).resolves.not.toThrow();
    });

    it('should throw error for non-existent model', async () => {
      const mockOllamaManager = {
        listModels: jest.fn().mockResolvedValue([
          { name: 'other-model', description: 'Other Model' }
        ])
      };

      (cli as any).ollamaManager = mockOllamaManager;

      await expect(cli.setDefaultModel('non-existent-model')).rejects.toThrow();
    });
  });

  describe('listModels', () => {
    it('should list available models', async () => {
      const mockOllamaManager = {
        listModels: jest.fn().mockResolvedValue([
          { name: 'model1', description: 'Model 1', size: '1GB', compatibility: 'Linux' },
          { name: 'model2', description: 'Model 2', size: '2GB', compatibility: 'Linux' }
        ])
      };

      const mockConfigManager = {
        getDefaultModel: jest.fn().mockReturnValue('model1')
      };

      (cli as any).ollamaManager = mockOllamaManager;
      (cli as any).configManager = mockConfigManager;

      await expect(cli.listModels()).resolves.not.toThrow();
    });
  });

  describe('showStatus', () => {
    it('should show warning when no project is active', async () => {
      (cli as any).currentProject = null;
      
      await expect(cli.showStatus()).resolves.not.toThrow();
    });
  });
});
