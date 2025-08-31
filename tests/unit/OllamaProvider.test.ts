import { OllamaProvider } from '../../src/infrastructure/ollama/OllamaProvider';
import { OllamaConfiguration } from '../../src/domain/configuration/Configuration';
import { GenerationRequest, GenerationResponse } from '../../src/domain/communication/ModelProvider';

// Mock fetch globalmente
global.fetch = jest.fn();

describe('OllamaProvider', () => {
  let ollamaProvider: OllamaProvider;
  let mockConfig: OllamaConfiguration;

  beforeEach(() => {
    mockConfig = {
      host: 'localhost',
      port: 11434,
      timeout: 30000,
      retryAttempts: 2,
      keepAlive: '5m'
    };

    ollamaProvider = new OllamaProvider(mockConfig);
    jest.clearAllMocks();
  });

  describe('generateResponse', () => {
    it('should generate response successfully', async () => {
      const mockResponse = {
        response: 'Hello! How can I help you?',
        model: 'phi3:mini',
        done: true
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const request: GenerationRequest = {
        model: 'phi3:mini',
        prompt: 'oi',
        system: 'You are a helpful assistant',
        options: {
          temperature: 0.3,
          num_predict: 2048
        }
      };

      const result = await ollamaProvider.generateResponse(request);

      expect(result.response).toBe('Hello! How can I help you?');
      expect(result.model).toBe('phi3:mini');
      expect(result.done).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/generate',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('phi3:mini'),
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    it('should handle HTTP errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const request: GenerationRequest = {
        model: 'phi3:mini',
        prompt: 'oi',
        system: 'You are a helpful assistant',
        options: {
          temperature: 0.3,
          num_predict: 2048
        }
      };

      await expect(ollamaProvider.generateResponse(request)).rejects.toThrow(
        'HTTP 500: Internal Server Error'
      );
    });

    it('should handle network errors', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const request: GenerationRequest = {
        model: 'phi3:mini',
        prompt: 'oi',
        system: 'You are a helpful assistant',
        options: {
          temperature: 0.3,
          num_predict: 2048
        }
      };

      await expect(ollamaProvider.generateResponse(request)).rejects.toThrow(
        'Falha ao gerar resposta: Error: Network error'
      );
    });
  });

  describe('streamResponse', () => {
    it('should stream response successfully', async () => {
      const mockChunks = [
        '{"response": "Hello", "done": false}',
        '{"response": "! How", "done": false}',
        '{"response": " can I", "done": false}',
        '{"response": " help?", "done": true}'
      ];

      const mockReadableStream = new ReadableStream({
        start(controller) {
          mockChunks.forEach((chunk, index) => {
            setTimeout(() => {
              controller.enqueue(new TextEncoder().encode(chunk + '\n'));
              if (index === mockChunks.length - 1) {
                controller.close();
              }
            }, index * 10);
          });
        }
      });

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        body: mockReadableStream
      });

      const request: GenerationRequest = {
        model: 'phi3:mini',
        prompt: 'oi',
        system: 'You are a helpful assistant',
        options: {
          temperature: 0.3,
          num_predict: 2048
        }
      };

      const chunks: string[] = [];
      let done = false;

      const callback = (chunk: string, isDone: boolean) => {
        if (chunk) chunks.push(chunk);
        if (isDone) done = true;
      };

      const result = await ollamaProvider.streamResponse(request, callback);

      expect(chunks).toEqual(['Hello', '! How', ' can I', ' help?']);
      expect(done).toBe(true);
      expect(result.response).toBe('Hello! How can I help?');
      expect(result.done).toBe(true);
    });
  });

  describe('listModels', () => {
    it('should list models successfully', async () => {
      const mockModels = {
        models: [
          {
            name: 'phi3:mini',
            size: 2176178913,
            modified_at: '2025-08-28T09:13:04.077135904-03:00',
            digest: 'abc123',
            details: {
              family: 'phi3',
              format: 'gguf',
              parameter_size: '3.8B',
              quantization_level: 'Q4_0'
            }
          }
        ]
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockModels
      });

      const result = await ollamaProvider.listModels();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('phi3:mini');
      expect(result[0].family).toBe('phi3');
      expect(result[0].parameters).toBe('3.8B');
    });
  });

  describe('isAvailable', () => {
    it('should return true when Ollama is available', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [] })
      });

      const result = await ollamaProvider.isAvailable();

      expect(result).toBe(true);
    });

    it('should return false when Ollama is not available', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Connection refused'));

      const result = await ollamaProvider.isAvailable();

      expect(result).toBe(false);
    });
  });
});
