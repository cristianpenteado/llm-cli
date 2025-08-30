export interface Configuration {
  model: ModelConfiguration;
  agent: AgentConfiguration;
  cli: CLIConfiguration;
  ollama: OllamaConfiguration;
}

export interface ModelConfiguration {
  defaultModel: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
  fallbackModels: string[];
}

export interface AgentConfiguration {
  name: string;
  personality: 'helpful' | 'concise' | 'detailed' | 'creative';
  autoConfirm: boolean;
  maxPlanSteps: number;
  contextWindow: number;
}

export interface CLIConfiguration {
  theme: 'dark' | 'light' | 'auto';
  showTimestamps: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  historySize: number;
}

export interface OllamaConfiguration {
  host: string;
  port: number;
  timeout: number;
  retryAttempts: number;
  keepAlive: string;
}

export interface ConfigurationRepository {
  load(): Promise<Configuration>;
  save(config: Configuration): Promise<void>;
  getDefault(): Configuration;
  validate(config: Partial<Configuration>): ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
