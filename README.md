# 🚀 LLM CLI - Agente de IA para Modelos Locais

> **CLI inteligente que funciona como um agente de IA no terminal, integrado com modelos LLMs locais via Ollama**

## 🎯 **Proposta da CLI**

A **LLM CLI** é uma ferramenta de linha de comando que transforma seu terminal em um assistente de IA inteligente. Diferente de outras CLIs que dependem de APIs externas, ela funciona **100% localmente** usando modelos LLMs rodando na sua máquina via Ollama.

### 🌟 **Principais Características**

- **🤖 Agente de IA Local**: Funciona offline com modelos rodando na sua máquina
- **🚀 Inicialização Inteligente**: Detecta automaticamente o tipo de projeto e sugere modelos compatíveis
- **💬 Interface Conversacional**: Chat natural com comandos especiais para desenvolvimento
- **📁 Gerenciamento de Projetos**: Contexto inteligente e histórico de alterações
- **🔄 Fallback Automático**: Se o MCP falhar, usa Ollama diretamente
- **📝 Integração com Git**: Atualiza automaticamente `.gitignore` para incluir `.llm-cli`

## 🚀 **Instalação Rápida**

### Pré-requisitos
- **Node.js** 18+ e **npm**
- **Ollama** instalado e rodando
- **Linux** (Ubuntu/Debian recomendado)

### Instalação Global
```bash
# Instalar via NPM
npm install -g llm-cli

# Verificar instalação
llm --version
```

### Script de Instalação Automática
```bash
# Baixar e executar script de instalação
curl -fsSL https://raw.githubusercontent.com/seu-usuario/llm-cli/main/scripts/install.sh | bash
```

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

## 🛠️ **Comandos Principais**

### **Inicialização e Configuração**
```bash
llm init                    # Inicializa projeto com modelo automático
llm set-default-model       # Define modelo padrão global
llm change-model           # Troca modelo do projeto atual
```

### **Desenvolvimento Assistido**
```bash
llm chat                   # Chat conversacional com IA
llm create <tipo> <nome>   # Cria funcionalidades via IA
llm edit <arquivo> <inst>  # Edita arquivos com instruções
llm status                 # Status do projeto e modelo
```

### **Gerenciamento de Modelos**
```bash
llm list-models            # Lista modelos disponíveis
llm download <modelo>      # Baixa modelo via Ollama
llm remove <modelo>        # Remove modelo local
```

## 🔧 **Arquitetura Inteligente**

### **Sistema de Fallback**
```
Usuário → LLM CLI → MCP Integrado → Ollama
                ↓ (se falhar)
            Ollama Direto → Modelo Local
```

### **Módulos Principais**
- **🤖 ModelManager**: Orquestra modelos com fallback automático
- **📁 ProjectManager**: Gerenciamento inteligente de projetos
- **💬 ConversationManager**: Interface conversacional natural
- **🔌 MCPClient**: Cliente MCP com servidor integrado
- **📝 FileManager**: Operações de arquivo com histórico

## 🎯 **Casos de Uso**

### **Desenvolvedor Iniciando Novo Projeto**
```bash
cd meu-projeto-nodejs
llm init                    # Detecta Node.js, sugere modelo leve
llm chat                    # "Crie um servidor Express básico"
```

### **Desenvolvedor em Projeto Existente**
```bash
cd projeto-python
llm chat                    # "Adicione validação de dados na função X"
```

### **Equipe de Desenvolvimento**
```bash
llm init                    # Configura projeto para toda equipe
llm set-default-model       # Define modelo padrão da equipe
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

## 🔒 **Segurança e Privacidade**

- **100% Local**: Nenhum dado sai da sua máquina
- **Sem APIs Externas**: Funciona offline
- **Controle Total**: Você escolhe os modelos e configurações
- **Histórico Local**: Conversas ficam na sua máquina

## 🚀 **Próximos Passos**

1. **Instale a CLI**: `npm install -g llm-cli`
2. **Configure Ollama**: `ollama pull phi3:mini`
3. **Inicialize Projeto**: `llm init`
4. **Comece a Conversar**: `llm chat`

## 🤝 **Contribuindo**

Contribuições são bem-vindas! A CLI é open-source e aceita:
- 🐛 Reportes de bugs
- 💡 Sugestões de funcionalidades
- 🔧 Pull requests
- 📚 Melhorias na documentação

## 📄 **Licença**

MIT License - Veja [LICENSE](LICENSE) para detalhes.

## 🙏 **Agradecimentos**

- **Ollama** pela infraestrutura de modelos locais
- **Model Context Protocol** pelo padrão de comunicação
- **Comunidade open-source** por inspiração e suporte

---

**🎉 Transforme seu terminal em um assistente de IA inteligente e local!**
