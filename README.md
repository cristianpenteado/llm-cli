# LLM CLI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)

Uma CLI inteligente e conversacional para desenvolvimento assistido por IA, distribuída via NPM e otimizada para Linux. A LLM CLI utiliza o Model Context Protocol (MCP) com JSON-RPC para se comunicar com modelos LLMs locais via Vlama, oferecendo uma experiência de desenvolvimento fluida e inteligente.

## 🚀 Características Principais

### 🤖 **Detecção Inteligente de Hardware**
- **Análise Automática**: Detecta CPU, RAM, GPU e armazenamento do sistema
- **Recomendações Personalizadas**: Sugere modelos LLMs compatíveis com seu hardware
- **Otimização de Performance**: Configura modelos baseados nas capacidades do sistema

### 🏗️ **Orquestração de Modelos LLMs**
- **Gerenciamento Automático**: Inicializa e para modelos automaticamente por projeto
- **Integração Vlama**: Suporte nativo para modelos locais via Vlama
- **MCP Protocol**: Comunicação padronizada via Model Context Protocol

### 📁 **Inicialização Inteligente de Projetos**
- **Detecção Automática**: Identifica linguagem e framework automaticamente
- **Configuração Contextual**: Armazena contexto do projeto em Markdown
- **Modelo por Projeto**: Configuração específica de modelo para cada projeto

### 🔧 **Manipulação Inteligente de Arquivos**
- **Edição Contextual**: Modifica arquivos preservando contexto existente
- **Sistema de Backups**: Cria backups automáticos antes de alterações
- **Histórico de Mudanças**: Rastreia todas as alterações com rollback

### 💬 **Interface Conversacional Natural**
- **Comandos Intuitivos**: Interação em linguagem natural
- **Comandos Especiais**: Sistema de comandos `/` para funcionalidades avançadas
- **Contexto Persistente**: Mantém contexto entre sessões

### 🔄 **Funcionalidades de Desenvolvimento**
- **Criação de Funcionalidades**: Gera testes, módulos e componentes automaticamente
- **Edição Inteligente**: Modifica código baseado em instruções em linguagem natural
- **Rollback Seguro**: Desfaz alterações com sistema de backup integrado

## 🛠️ Instalação

### Pré-requisitos
- **Node.js**: Versão 18 ou superior
- **Linux**: Sistema operacional Linux (Ubuntu, Debian, CentOS, etc.)
- **Vlama**: Gerenciador de modelos LLMs locais

### Instalação Global
```bash
npm install -g llm-cli
```

### Verificação da Instalação
```bash
llm --version
```

## 🎯 Primeiros Passos

### 1. **Detectar Hardware e Configurar**
```bash
# Detectar hardware e obter recomendações de modelos
llm detect-hardware

# Definir modelo padrão baseado nas recomendações
llm set-default-model phi-3:3.8b-instruct
```

### 2. **Inicializar Projeto**
```bash
# Navegar para a pasta do projeto
cd meu-projeto

# Inicializar projeto (detecta linguagem automaticamente)
llm init

# Ou especificar modelo específico
llm init -m deepseek-coder:6.7b-instruct
```

### 3. **Modo Conversacional**
```bash
# Iniciar chat com IA
llm chat

# Ou especificar modelo para esta sessão
llm chat -m phi-3:3.8b-instruct
```

## 📚 Comandos Principais

### **Gerenciamento de Projetos**
```bash
# Inicializar novo projeto
llm init [-m modelo] [-f]

# Ver status do projeto atual
llm status

# Trocar modelo do projeto
llm change-model -m novo-modelo
```

### **Gerenciamento de Modelos**
```bash
# Listar modelos disponíveis
llm list-models

# Definir modelo padrão global
llm set-default-model nome-do-modelo

# Detectar hardware e recomendações
llm detect-hardware
```

