import { ModelProvider, ModelInfo, GenerationRequest, GenerationResponse } from '../../domain/communication/ModelProvider';
import { OllamaConfiguration } from '../../domain/configuration/Configuration';

export class OllamaProvider implements ModelProvider {
  private baseUrl: string;
  private activeSessions: Map<string, any> = new Map();

  constructor(
    private config: OllamaConfiguration
  ) {
    this.baseUrl = `http://${config.host}:${config.port}`;
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await this.makeRequest('/api/tags', 'GET');
      return response.models.map((model: any) => ({
        name: model.name,
        size: model.size,
        family: model.details?.family || 'unknown',
        format: model.details?.format || 'unknown',
        parameters: model.details?.parameter_size || 'unknown',
        quantization: model.details?.quantization_level || 'unknown',
        modifiedAt: new Date(model.modified_at),
        digest: model.digest
      }));
    } catch (error) {
      throw new Error(`Falha ao listar modelos: ${error}`);
    }
  }

  async generateResponse(request: GenerationRequest): Promise<GenerationResponse> {
    let fullResponse = '';
    
    return new Promise((resolve, reject) => {
      this.streamResponse(request, (chunk, done) => {
        if (chunk) {
          fullResponse += chunk;
        }
        
        if (done) {
          // Na implementação sem streaming, apenas coletamos a resposta completa
          // e retornamos no final
          resolve({
            response: fullResponse,
            model: request.model,
            created_at: new Date(),
            done: true
          });
        }
      }).catch(reject);
    });
  }

  async streamResponse(request: GenerationRequest, callback: (chunk: string, done: boolean) => void, signal?: AbortSignal): Promise<GenerationResponse> {
    try {
      const payload = {
        model: request.model,
        prompt: request.prompt,
        system: request.system,
        context: request.context,
        options: {
          ...request.options,
          num_predict: 2048,
          temperature: 0.3,
          top_p: 0.9,
          repeat_penalty: 1.1
        },
        keep_alive: '10m',
        stream: true
      };

      const url = `${this.baseUrl}/api/generate`;
      const controller = new AbortController();
      
      // Set up abort handling if signal is provided
      if (signal) {
        signal.addEventListener('abort', () => controller.abort());
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        
        if (value) {
          const chunk = decoder.decode(value, { stream: !done });
          const lines = chunk.split('\n').filter(line => line.trim() !== '');
          
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.response) {
                callback(parsed.response, false);
                fullResponse += parsed.response;
              }
            } catch (e) {
              console.error('Erro ao processar chunk:', e);
            }
          }
        }
      }

      // Retorna a resposta completa quando terminar
      return {
        response: fullResponse,
        model: request.model,
        created_at: new Date(),
        done: true
      };

    } catch (error) {
      throw new Error(`Falha ao gerar resposta: ${error}`);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.makeRequest('/api/tags', 'GET');
      return true;
    } catch (error) {
      return false;
    }
  }

  async getModelInfo(modelName: string): Promise<ModelInfo> {
    try {
      const response = await this.makeRequest(`/api/show`, 'POST', { name: modelName });
      
      return {
        name: response.name || modelName,
        size: response.size || 'unknown',
        family: response.details?.family || 'unknown',
        format: response.details?.format || 'unknown',
        parameters: response.details?.parameter_size || 'unknown',
        quantization: response.details?.quantization_level || 'unknown',
        modifiedAt: new Date(response.modified_at || Date.now()),
        digest: response.digest || 'unknown'
      };
    } catch (error) {
      throw new Error(`Falha ao obter informações do modelo: ${error}`);
    }
  }

  private async makeRequest(endpoint: string, method: 'GET' | 'POST', body?: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
        
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.config.retryAttempts) {
          await this.delay(1000 * attempt);
        } else {
          throw error;
        }
      }
    }
    
    throw lastError || new Error('Request failed after all retry attempts');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
