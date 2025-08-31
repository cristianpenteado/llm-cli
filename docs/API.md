# API Reference - LLM-CLI

## 📋 Visão Geral

Este documento descreve todas as interfaces, classes e tipos disponíveis no LLM-CLI, organizados por domínio e camada.

## 🏗️ Domain Layer

### Agent Domain

#### **Agent Interface**
```typescript
interface Agent {
  processQuery(query: string, onChunk?: ChunkCallback, signal?: AbortSignal): Promise<AgentResponse>;
  createPlan(task: string): Promise<TaskPlan>;
  executeStep(step: TaskStep, confirmation: boolean): Promise<StepResult>;
  readProject(path?: string): Promise<ProjectContext>;
  generateCode(specification: CodeSpecification): Promise<CodeResult>;
  analyzeProjectStructure(path?: string): Promise<ProjectAnalysis>;
}
```

**Responsabilidade**: Define o contrato principal para o agente de IA.

**Métodos**:
- `processQuery()`: Processa consultas do usuário
- `createPlan()`: Cria planos de execução
- `executeStep()`: Executa passos específicos
- `readProject()`: Lê e analisa projetos
- `generateCode()`: Gera código baseado em especificações
- `analyzeProjectStructure()`: Analisa estrutura de projetos

#### **AgentResponse Interface**
```typescript
interface AgentResponse {
  content: string;
  type?: 'code' | 'text' | 'markdown' | 'json' | 'casual' | 'technical' | 'plan' | 'analysis' | 'error';
}
```

**Propriedades**:
- `content`: Conteúdo da resposta
- `type`: Tipo da resposta (opcional)

#### **TaskPlan Interface**
```typescript
interface TaskPlan {
  id: string;
  title: string;
  description: string;
  estimatedTime?: string;
  steps: TaskStep[];
}
```

**Propriedades**:
- `id`: Identificador único do plano
- `title`: Título do plano
- `description`: Descrição detalhada
- `estimatedTime`: Tempo estimado (opcional)
- `steps`: Lista de passos para execução

#### **TaskStep Interface**
```typescript
interface TaskStep {
  id: string;
  title: string;
  command?: string;
  description?: string;
  type?: string;
  dependencies?: string[];
}
```

**Propriedades**:
- `id`: Identificador único do passo
- `title`: Título do passo
- `command`: Comando a ser executado (opcional)
- `description`: Descrição do passo (opcional)
- `type`: Tipo do passo (opcional)
- `dependencies`: IDs dos passos dependentes (opcional)

#### **StepResult Interface**
```typescript
interface StepResult {
  success: boolean;
  message?: string;
  filesModified?: string[];
}
```

**Propriedades**:
- `success`: Indica se o passo foi executado com sucesso
- `message`: Mensagem de resultado (opcional)
- `filesModified`: Lista de arquivos modificados (opcional)

#### **ProjectContext Interface**
```typescript
interface ProjectContext {
  structure: FileNode[];
  technologies: string[];
  dependencies: { [key: string]: string };
  description: string;
}
```

**Propriedades**:
- `structure`: Estrutura de arquivos do projeto
- `technologies`: Tecnologias detectadas
- `dependencies`: Dependências do projeto
- `description`: Descrição do projeto

#### **ProjectAnalysis Interface**
```typescript
interface ProjectAnalysis {
  files: string[];
  dependencies: { [key: string]: string };
  structure: { [key: string]: any };
  technologies: string[];
  entryPoints: string[];
  designPatterns: string[];
  summary?: string;
}
```

**Propriedades**:
- `files`: Lista de arquivos do projeto
- `dependencies`: Dependências detectadas
- `structure`: Estrutura hierárquica
- `technologies`: Tecnologias identificadas
- `entryPoints`: Pontos de entrada do projeto
- `designPatterns`: Padrões de design detectados
- `summary`: Resumo da análise (opcional)

#### **CodeSpecification Interface**
```typescript
interface CodeSpecification {
  type: string;
  language: string;
  description: string;
  requirements: string[];
  tests?: boolean;
}
```

**Propriedades**:
- `type`: Tipo de código a ser gerado
- `language`: Linguagem de programação
- `description`: Descrição do código
- `requirements`: Requisitos específicos
- `tests`: Se deve incluir testes (opcional)

#### **CodeResult Interface**
```typescript
interface CodeResult {
  code: string;
  files?: Array<{
    path: string;
    content: string;
    type: string;
  }>;
  message?: string;
}
```

**Propriedades**:
- `code`: Código gerado
- `files`: Arquivos criados (opcional)
- `message`: Mensagem de resultado (opcional)

#### **FileNode Interface**
```typescript
interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileNode[];
}
```