### **Desenvolvimento**
```bash
# Criar nova funcionalidade
llm create <tipo> <nome> [-d descrição]

# Editar arquivo existente
llm edit <arquivo> <instrução>

# Desfazer alterações
llm rollback [-n número]
```

### **Modo Conversacional**
```bash
# Iniciar chat
llm chat [-m modelo]

# Comandos disponíveis no chat:
/help              # Mostra ajuda
/change-model      # Troca modelo ativo
/status            # Status da sessão
/clear             # Limpa histórico
/save [nome]       # Salva conversa
/load <nome>       # Carrega conversa
/context           # Mostra contexto do projeto
/exit              # Sai do chat
```

## 🔧 Configuração

### **Arquivo de Configuração Global**
```bash
# Localização: ~/.llm-cli/config.json
{
  "defaultModel": "phi-3:3.8b-instruct",
  "mcpConfig": {
    "serverUrl": "http://localhost",
    "port": 8000,
    "protocol": "http",
    "timeout": 30000
  },
  "vlamaConfig": {
    "modelsPath": "~/.local/share/ollama/models",
    "serverUrl": "http://localhost",
    "port": 11434,
    "maxMemory": 8192,
    "gpuEnabled": false
  }
}
```

### **Configuração por Projeto**
```bash
# Localização: .llm-cli/project.json
{
  "path": "/caminho/do/projeto",
  "name": "meu-projeto",
  "language": "TypeScript",
  "framework": "React",
  "model": "deepseek-coder:6.7b-instruct",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

## 🎨 Exemplos de Uso

### **Criar Testes Automáticos**
```bash
# No modo conversacional
llm chat

# Solicitar criação de testes
> Crie testes unitários para o componente UserProfile

# A CLI irá:
# 1. Analisar o código existente
# 2. Gerar testes apropriados
# 3. Pedir confirmação antes de aplicar
# 4. Criar backups automáticos
```

### **Refatorar Código**
```bash
# Editar arquivo com instrução específica
llm edit src/components/UserProfile.tsx "Converta para hooks funcionais e adicione TypeScript strict"

# A CLI irá:
# 1. Ler o arquivo atual
# 2. Gerar código refatorado
# 3. Aplicar mudanças com backup
# 4. Registrar no histórico
```

### **Criar Nova Funcionalidade**
```bash
# Criar módulo de autenticação
llm create module auth -d "Sistema de autenticação com JWT e refresh tokens"

# A CLI irá:
# 1. Analisar estrutura do projeto
# 2. Gerar arquivos necessários
# 3. Configurar dependências
# 4. Criar documentação
```

## 🏗️ Arquitetura

### **Componentes Principais**
- **LLMCLI**: Orquestrador principal da aplicação
- **ProjectManager**: Gerenciamento de projetos e detecção de linguagens
- **ModelManager**: Orquestração de modelos LLMs
- **ConversationManager**: Interface conversacional e comandos
- **FileManager**: Manipulação de arquivos e sistema de backup
- **MCPClient**: Cliente para comunicação MCP
- **VlamaManager**: Gerenciamento de modelos locais

### **Fluxo de Trabalho**
```
Usuário → CLI → ModelManager → MCPClient → Modelo LLM
                ↓
            FileManager → Aplicar Mudanças
                ↓
            ProjectManager → Atualizar Contexto
```

## 🔒 Segurança e Backup

### **Sistema de Backups**
- **Backups Automáticos**: Criados antes de cada alteração
- **Histórico de Mudanças**: Rastreamento completo de alterações
- **Rollback Seguro**: Desfaz alterações com segurança

### **Isolamento de Projetos**
- **Configuração por Projeto**: Cada projeto tem suas configurações
- **Contexto Isolado**: Contexto específico para cada projeto
- **Modelos Independentes**: Configuração de modelo por projeto

## 🧪 Testes

### **Executar Testes**
```bash
# Instalar dependências
npm install

# Executar testes
npm test

# Testes em modo watch
npm run test:watch

