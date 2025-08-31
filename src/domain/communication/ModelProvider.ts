export type StreamCallback = (chunk: string, done: boolean) => void;

export interface ModelProvider {
  listModels(): Promise<ModelInfo[]>;
  generateResponse(request: GenerationRequest): Promise<GenerationResponse>;
  streamResponse(request: GenerationRequest, callback: StreamCallback, signal?: AbortSignal): Promise<GenerationResponse>;
  isAvailable(): Promise<boolean>;
  getModelInfo(modelName: string): Promise<ModelInfo>;
}

export interface ModelInfo {
  name: string;
  size: string;
  family: string;
  format: string;
  parameters: string;
  quantization: string;
  modifiedAt: Date;
  digest: string;
}

export interface GenerationRequest {
  model: string;
  prompt: string;
  system?: string;
  context?: string[];
  options?: GenerationOptions;
  stream?: boolean;
}

export interface GenerationOptions {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  num_predict?: number;
  repeat_penalty?: number;
  seed?: number;
}

export interface GenerationResponse {
  response: string;
  model: string;
  created_at: Date;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface StreamChunk {
  response: string;
  done: boolean;
}
