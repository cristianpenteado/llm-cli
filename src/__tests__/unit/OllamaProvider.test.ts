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

    ollamaProvider = new OllamaProvider(mockConfig);
    // @ts-ignore - Accessing private property for testing
    ollamaProvider['logger'] = mockLogger;
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

      try {
        await ollamaProvider.listModels();
        fail('Expected an error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Falha ao listar modelos');
      }
    });
  });

  describe('generateResponse', () => {
    it('should generate response successfully', async () => {
      jest.setTimeout(10000);
      
      // Mock the stream response
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(JSON.stringify({
            response: 'Test',
            model: 'llama3.2',
            done: false
          })));
          controller.enqueue(new TextEncoder().encode(JSON.stringify({
            response: ' response',
            model: 'llama3.2',
            done: true
          })));
          controller.close();
        }
      });

      // Mock fetch to return a successful response with a stream
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        body: mockStream,
        getReader: () => mockStream.getReader()
      });

      const request = {
        model: 'llama3.2',
        prompt: 'Hello',
        system: 'You are helpful',
        options: { temperature: 0.7 }
      };

      // Mock the callback
      const mockCallback = jest.fn();
      
      // Call the method that uses the stream
      const result = await ollamaProvider.streamResponse(request, mockCallback);

      // Verify the final result
      expect(result.response).toBe('Test response');
      expect(result.model).toBe('llama3.2');
      expect(result.done).toBe(true);
      
      // Verify the callback was called with the chunks
      expect(mockCallback).toHaveBeenCalledWith('Test', false);
      expect(mockCallback).toHaveBeenCalledWith(' response', false);
      
      // Verify the fetch call
      const fetchCall = (fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[0]).toBe('http://localhost:11434/api/generate');
      
      const fetchOptions = fetchCall[1];
      expect(fetchOptions.method).toBe('POST');
      expect(fetchOptions.headers).toEqual({
        'Content-Type': 'application/json'
      });
      
      const requestBody = JSON.parse(fetchOptions.body);
      expect(requestBody.model).toBe('llama3.2');
      expect(requestBody.prompt).toBe('Hello');
      expect(requestBody.system).toBe('You are helpful');
      expect(requestBody.stream).toBe(true);
      expect(requestBody.options).toBeDefined();
      expect(requestBody.keep_alive).toBeDefined();
    });
  });

  describe('isAvailable', () => {
    it('should return true when Ollama is available', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({})
      });

      const result = await ollamaProvider.isAvailable();

      expect(result).toBe(true);
    });

    it('should return false when Ollama is not available', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      const result = await ollamaProvider.isAvailable();

      expect(result).toBe(false);
    });
  });
});