# Cobertura de código
npm run test -- --coverage
```

### **Estrutura de Testes**
```
src/__tests__/
├── setup.ts              # Configuração global
├── LLMCLI.test.ts        # Testes da classe principal
├── core/                 # Testes dos componentes principais
├── utils/                # Testes das utilidades
├── mcp/                  # Testes do cliente MCP
└── vlama/                # Testes do gerenciador Vlama
```

## 🚀 Desenvolvimento

### **Estrutura do Projeto**
```
src/
├── core/                 # Componentes principais
│   ├── LLMCLI.ts        # Classe principal
│   ├── ProjectManager.ts # Gerenciador de projetos
│   ├── ModelManager.ts   # Gerenciador de modelos
│   ├── ConversationManager.ts # Gerenciador de conversas
│   └── FileManager.ts    # Gerenciador de arquivos
├── mcp/                  # Cliente MCP
│   └── MCPClient.ts      # Implementação MCP
├── vlama/                # Gerenciador Vlama
│   └── VlamaManager.ts   # Integração Vlama
├── utils/                # Utilitários
│   ├── Logger.ts         # Sistema de logging
│   ├── ConfigManager.ts  # Gerenciador de configuração
│   ├── HardwareDetector.ts # Detector de hardware
│   └── LanguageDetector.ts # Detector de linguagens
├── types/                # Definições de tipos
│   └── index.ts          # Tipos principais
└── index.ts              # Ponto de entrada
```

### **Scripts Disponíveis**
```bash
# Desenvolvimento
npm run dev              # Executar em modo desenvolvimento
npm run build            # Compilar TypeScript
npm run start            # Executar versão compilada

# Qualidade de Código
npm run lint             # Verificar código
npm run lint:fix         # Corrigir problemas automaticamente

# Testes
npm run test             # Executar testes
npm run test:watch       # Testes em modo watch
npm run test:coverage    # Cobertura de testes

# Build e Deploy
npm run clean            # Limpar build
npm run prepublishOnly   # Build antes de publicar
```

## 🤝 Contribuindo

### **Como Contribuir**
1. **Fork** o repositório
2. **Clone** seu fork localmente
3. **Crie** uma branch para sua feature
4. **Desenvolva** e **teste** suas mudanças
5. **Commit** com mensagens descritivas
6. **Push** para sua branch
7. **Abra** um Pull Request

### **Padrões de Código**
- **TypeScript**: Código tipado e estruturado
- **ESLint**: Linting automático
- **Prettier**: Formatação de código
- **Jest**: Testes unitários
- **Conventional Commits**: Padrão de commits

### **Checklist de Pull Request**
- [ ] Código compila sem erros
- [ ] Testes passam
- [ ] Cobertura de testes mantida
- [ ] Documentação atualizada
- [ ] Linting passa
- [ ] Commits seguem padrão

## 📄 Licença

Este projeto está licenciado sob a **MIT License** - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🙏 Agradecimentos

- **Vlama**: Gerenciamento de modelos LLMs locais
- **MCP**: Model Context Protocol para comunicação padronizada
- **Comunidade Open Source**: Contribuições e feedback

## 📞 Suporte

### **Canais de Suporte**
- **Issues**: [GitHub Issues](https://github.com/llm-cli/llm-cli/issues)
- **Discussions**: [GitHub Discussions](https://github.com/llm-cli/llm-cli/discussions)
- **Documentação**: [Wiki do Projeto](https://github.com/llm-cli/llm-cli/wiki)

### **Problemas Comuns**
- **Modelo não encontrado**: Verifique se o Vlama está rodando
- **Erro de conexão MCP**: Verifique configuração do servidor MCP
- **Hardware não detectado**: Execute `llm detect-hardware` para diagnóstico

---

**LLM CLI** - Transformando desenvolvimento com IA conversacional 🚀

*Desenvolvido com ❤️ pela comunidade open source*