**Propriedades**:
- `name`: Nome do arquivo/diretório
- `path`: Caminho completo
- `type`: Tipo (arquivo ou diretório)
- `size`: Tamanho em bytes (apenas para arquivos)
- `children`: Subarquivos/subdiretórios (apenas para diretórios)

### Communication Domain

#### **ModelProvider Interface**
```typescript
interface ModelProvider {
  listModels(): Promise<ModelInfo[]>;
  generateResponse(request: GenerationRequest): Promise<GenerationResponse>;
  streamResponse(request: GenerationRequest, onChunk: ChunkCallback, signal?: AbortSignal): Promise<void>;
  isAvailable(): Promise<boolean>;
  getModelInfo(modelName: string): Promise<ModelInfo>;
}
```

**Responsabilidade**: Define o contrato para provedores de modelos de IA.

**Métodos**:
- `listModels()`: Lista modelos disponíveis
- `generateResponse()`: Gera resposta completa
- `streamResponse()`: Gera resposta em streaming
- `isAvailable()`: Verifica disponibilidade
- `getModelInfo()`: Obtém informações de um modelo

#### **ModelInfo Interface**
```typescript
interface ModelInfo {
  name: string;
  size: string;
  family: string;
  format: string;
  parameters: string;
  quantization: string;
  modifiedAt: Date;
  digest: string;
}
```

**Propriedades**:
- `name`: Nome do modelo
- `size`: Tamanho do modelo
- `family`: Família do modelo
- `format`: Formato do arquivo
- `parameters`: Número de parâmetros
- `quantization`: Tipo de quantização
- `modifiedAt`: Data de modificação
- `digest`: Hash de verificação

#### **GenerationRequest Interface**
```typescript
interface GenerationRequest {
  model: string;
  prompt: string;
  system?: string;
  options?: {
    temperature?: number;
    num_predict?: number;
    [key: string]: any;
  };
}
```

**Propriedades**:
- `model`: Nome do modelo a ser usado
- `prompt`: Prompt principal
- `system`: Prompt do sistema (opcional)
- `options`: Opções de geração (opcional)

#### **GenerationResponse Interface**
```typescript
interface GenerationResponse {
  response: string;
  model: string;
  created_at: Date;
  done: boolean;
  total_duration?: number;
}
```

**Propriedades**:
- `response`: Resposta gerada
- `model`: Modelo usado
- `created_at`: Timestamp de criação
- `done`: Se a geração foi concluída
- `total_duration`: Duração total (opcional)

#### **ChunkCallback Type**
```typescript
type ChunkCallback = (chunk: string) => void;
```

**Responsabilidade**: Callback para processar chunks de streaming.

### Configuration Domain

#### **Configuration Interface**
```typescript
interface Configuration {
  model: ModelConfiguration;
  agent: AgentConfiguration;
  cli: CLIConfiguration;
  ollama: OllamaConfiguration;
}
```

**Propriedades**:
- `model`: Configurações do modelo
- `agent`: Configurações do agente
- `cli`: Configurações da CLI
- `ollama`: Configurações do Ollama

#### **ModelConfiguration Interface**
```typescript
interface ModelConfiguration {
  defaultModel: string;
  temperature: number;
  maxTokens: number;
  fallbackModels: string[];
}
```

**Propriedades**:
- `defaultModel`: Modelo padrão
- `temperature`: Temperatura de geração
- `maxTokens`: Máximo de tokens
- `fallbackModels`: Modelos de fallback

#### **AgentConfiguration Interface**
```typescript
interface AgentConfiguration {
  name: string;
  personality: 'helpful' | 'concise' | 'detailed' | 'creative';
  autoConfirm: boolean;
  maxPlanSteps: number;
  contextWindow: number;
}
```

**Propriedades**:
- `name`: Nome do agente
- `personality`: Personalidade configurada
- `autoConfirm`: Confirmação automática
- `maxPlanSteps`: Máximo de passos no plano
- `contextWindow`: Tamanho da janela de contexto

#### **CLIConfiguration Interface**
```typescript
interface CLIConfiguration {
  theme: 'dark' | 'light' | 'auto';
  showTimestamps: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  historySize: number;
}
```

**Propriedades**:
- `theme`: Tema da interface
- `showTimestamps`: Mostrar timestamps
- `logLevel`: Nível de log
- `historySize`: Tamanho do histórico

#### **OllamaConfiguration Interface**
```typescript
interface OllamaConfiguration {
  host: string;
  port: number;
  timeout: number;
  retryAttempts: number;
  keepAlive: string;
}
```

