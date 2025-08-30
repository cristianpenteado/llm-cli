import { OllamaProvider } from '../../infrastructure/ollama/OllamaProvider';
import { OllamaConfiguration } from '../../domain/configuration/Configuration';
import { Logger } from '../../application/ports/Logger';

// Mock fetch globally
global.fetch = jest.fn();

describe('OllamaProvider', () => {
  let ollamaProvider: OllamaProvider;
  let mockLogger: jest.Mocked<Logger>;
  let mockConfig: OllamaConfiguration;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    mockConfig = {
      host: 'localhost',
      port: 11434,
      timeout: 30000,
      retryAttempts: 3,
      keepAlive: '5m'
    };

    ollamaProvider = new OllamaProvider(mockConfig, mockLogger);
    jest.clearAllMocks();
  });

  describe('listModels', () => {
    it('should list models successfully', async () => {
      const mockResponse = {
        models: [
          {
            name: 'llama3.2',
            size: '2.0GB',
            digest: 'abc123',
            modified_at: '2024-01-01T00:00:00Z',
            details: {
              family: 'llama',
              format: 'gguf',
              parameter_size: '3B',
              quantization_level: 'Q4_0'
            }
          }
        ]
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await ollamaProvider.listModels();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('llama3.2');
      expect(result[0].family).toBe('llama');
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/tags',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should handle API errors', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(ollamaProvider.listModels()).rejects.toThrow('Falha ao listar modelos');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('generateResponse', () => {
    it('should generate response successfully', async () => {
      const mockResponse = {
        response: 'Test response',
        model: 'llama3.2',
        created_at: '2024-01-01T00:00:00Z',
        done: true,
        context: [1, 2, 3],
        total_duration: 1000000,
        eval_count: 10
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const request = {
        model: 'llama3.2',
        prompt: 'Hello',
        system: 'You are helpful',
        options: { temperature: 0.7 }
      };

      const result = await ollamaProvider.generateResponse(request);

      expect(result.response).toBe('Test response');
      expect(result.model).toBe('llama3.2');
      expect(result.done).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/generate',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            model: 'llama3.2',
            prompt: 'Hello',
            system: 'You are helpful',
            options: { temperature: 0.7 },
            stream: false
          })
        })
      );
    });
  });

  describe('isAvailable', () => {
    it('should return true when Ollama is available', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ models: [] })
      });

      const result = await ollamaProvider.isAvailable();

      expect(result).toBe(true);
    });

    it('should return false when Ollama is not available', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Connection refused'));

      const result = await ollamaProvider.isAvailable();

      expect(result).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith('Ollama not available', expect.any(Object));
    });
  });
});
