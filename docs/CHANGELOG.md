# Changelog - LLM-CLI

## [2.0.0] - 2025-08-29 - Rebuild Conversacional Completo

### 🚀 **BREAKING CHANGES**
- **Rebuild completo do projeto** desde o zero
- **Arquitetura DDD** implementada com Clean Code
- **Chat conversacional** substituiu comandos explícitos
- **Comunicação direta Ollama** ao invés de MCP

### ✨ **Novas Funcionalidades**

#### **Chat Conversacional Inteligente**
- **Detecção automática** de solicitações de implementação
- **Planejamento automático** quando usuário pede para implementar algo
- **Sugestão de comandos** com aprovação do usuário
- **Conversa natural** sem necessidade de comandos específicos

#### **Palavras-chave Detectadas**
- `implementar`, `criar`, `fazer`, `desenvolver`, `construir`
- `gerar`, `adicionar`, `incluir`, `setup`, `configurar`, `instalar`

#### **Fluxo Automático**
1. Usuário fala naturalmente: *"Quero criar uma API REST"*
2. Sistema detecta intenção de implementação
3. Oferece criar plano detalhado
4. Executa com confirmações [sim/skip/stop]
5. Sugere comandos do sistema com aprovação

### 🏗️ **Arquitetura Renovada**

#### **Domain-Driven Design (DDD)**
```
src/
├── domain/           # Regras de negócio
│   ├── agent/       # Domínio do agente IA
│   ├── communication/ # Comunicação com modelos
│   └── configuration/ # Configuração
├── application/     # Serviços de aplicação
│   ├── services/   # AgentService
│   └── ports/      # Interfaces
└── infrastructure/ # Implementações
    ├── cli/       # Interface conversacional
    ├── ollama/    # Integração direta
    ├── filesystem/
    ├── logging/
    ├── configuration/
    └── di/        # Injeção de dependência
```

#### **Comunicação Simplificada**
- **Antes**: CLI → ModelManager → MCPClient → MCPServer → OllamaManager
- **Agora**: CLI → AgentService → OllamaProvider → Ollama API (REST)

### 🔧 **Componentes Principais**

#### **CLI Conversacional** (`src/infrastructure/cli/CLI.ts`)
- Chat interativo sem comandos explícitos
- Detecção automática de intenções
- Confirmações inteligentes
- Sugestão de comandos do sistema

#### **AgentService** (`src/application/services/AgentService.ts`)
- Processamento de consultas naturais
- Criação automática de planos
- Geração de código contextual
- Análise de projetos

#### **OllamaProvider** (`src/infrastructure/ollama/OllamaProvider.ts`)
- Comunicação direta via REST API
- Retry automático e timeout
- Listagem de modelos
- Geração de respostas

#### **Container DI** (`src/infrastructure/di/Container.ts`)
- Injeção de dependência limpa
- Resolução automática de dependências
- Configuração centralizada

### 🧪 **Testes Renovados**
- **Unit Tests**: AgentService, OllamaProvider
- **Integration Tests**: Fluxo completo CLI
- **Jest Configuration**: Setup otimizado
- **Coverage**: 14/14 testes passando

### 📝 **Sistema de Prompts Melhorado**
- **Prompt conversacional** para interações naturais
- **Detecção de contexto** para implementações
- **Sugestões de comandos** formatadas
- **Personalidade configurável** (helpful, concise, detailed, creative)

### ⚙️ **Configuração Aprimorada**
```yaml
model:
  defaultModel: "llama3.2"
  temperature: 0.7
  maxTokens: 4096

agent:
  name: "Claude Code Assistant"
  personality: "helpful"
  autoConfirm: false
  maxPlanSteps: 10

cli:
  theme: "auto"
  logLevel: "info"

ollama:
  host: "localhost"
  port: 11434
  timeout: 30000
  retryAttempts: 3
```

### 🗑️ **Removido**
- Comandos explícitos (`plan`, `execute`, `status`, `config`, `models`)
- Protocolo MCP e toda sua complexidade
- MCPServer, MCPClient, ModelManager
- OllamaManager com sessões persistentes
- Arquitetura anterior com múltiplas camadas

### 💬 **Exemplos de Uso**

#### **Conversa Conceitual**
```
> Como funciona JWT?
💬 Resposta: [Explicação detalhada sobre JWT...]
```

#### **Implementação Automática**
```
> Quero criar uma API REST com Express
💬 Resposta: [Explicação do que vai fazer]
🎯 Detectei uma solicitação de implementação!
❓ Quer que eu crie um plano detalhado para isso? [s/n]: s
✅ Plano criado: API REST com Express
📝 Passos:
  ▶️ 1. Setup inicial do projeto
  ⏸️ 2. Configurar Express e middleware
  ⏸️ 3. Criar rotas básicas
❓ Executar o plano agora? [s/n]: s
```

#### **Sugestão de Comandos**
```
> Configurar TypeScript no projeto
💬 Resposta: [Explicação + comandos sugeridos]
💡 Comandos sugeridos:
  • npm install -D typescript @types/node
  • npx tsc --init
Executar os comandos sugeridos? [s/n]: s
```

### 🎯 **Comandos Básicos Restantes**
- `help` - Ajuda sobre como usar
- `clear` - Limpa a tela
- `exit` - Sair do programa

### 📊 **Métricas**
- **Linhas de código**: ~2000 linhas
- **Arquivos criados**: 15 novos arquivos
- **Arquivos removidos**: Toda estrutura anterior
- **Testes**: 14 testes (100% passando)
- **TypeScript**: Compilação sem erros
- **Dependências**: Mantidas as essenciais

### 🔄 **Migração**
Este é um rebuild completo. Usuários da versão anterior devem:
1. Fazer backup de configurações personalizadas
2. Reinstalar: `npm install && npm run build`
3. Adaptar-se ao novo fluxo conversacional
4. Configurar modelos Ollama se necessário

### 🚀 **Próximos Passos**
- Implementação real de execução de comandos do sistema
- Salvamento automático de arquivos gerados
- Integração com Git para commits automáticos
- Suporte a múltiplos modelos simultâneos
- Interface web opcional
