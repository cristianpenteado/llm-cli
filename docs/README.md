# LLM-CLI - Assistente de IA para Desenvolvimento

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](package.json)
[![TypeScript](https://img.shields.io/badge/typescript-5.3.2-blue.svg)](package.json)

> **CLI inteligente para desenvolvimento com modelos LLMs locais via Ollama**

## 🚀 Visão Geral

O LLM-CLI é uma ferramenta de linha de comando que transforma a forma como você desenvolve software. Em vez de comandos explícitos, ele funciona como um **chat conversacional inteligente** que entende suas intenções e executa ações automaticamente.

### ✨ Características Principais

- **🤖 Chat Natural**: Converse como se estivesse falando com um colega desenvolvedor
- **🎯 Detecção Automática**: Identifica quando você quer implementar algo
- **📋 Planejamento Inteligente**: Cria planos detalhados automaticamente
- **⚡ Execução Guiada**: Executa passos com confirmações inteligentes
- **💡 Sugestões de Comandos**: Recomenda e executa comandos do sistema
- **🏗️ Arquitetura DDD**: Código limpo e bem estruturado

## 🎯 Casos de Uso

### 💬 **Perguntas Conceituais**
```
> Como funciona JWT?
> Qual a diferença entre REST e GraphQL?
> Explique o padrão Repository
```

### 🛠️ **Implementação Automática**
```
> Quero criar uma API REST com Express
> Implementa autenticação no meu projeto
> Configurar TypeScript no projeto
```

### ⚡ **Comandos Sugeridos**
```
> Configurar projeto Node.js
💡 Comandos sugeridos:
  • npm init -y
  • npm install express
  • npm install -D typescript @types/node
```

## 🚀 Instalação

### Pré-requisitos
- **Node.js** >= 18.0.0
- **Ollama** instalado e rodando
- **Modelo LLM** baixado (ex: `llama3.2`)

### Instalação Global
```bash
# Clone o repositório
git clone https://github.com/llm-cli/llm-cli.git
cd llm-cli

# Instale dependências e compile
npm install
npm run build

# Instale globalmente
npm install -g .
```

### Verificação
```bash
llm --version
# Saída: 1.0.0
```

## 🎮 Como Usar

### Iniciar Chat
```bash
llm
```

### Uso Básico
```bash
# Ajuda
llm --help

# Modelo específico
llm --model llama3.2
```

### Exemplo de Conversa
```
🤖 LLM-CLI iniciado com modelo llama3.2

> Quero criar uma API REST com Express

💬 Resposta: Vou criar uma API REST completa com Express para você...

🎯 Detectei uma solicitação de implementação!
❓ Quer que eu crie um plano detalhado para isso? [s/n]: s

✅ Plano criado: API REST com Express
📝 Passos:
  ▶️ 1. Setup inicial do projeto
     Criar package.json e estrutura básica
  ⏸️ 2. Instalar Express e dependências
     npm install express cors helmet
  ⏸️ 3. Criar servidor básico
     Arquivo server.js com rotas essenciais

❓ Executar o plano agora? [s/n]: s

🚀 Executando plano...
📍 Passo 1: Setup inicial do projeto
Executar este passo? [sim/skip/stop]: sim
✅ Passo concluído
```

## 🏗️ Arquitetura

### Estrutura do Projeto
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

### Camadas
- **Domain**: Entidades e regras de negócio
- **Application**: Serviços e casos de uso
- **Infrastructure**: Implementações concretas

## ⚙️ Configuração

### Arquivo de Configuração
Crie `~/.llm-cli/config.yaml`:

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

### Personalidades do Agente
- **helpful**: Amigável e prestativo (padrão)
- **concise**: Respostas mais diretas
- **detailed**: Explicações mais profundas
- **creative**: Soluções mais inovadoras

## 🧪 Testes

### Executar Testes
```bash
# Todos os testes
npm test

# Testes em modo watch
npm run test:watch

# Build
npm run build
```

### Cobertura
- **Unit Tests**: AgentService, OllamaProvider
- **Integration Tests**: Fluxo completo CLI
- **Status**: 14/14 testes passando ✅

## 🔧 Desenvolvimento

### Scripts Disponíveis
```bash
npm run build      # Compilar TypeScript
npm run dev        # Executar em modo desenvolvimento
npm run start      # Executar versão compilada
npm run test       # Executar testes
npm run lint       # Verificar código
npm run clean      # Limpar dist/
```

### Estrutura de Desenvolvimento
```
src/
├── __tests__/     # Testes
├── application/   # Serviços de aplicação
├── domain/        # Regras de negócio
└── infrastructure/ # Implementações
```

## 📚 Documentação

- **[Arquitetura](ARCHITECTURE.md)**: Detalhes técnicos e decisões
- **[Guia Conversacional](CONVERSATIONAL-GUIDE.md)**: Como usar o chat
- **[Changelog](CHANGELOG.md)**: Histórico de versões

## 🤝 Contribuição

### Como Contribuir
1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### Padrões de Código
- **TypeScript**: Tipagem forte e interfaces bem definidas
- **DDD**: Domain-Driven Design para organização
- **Clean Code**: Código limpo e legível
- **Testes**: Cobertura de testes para todas as funcionalidades

## 🐛 Solução de Problemas

### Problemas Comuns

#### **Erro: "Service ConversationContext not found"**
```bash
# Recompile o projeto
npm run build
npm install -g .
```

#### **Ollama não responde**
```bash
# Verifique se Ollama está rodando
ollama list

# Teste a conexão
curl http://localhost:11434/api/tags
```

#### **Modelo não encontrado**
```bash
# Liste modelos disponíveis
ollama list

# Baixe um modelo
ollama pull llama3.2
```

### Logs e Debug
```bash
# Aumente nível de log
llm --log-level debug

# Verifique logs do sistema
tail -f ~/.llm-cli/logs/app.log
```

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🙏 Agradecimentos

- **Ollama** pela plataforma de modelos locais
- **Comunidade TypeScript** pelas ferramentas e padrões
- **Contribuidores** que ajudaram a construir esta ferramenta

## 📞 Suporte

- **Issues**: [GitHub Issues](https://github.com/llm-cli/llm-cli/issues)
- **Discussions**: [GitHub Discussions](https://github.com/llm-cli/llm-cli/discussions)
- **Documentação**: [docs/](docs/)

---

**Desenvolvido com ❤️ pela equipe LLM-CLI**
