# Arquitetura - LLM-CLI v2.0

## Visão Geral

O LLM-CLI foi completamente reconstruído com arquitetura DDD (Domain-Driven Design) e Clean Code, focando em simplicidade, conversação natural e eficiência.

## Princípios Arquiteturais

### 1. **Domain-Driven Design (DDD)**
- **Domínios bem definidos** com responsabilidades claras
- **Linguagem ubíqua** entre código e negócio
- **Separação de responsabilidades** por camadas

### 2. **Clean Architecture**
- **Dependências apontam para dentro** (domínio no centro)
- **Interfaces definem contratos** entre camadas
- **Inversão de dependência** via DI Container

### 3. **Conversação Natural**
- **Chat como interface principal** sem comandos explícitos
- **Detecção automática de intenções** do usuário
- **Confirmações inteligentes** para ações

## Estrutura de Camadas

```
┌─────────────────────────────────────────┐
│            Infrastructure              │
│  CLI, Ollama, FileSystem, Logger, DI   │
├─────────────────────────────────────────┤
│            Application                 │
│       Services, Ports (Interfaces)     │
├─────────────────────────────────────────┤
│              Domain                    │
│    Agent, Communication, Configuration │
└─────────────────────────────────────────┘
```

## Domínios

### **Agent Domain** (`src/domain/agent/`)
**Responsabilidade**: Definir comportamentos e capacidades do agente IA

```typescript
interface Agent {
  processQuery(query: string): Promise<AgentResponse>
  createPlan(task: string): Promise<TaskPlan>
  executeStep(step: TaskStep, confirmation: ConfirmationResult): Promise<StepResult>
  readProject(path?: string): Promise<ProjectContext>
  generateCode(specification: CodeSpecification): Promise<CodeResult>
}
```

**Entidades**:
- `TaskPlan` - Plano de execução com passos
- `TaskStep` - Passo individual do plano
- `ProjectContext` - Contexto do projeto atual
- `CodeResult` - Resultado de geração de código

### **Communication Domain** (`src/domain/communication/`)
**Responsabilidade**: Definir comunicação com modelos de IA

```typescript
interface ModelProvider {
  listModels(): Promise<ModelInfo[]>
  generateResponse(request: GenerationRequest): Promise<GenerationResponse>
  isAvailable(): Promise<boolean>
  getModelInfo(modelName: string): Promise<ModelInfo>
}
```

**Entidades**:
- `ModelInfo` - Informações do modelo
- `GenerationRequest` - Solicitação de geração
- `GenerationResponse` - Resposta do modelo

### **Configuration Domain** (`src/domain/configuration/`)
**Responsabilidade**: Definir configurações do sistema

```typescript
interface Configuration {
  model: ModelConfiguration
  agent: AgentConfiguration
  cli: CLIConfiguration
  ollama: OllamaConfiguration
}
```

## Camada de Aplicação

### **AgentService** (`src/application/services/AgentService.ts`)
**Responsabilidade**: Implementar lógica de negócio do agente

**Funcionalidades**:
- Processamento de consultas naturais
- Criação automática de planos
- Execução de passos com confirmação
- Análise de projetos
- Geração de código contextual

**Fluxo de Processamento**:
```
Input → Análise de Intenção → Processamento → Ação → Output
```

### **Ports (Interfaces)** (`src/application/ports/`)
**Responsabilidade**: Definir contratos para infraestrutura

- `FileSystemService` - Operações de arquivo
- `Logger` - Sistema de logs

## Camada de Infraestrutura

### **CLI** (`src/infrastructure/cli/CLI.ts`)
**Responsabilidade**: Interface conversacional com usuário

**Funcionalidades**:
- Chat interativo sem comandos explícitos
- Detecção automática de intenções
- Confirmações para ações
- Sugestão de comandos do sistema

**Fluxo Conversacional**:
```
Input → Detecção de Intenção → Processamento → Ações → Confirmações → Execução
```

**Detecção de Implementação**:
```typescript
const implementationKeywords = [
  'implementar', 'criar', 'fazer', 'desenvolver', 'construir', 'gerar',
  'adicionar', 'incluir', 'setup', 'configurar', 'instalar'
];
```

### **OllamaProvider** (`src/infrastructure/ollama/OllamaProvider.ts`)
**Responsabilidade**: Comunicação direta com Ollama via REST

**Funcionalidades**:
- Comunicação HTTP direta (porta 11434)
- Retry automático com backoff exponencial
- Timeout configurável
- Listagem e informações de modelos

