import { ModelProvider, ModelInfo, GenerationRequest, GenerationResponse } from '../../domain/communication/ModelProvider';
import { OllamaConfiguration } from '../../domain/configuration/Configuration';
import { Logger } from '../../application/ports/Logger';

export class OllamaProvider implements ModelProvider {
  private baseUrl: string;

  constructor(
    private config: OllamaConfiguration,
    private logger: Logger
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
      this.logger.error('Failed to list models', { error });
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
        options: request.options,
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
      this.logger.error('Failed to generate response', { error, model: request.model });
      throw new Error(`Falha ao gerar resposta: ${error}`);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.makeRequest('/api/tags', 'GET');
      return true;
    } catch (error) {
      this.logger.debug('Ollama not available', { error });
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
      this.logger.error('Failed to get model info', { error, modelName });
      throw new Error(`Falha ao obter informações do modelo: ${error}`);
    }
  }

  private async makeRequest(endpoint: string, method: 'GET' | 'POST', body?: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(this.config.timeout)
    };

    if (body && method === 'POST') {
      options.body = JSON.stringify(body);
    }

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, options);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        lastError = error as Error;
        this.logger.debug(`Request attempt ${attempt} failed`, { error, url });
        
        if (attempt < this.config.retryAttempts) {
          await this.delay(1000 * attempt); // Exponential backoff
        }
      }
    }
    
    throw lastError || new Error('Request failed after all retry attempts');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
