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
        stream: false
      };

      const response = await this.makeRequest('/api/generate', 'POST', payload);
      
      return {
        response: response.response,
        model: response.model,
        created_at: new Date(response.created_at),
        done: response.done,
        context: response.context,
        total_duration: response.total_duration,
        load_duration: response.load_duration,
        prompt_eval_count: response.prompt_eval_count,
        prompt_eval_duration: response.prompt_eval_duration,
        eval_count: response.eval_count,
        eval_duration: response.eval_duration
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