**Propriedades**:
- `host`: Host do servidor Ollama
- `port`: Porta do servidor Ollama
- `timeout`: Timeout em milissegundos
- `retryAttempts`: Tentativas de retry
- `keepAlive`: Configuração de keep-alive

### Search Domain

#### **WebSearch Interface**
```typescript
interface WebSearch {
  search(query: string): Promise<SearchResult[]>;
}
```

**Responsabilidade**: Define o contrato para busca na web.

**Métodos**:
- `search()`: Executa busca na web

#### **SearchResult Interface**
```typescript
interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}
```

**Propriedades**:
- `title`: Título do resultado
- `url`: URL do resultado
- `snippet`: Resumo do conteúdo
- `source`: Fonte da busca

### Logger Domain

#### **Logger Interface**
```typescript
interface Logger {
  debug(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
}
```

**Responsabilidade**: Define o contrato para sistema de logs.

**Métodos**:
- `debug()`: Log de debug
- `info()`: Log de informação
- `warn()`: Log de aviso
- `error()`: Log de erro

## 🔧 Application Layer

### Ports (Interfaces)

#### **FileSystemService Interface**
```typescript
interface FileSystemService {
  exists(filePath: string): Promise<boolean>;
  readFile(filePath: string): Promise<string>;
  writeFile(filePath: string, content: string): Promise<void>;
  readDirectory(dirPath: string, recursive?: boolean): Promise<FileNode[]>;
  createDirectory(dirPath: string): Promise<void>;
  deleteFile(filePath: string): Promise<void>;
  deleteDirectory(dirPath: string): Promise<void>;
  getStats(filePath: string): Promise<FileStats>;
}
```

**Responsabilidade**: Define operações de sistema de arquivos.

**Métodos**:
- `exists()`: Verifica se arquivo/diretório existe
- `readFile()`: Lê conteúdo de arquivo
- `writeFile()`: Escreve conteúdo em arquivo
- `readDirectory()`: Lê estrutura de diretório
- `createDirectory()`: Cria diretório
- `deleteFile()`: Remove arquivo
- `deleteDirectory()`: Remove diretório
- `getStats()`: Obtém estatísticas de arquivo

#### **FileStats Interface**
```typescript
interface FileStats {
  size: number;
  isFile: boolean;
  isDirectory: boolean;
  modifiedAt: Date;
  createdAt: Date;
}
```

**Propriedades**:
- `size`: Tamanho em bytes
- `isFile`: Se é arquivo
- `isDirectory`: Se é diretório
- `modifiedAt`: Data de modificação
- `createdAt`: Data de criação

### Services

#### **AgentService Class**
```typescript
class AgentService implements Agent {
  constructor(
    modelProvider: ModelProvider,
    fileSystem: FileSystemService,
    config: Configuration
  );

  // Implementa interface Agent
  async processQuery(query: string, onChunk?: ChunkCallback, signal?: AbortSignal): Promise<AgentResponse>;
  async createPlan(task: string): Promise<TaskPlan>;
  async executeStep(step: TaskStep, confirmation: boolean): Promise<StepResult>;
  async readProject(path?: string): Promise<ProjectContext>;
  async generateCode(specification: CodeSpecification): Promise<CodeResult>;
  async analyzeProjectStructure(path?: string): Promise<ProjectAnalysis>;
}
```

**Responsabilidade**: Implementa a lógica de negócio do agente.

**Dependências**:
- `modelProvider`: Provedor de modelos
- `fileSystem`: Serviço de arquivos
- `config`: Configuração do sistema

#### **WebSearchService Class**
```typescript
class WebSearchService implements WebSearch {
  constructor(searchProvider: WebSearch);

  async search(query: string): Promise<SearchResult[]>;
}
```

**Responsabilidade**: Implementa busca na web.

**Dependências**:
- `searchProvider`: Provedor de busca

## 🏗️ Infrastructure Layer

### CLI

#### **CLI Class**
```typescript
class CLI {
  constructor(
    agent: Agent,
    logger: Logger,
    conversationContext: ConversationContext
  );

  async run(selectedModel: string): Promise<void>;
  async handleInput(input: string): Promise<void>;
  private async createPlan(input: string): Promise<void>;
  private async executePlan(): Promise<void>;
  private async askForConfirmation(prompt: string): Promise<boolean>;
}
```

**Responsabilidade**: Interface conversacional com usuário.

**Dependências**:
- `agent`: Agente de IA
- `logger`: Sistema de logs
- `conversationContext`: Contexto de conversa

### Ollama Integration

