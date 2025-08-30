# LLM-CLI - Assistente de IA Conversacional

> **Chat Inteligente para Desenvolvimento** - Converse naturalmente, implemente automaticamente ❤️

## 🚀 Características Principais

- 💬 **Chat Conversacional**: Fale naturalmente, sem comandos especiais
- 🎯 **Detecção Automática**: Detecta quando você quer implementar algo
- 📋 **Planejamento Inteligente**: Cria planos automaticamente e executa com confirmação
- ⚡ **Sugestão de Comandos**: Sugere e executa comandos do sistema com sua aprovação
- 🤖 **Agente IA Avançado**: Similar ao Claude Code, capaz de Q&A, planejamento e geração de código
- 🔧 **Integração Direta Ollama**: Comunicação REST eficiente (sem overhead MCP)
- 🏗️ **Arquitetura DDD**: Clean Code com domínios bem definidos
- 🧪 **Testes Completos**: 14/14 testes passando

## 📦 Instalação

### Pré-requisitos

- Node.js 18+
- Ollama instalado e rodando na porta 11434
- Modelos Ollama (ex: `llama3.2`, `qwen2.5:7b`)

### Instalação

```bash
git clone https://github.com/cristianpenteado/llm-cli.git
cd llm-cli
npm install
npm run build
npm link
```

## 🎯 Como Usar

### Iniciar Chat Conversacional

```bash
# Iniciar chat interativo
llm
```

### Exemplos de Conversa Natural

```bash
# Perguntas conceituais
"Como funciona JWT?"
"Explique o padrão Repository"
"Qual a diferença entre REST e GraphQL?"

# Implementações (detecta automaticamente)
"Quero criar uma API REST com Express"
"Implementa autenticação no meu projeto"
"Fazer um sistema de login completo"
"Configurar TypeScript no projeto"
```

### Comandos Básicos (apenas 3!)

- `help` - Mostra como usar
- `clear` - Limpa tela
- `exit` - Sair

**Tudo mais é conversa natural!**

### Exemplo de Fluxo Conversacional

```bash
$ llm
🤖 LLM-CLI - Assistente de IA para Desenvolvimento

> Quero criar um sistema de autenticação completo

🤔 Processando...
💬 Resposta: Vou criar um sistema de autenticação JWT completo para você...

🎯 Detectei uma solicitação de implementação!
❓ Quer que eu crie um plano detalhado para isso? [s/n]: s

✅ Plano criado: Sistema de Autenticação JWT
📝 Passos:
  ▶️ 1. Setup inicial do projeto
     Configurar estrutura base com Express e TypeScript
  ⏸️ 2. Implementar middleware de autenticação
     Criar middleware JWT para validação de tokens
  ⏸️ 3. Criar rotas de auth
     Implementar login, registro e refresh token

❓ Executar o plano agora? [s/n]: s

🚀 Executando plano...
📍 Passo 1: Setup inicial do projeto
Executar este passo? [sim/skip/stop]: sim
✅ Passo concluído

> Como funciona JWT?

💬 Resposta: JWT (JSON Web Token) é um padrão para transmitir informações...
[Explicação detalhada]
```

## ⚙️ Configuração

Arquivo de configuração em `~/.llm-cli/config.yaml`:

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

## 🏗️ Arquitetura

### Estrutura DDD

```
src/
├── domain/                    # Domínio (regras de negócio)
│   ├── agent/                # Domínio do agente IA
│   │   └── Agent.ts         # Interfaces do agente
│   ├── communication/        # Domínio de comunicação
│   │   └── ModelProvider.ts # Interface do provedor de modelo
│   └── configuration/        # Domínio de configuração
│       └── Configuration.ts # Interfaces de config
├── application/              # Camada de aplicação
│   ├── services/            # Serviços de aplicação
│   │   └── AgentService.ts  # Implementação do agente
│   └── ports/               # Portas (interfaces)
│       ├── FileSystemService.ts
│       └── Logger.ts
├── infrastructure/          # Infraestrutura
│   ├── cli/                # Interface CLI
│   │   └── CLI.ts          # CLI interativo
│   ├── ollama/             # Integração Ollama
│   │   └── OllamaProvider.ts
│   ├── filesystem/         # Sistema de arquivos
│   ├── logging/           # Sistema de logs
│   ├── configuration/     # Repositório de config
│   └── di/               # Injeção de dependência
│       └── Container.ts   # Container DI
└── __tests__/            # Testes
    ├── unit/            # Testes unitários
    └── integration/     # Testes de integração
```

### Fluxo de Comunicação

```
CLI → AgentService → OllamaProvider → Ollama API (REST)
```

**Por que não MCP?** Para ambiente local, comunicação direta via REST é mais simples, eficiente e confiável que protocolos complexos.

## 📚 Documentação Completa

- **[Guia Conversacional](docs/CONVERSATIONAL-GUIDE.md)** - Como conversar com o assistente
- **[Arquitetura](docs/ARCHITECTURE.md)** - Design técnico e decisões arquiteturais  
- **[Changelog](docs/CHANGELOG.md)** - Histórico completo de mudanças

## 🧪 Desenvolvimento

### Setup

```bash
npm install
npm run dev     # Desenvolvimento
npm run build   # Build produção
npm test        # Executar testes
npm run test:watch  # Testes em watch mode
```

### Testes

```bash
# Todos os testes
npm test

# Testes específicos
npm test -- AgentService
npm test -- OllamaProvider

# Coverage
npm test -- --coverage
```

### Estrutura de Testes

- **Unit Tests**: Testam componentes isoladamente
- **Integration Tests**: Testam fluxo completo CLI → Agent → Ollama
- **Mocks**: Simulam dependências externas (Ollama API, filesystem)

## 🤝 Contribuição

1. Fork o projeto
2. Crie branch: `git checkout -b feature/nova-funcionalidade`
3. Commit: `git commit -m 'Add nova funcionalidade'`
4. Push: `git push origin feature/nova-funcionalidade`
5. Abra Pull Request

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

- 🐛 **Issues**: [GitHub Issues](https://github.com/cristianpenteado/llm-cli/issues)
- 💬 **Discussões**: [GitHub Discussions](https://github.com/cristianpenteado/llm-cli/discussions)
- 📧 **Email**: cristian.penteado@gmail.com