**Por que não MCP?**:
- **Simplicidade**: REST é mais direto para ambiente local
- **Eficiência**: Menos overhead de protocolo
- **Confiabilidade**: Menos pontos de falha
- **Debugging**: Mais fácil de debugar

### **Container DI** (`src/infrastructure/di/Container.ts`)
**Responsabilidade**: Injeção de dependência

**Padrão**:
```typescript
const container = new Container();
const cli = await container.resolve<CLI>('CLI');
```

## Fluxos Principais

### **Fluxo de Conversa Conceitual**
```
Usuário: "Como funciona JWT?"
    ↓
CLI.processConversationalInput()
    ↓
AgentService.processQuery()
    ↓
OllamaProvider.generateResponse()
    ↓
Resposta formatada exibida
```

### **Fluxo de Implementação Automática**
```
Usuário: "Quero criar uma API REST"
    ↓
CLI.processConversationalInput()
    ↓
Detecção de palavra-chave "criar"
    ↓
CLI.handleResponseActions()
    ↓
Pergunta: "Criar plano detalhado?"
    ↓ (se sim)
AgentService.createPlan()
    ↓
Exibe plano criado
    ↓
Pergunta: "Executar plano?"
    ↓ (se sim)
CLI.executePlan() com confirmações
```

### **Fluxo de Sugestão de Comandos**
```
AgentService responde com: "COMANDO_SUGERIDO: npm install express"
    ↓
CLI.handleResponseActions() detecta padrão
    ↓
Exibe comandos sugeridos
    ↓
Pergunta: "Executar comandos?"
    ↓ (se sim)
CLI.executeSystemCommand() para cada comando
```

## Configuração

### **Arquivo de Configuração** (`~/.llm-cli/config.yaml`)
```yaml
model:
  defaultModel: "llama3.2"
  temperature: 0.7
  maxTokens: 4096
  fallbackModels: ["llama3.2:1b", "qwen2.5:7b"]

agent:
  name: "Claude Code Assistant"
  personality: "helpful"  # helpful|concise|detailed|creative
  autoConfirm: false
  maxPlanSteps: 10
  contextWindow: 8192

cli:
  theme: "auto"  # dark|light|auto
  showTimestamps: false
  logLevel: "info"  # error|warn|info|debug
  historySize: 100

ollama:
  host: "localhost"
  port: 11434
  timeout: 30000
  retryAttempts: 3
  keepAlive: "5m"
```

## Testes

### **Estratégia de Testes**
- **Unit Tests**: Componentes isolados com mocks
- **Integration Tests**: Fluxo completo CLI → Agent → Ollama
- **Mocks**: Simulação de dependências externas

### **Estrutura de Testes**
```
src/__tests__/
├── unit/
│   ├── AgentService.test.ts
│   └── OllamaProvider.test.ts
├── integration/
│   └── CLI.integration.test.ts
└── setup.ts
```

## Decisões Técnicas

### **TypeScript**
- **Tipagem forte** para melhor DX
- **Interfaces bem definidas** para contratos
- **Compilação sem erros** garantida

### **Comunicação Direta vs MCP**
**Escolha**: REST direto com Ollama
**Razões**:
- Ambiente local não precisa de protocolo complexo
- Menos dependências e pontos de falha
- Mais fácil de debugar e manter
- Performance superior

### **DI Container vs Factory**
**Escolha**: DI Container customizado
**Razões**:
- Controle total sobre dependências
- Sem overhead de bibliotecas externas
- Resolução assíncrona de dependências
- Configuração centralizada

### **Chat vs Comandos**
**Escolha**: Chat conversacional
**Razões**:
- UX mais natural e intuitiva
- Detecção automática de intenções
- Menos curva de aprendizado
- Experiência similar a assistentes modernos

## Extensibilidade

### **Adicionando Novos Provedores**
1. Implementar interface `ModelProvider`
2. Registrar no `Container`
3. Configurar fallback se necessário

### **Adicionando Novas Capacidades do Agente**
1. Estender interface `Agent`
2. Implementar em `AgentService`
3. Adicionar detecção no `CLI`

### **Adicionando Novos Tipos de Arquivo**
1. Estender `FileSystemService`
2. Adicionar detecção de tecnologia
3. Configurar geração de código específica

## Performance

### **Otimizações**
- **Cache de configuração** carregada uma vez
- **Retry com backoff** para requisições
- **Timeout configurável** para evitar travamentos
- **Lazy loading** de dependências

### **Métricas**
- **Startup time**: ~500ms
- **Response time**: Dependente do modelo Ollama
- **Memory usage**: ~50MB base
- **Test execution**: ~8s para suite completa
