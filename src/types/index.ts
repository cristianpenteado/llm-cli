// Configurações do projeto
export interface ProjectConfig {
  path: string;
  name: string;
  language: string;
  framework: string;
  model?: string;
  createdAt: Date;
  updatedAt: Date;
  description?: string;
  dependencies?: string[];
  structure?: ProjectStructure;
}

// Estrutura do projeto
export interface ProjectStructure {
  files: ProjectFile[];
  directories: string[];
  language: string;
  framework: string;
  patterns: string[];
}

// Arquivo do projeto
export interface ProjectFile {
  path: string;
  name: string;
  extension: string;
  size: number;
  lastModified: Date;
  language?: string;
}

// Configuração do modelo
export interface ModelConfig {
  name: string;
  description: string;
  size: string;
  compatibility: string;
  parameters: number;
  contextLength: number;
  isLocal: boolean;
  status: 'available' | 'downloading' | 'ready' | 'error';
}

// Informações de hardware
export interface HardwareInfo {
  cpu: CPUInfo;
  memory: MemoryInfo;
  gpu?: GPUInfo;
  storage: StorageInfo;
  os: OSInfo;
}

export interface CPUInfo {
  model: string;
  cores: number;
  threads: number;
  architecture: string;
  frequency: string;
}

export interface MemoryInfo {
  total: number; // GB
  available: number; // GB
  type: string;
}

export interface GPUInfo {
  model: string;
  memory: number; // GB
  driver: string;
}

export interface StorageInfo {
  total: number; // GB
  available: number; // GB
  type: string;
}

export interface OSInfo {
  name: string;
  version: string;
  architecture: string;
}

// Recomendações de modelo
export interface ModelRecommendation {
  name: string;
  description: string;
  score: number;
  reason: string;
  requirements: HardwareRequirements;
}

export interface HardwareRequirements {
  minRAM: number; // GB
  minCPU: number; // cores
  recommendedRAM: number; // GB
  recommendedCPU: number; // cores
  gpuRequired: boolean;
}

// Resposta do modelo LLM
export interface ModelResponse {
  content: string;
  changes: FileChange[];
  suggestions: string[];
  confidence: number;
}

// Mudanças em arquivos
export interface FileChange {
  type: 'create' | 'modify' | 'delete';
  path: string;
  content?: string;
  originalContent?: string;
  description: string;
  timestamp: Date;
}

// Histórico de alterações
export interface ChangeHistory {
  id: string;
  description: string;
  timestamp: Date;
  changes: FileChange[];
  model: string;
  prompt: string;
}

// Estatísticas do projeto
export interface ProjectStats {
  fileCount: number;
  lineCount: number;
  languageDistribution: Record<string, number>;
  frameworkDistribution: Record<string, number>;
  lastActivity: Date;
}

// Configuração MCP
export interface MCPConfig {
  serverUrl: string;
  port: number;
  protocol: 'http' | 'https' | 'ws';
  apiKey?: string;
  timeout: number;
}

// Configuração Ollama
export interface OllamaConfig {
  modelsPath: string;
  serverUrl: string;
  port: number;
  maxMemory: number;
  gpuEnabled: boolean;
}

// Configuração global
export interface GlobalConfig {
  defaultModel?: string;
  hardwareInfo?: HardwareInfo;
  mcpConfig: MCPConfig;
  ollamaConfig: OllamaConfig;
  projects: Record<string, ProjectConfig>;
  theme: 'light' | 'dark' | 'auto';
  language: 'pt-BR' | 'en-US';
}

// Comando de conversa
export interface ChatCommand {
  name: string;
  description: string;
  usage: string;
  examples: string[];
  handler: (args: string[]) => Promise<void>;
}

// Sessão de conversa
export interface ChatSession {
  id: string;
  model: string;
  startTime: Date;
  messages: ChatMessage[];
  context: ProjectContext;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ProjectContext {
  projectPath: string;
  currentFile?: string;
  recentFiles: string[];
  language: string;
  framework: string;
  dependencies: string[];
}

// Resultado de detecção de linguagem
export interface LanguageDetection {
  language: string;
  confidence: number;
  frameworks: string[];
  patterns: string[];
}

// Configuração de teste
export interface TestConfig {
  framework: string;
  runner: string;
  patterns: string[];
  coverage: boolean;
  watch: boolean;
}

// Configuração de linting
export interface LintConfig {
  tool: string;
  rules: Record<string, any>;
  ignore: string[];
  fixOnSave: boolean;
}