#### **OllamaProvider Class**
```typescript
class OllamaProvider implements ModelProvider {
  constructor(config: OllamaConfiguration);

  async listModels(): Promise<ModelInfo[]>;
  async generateResponse(request: GenerationRequest): Promise<GenerationResponse>;
  async streamResponse(request: GenerationRequest, onChunk: ChunkCallback, signal?: AbortSignal): Promise<void>;
  async isAvailable(): Promise<boolean>;
  async getModelInfo(modelName: string): Promise<ModelInfo>;
}
```

**Responsabilidade**: Integração com Ollama via REST API.

**Dependências**:
- `config`: Configuração do Ollama

### File System

#### **NodeFileSystemService Class**
```typescript
class NodeFileSystemService implements FileSystemService {
  async exists(filePath: string): Promise<boolean>;
  async readFile(filePath: string): Promise<string>;
  async writeFile(filePath: string, content: string): Promise<void>;
  async readDirectory(dirPath: string, recursive?: boolean): Promise<FileNode[]>;
  async createDirectory(dirPath: string): Promise<void>;
  async deleteFile(filePath: string): Promise<void>;
  async deleteDirectory(dirPath: string): Promise<void>;
  async getStats(filePath: string): Promise<FileStats>;
}
```

**Responsabilidade**: Implementação Node.js do sistema de arquivos.

### Logging

#### **ConsoleLogger Class**
```typescript
class ConsoleLogger implements Logger {
  constructor(logLevel: string);

  debug(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
}
```

**Responsabilidade**: Logger para console.

**Dependências**:
- `logLevel`: Nível de log configurado

### Configuration

#### **FileConfigurationRepository Class**
```typescript
class FileConfigurationRepository implements ConfigurationRepository {
  async load(): Promise<Configuration>;
  async save(config: Configuration): Promise<void>;
  private getConfigPath(): string;
  private createDefaultConfig(): Configuration;
}
```

**Responsabilidade**: Gerenciamento de configuração em arquivo.

### Search

#### **DuckDuckGoProvider Class**
```typescript
class DuckDuckGoProvider implements WebSearch {
  async search(query: string): Promise<SearchResult[]>;
  private buildSearchUrl(query: string): string;
  private parseSearchResults(html: string): SearchResult[];
}
```

**Responsabilidade**: Provedor de busca DuckDuckGo.

### Dependency Injection

#### **Container Class**
```typescript
class Container {
  private instances: Map<string, any>;
  private config: Configuration | null;

  async resolve<T>(key: string): Promise<T>;
  private async createInstance(key: string): Promise<any>;
  public get<T>(name: string): T;
  public createCLI(): CLI;
}
```

**Responsabilidade**: Container de injeção de dependência.

**Métodos**:
- `resolve()`: Resolve dependência assincronamente
- `createInstance()`: Cria instância de dependência
- `get()`: Obtém instância existente
- `createCLI()`: Cria instância da CLI

## 🔄 Tipos Compartilhados

### **ConversationContext Class**
```typescript
class ConversationContext {
  private messages: Message[];
  private maxHistory: number;

  constructor(maxHistory?: number);
  
  addMessage(role: 'user' | 'assistant' | 'system', content: string): void;
  getConversationHistory(): Message[];
  getFormattedHistory(): string;
  clear(): void;
}
```

**Responsabilidade**: Gerenciamento de contexto de conversa.

### **Message Interface**
```typescript
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}
```

**Propriedades**:
- `role`: Papel na conversa
- `content`: Conteúdo da mensagem
- `timestamp`: Timestamp da mensagem

## 📝 Exemplos de Uso

### **Criando uma Instância da CLI**
```typescript
import { Container } from './infrastructure/di/Container';

const container = new Container();
const cli = await container.resolve<CLI>('CLI');
await cli.run('llama3.2');
```

### **Implementando um Novo Provedor de Modelo**
```typescript
class CustomModelProvider implements ModelProvider {
  async listModels(): Promise<ModelInfo[]> {
    // Implementação personalizada
  }
  
  async generateResponse(request: GenerationRequest): Promise<GenerationResponse> {
    // Implementação personalizada
  }
  
  // ... outros métodos
}
```

### **Criando um Novo Serviço de Busca**
```typescript
class CustomSearchProvider implements WebSearch {
  async search(query: string): Promise<SearchResult[]> {
    // Implementação personalizada
  }
}
```

## 🔍 Padrões de Design

### **Domain-Driven Design (DDD)**
- **Domain**: Regras de negócio centrais
- **Application**: Casos de uso e serviços
- **Infrastructure**: Implementações técnicas

### **Dependency Inversion Principle**
- Interfaces definem contratos
- Implementações dependem de abstrações
- Container gerencia dependências

### **Clean Architecture**
- Dependências apontam para dentro
- Domínio no centro
- Camadas bem definidas

---

**Documentação da API - LLM-CLI v2.0.0**
