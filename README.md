# 🚀 **LLM CLI - AI Agent Terminal**

> **CLI inteligente para desenvolvimento com modelos LLMs locais**  
> **Desenvolvido para a comunidade ❤️**

## 🌟 **Principais Características**

- **🤖 AI Agent Local**: Funciona offline com modelos locais via Ollama
- **🎨 Interface Elegante**: Banner LLM CLI em degradê roxo com ASCII art
- **🔄 MCP Integrado**: Servidor MCP interno com fallback para Ollama
- **📁 Inicialização Inteligente**: Detecta linguagem/framework automaticamente
- **💬 Chat Interativo**: Interface conversacional com comandos especiais
- **⚡ Seleção Intuitiva**: Navegação com setas e confirmações visuais
- **🔒 Privacidade Total**: Tudo roda localmente, sem envio de dados

## 🎮 **Como Funciona**

### 1. **Primeira Execução - Configuração Inicial**
```bash
# A CLI oferece modelos recomendados automaticamente
llm init

# Recomenda modelos baseados em:
# - Tamanho e eficiência
# - Especialização (código, geral, etc.)
# - Compatibilidade com diferentes sistemas
```

### 2. **Inicialização de Projeto - Modelo Automático**
```bash
# Em qualquer pasta de projeto
llm init

# A CLI:
# ✅ Detecta linguagem/framework automaticamente
# 🤖 Sugere modelos recomendados
# 📝 Cria estrutura de projeto com contexto
# 🔧 Configura modelo padrão
# 📁 Atualiza .gitignore automaticamente
```

### 3. **Chat Inteligente com Fallback**
```bash
# Iniciar conversa
llm chat

# Se o projeto não estiver inicializado:
# ⚠️ "Projeto não inicializado! Deseja inicializar agora? (S/n)"
# 🚀 Inicializa automaticamente se confirmado
# 💬 Inicia chat com modelo configurado

# Fallback automático:
# 🔌 Tenta conectar via MCP integrado
# ⚠️ Se falhar, usa Ollama diretamente
# ✅ Chat funciona independente do protocolo
```

## ⚡ **Modelos Recomendados**

### **Modelos Leves e Eficientes**
- `phi3:mini` - 3.8B parâmetros, rápido e eficiente
- `gemma2:2b` - 2B parâmetros, muito leve
- `mistral:7b-instruct` - 7B parâmetros, equilibrado

### **Modelos Especializados em Código**
- `deepseek-coder:6.7b-instruct` - Excelente para desenvolvimento
- `codellama:7b-instruct` - Especializado em código da Meta
- `codegemma:7b` - Foco em programação

### **Modelos Gerais de Alta Qualidade**
- `llama3.1:8b-instruct` - Qualidade superior, versátil
- `qwen2.5:7b-instruct` - Boa performance geral
- `phi3:3.8b-instruct` - Equilibrado entre velocidade e qualidade

## 🛠️ **Comandos Disponíveis**

### **Inicialização e Configuração**
```bash
llm init                    # Inicializa projeto com modelo automático
llm set-default-model       # Define modelo padrão global
llm change-model           # Troca modelo do projeto atual
```

### **Chat e Interação**
```bash
llm chat                   # Inicia modo conversacional
llm list-models           # Lista modelos disponíveis
```

### **Comandos do Chat** (dentro do `llm chat`)
```bash
/help                     # Mostra ajuda sobre comandos
/change-model <model>     # Troca modelo durante a sessão
/status                   # Mostra status da sessão atual
/clear                    # Limpa histórico da conversa
/save [nome]              # Salva conversa atual
/load <nome>              # Carrega conversa salva
/context                  # Mostra contexto do projeto
/exit                     # Sai da conversa
```

## 🔒 **Segurança e Privacidade**

- **🔐 100% Local**: Nenhum dado é enviado para servidores externos
- **🏠 Ollama Local**: Modelos rodam na sua máquina
- **📁 Projetos Privados**: Configurações ficam na pasta do projeto
- **🚫 Sem Telemetria**: Não coletamos dados de uso

## 🚀 **Próximos Passos**

1. **Instale a CLI**: `npm install -g llm-cli`
2. **Configure Ollama**: `ollama pull phi3:mini`
3. **Inicialize Projeto**: `llm init`
4. **Comece a Conversar**: `llm chat`

## 🏗️ **Arquitetura**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   LLM CLI       │    │   MCP Server    │    │   Ollama        │
│   (Interface)   │◄──►│   (Integrado)   │◄──►│   (Local LLM)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Project       │    │  Conversation   │    │  Model         │
│  Manager       │    │  Manager        │    │  Manager       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🤝 **Contribuição**

Contribuições são bem-vindas! Este projeto é desenvolvido para a comunidade.

1. **Fork** o repositório
2. **Crie** uma branch para sua feature
3. **Commit** suas mudanças
4. **Push** para a branch
5. **Abra** um Pull Request

## 📄 **Licença**

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

**Desenvolvido com ❤️ para a comunidade de desenvolvedores**
