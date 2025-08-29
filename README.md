# LLM CLI

> **AI Agent Terminal** - Desenvolvido para a comunidade ❤️

Uma CLI inteligente que funciona como um agente de IA local, integrando-se diretamente com modelos LLM locais via Ollama. A CLI agora inclui um servidor MCP integrado e otimizações de performance para respostas ultra-rápidas.

## 🚀 Características Principais

### ✨ **Performance Otimizada**
- **Cache inteligente** de respostas e modelos para respostas instantâneas
- **Timeouts configuráveis** para evitar esperas longas
- **Processamento assíncrono** para melhor responsividade
- **Fallback automático** entre MCP e Ollama direto

### 🤖 **Modelo Padrão Automático**
- **Download automático** do `phi3:mini` na primeira inicialização
- **Verificação inteligente** de modelos disponíveis
- **Fallback automático** para download quando necessário
- **Inicialização automática** do OllamaManager

### 🔌 **Arquitetura Integrada**
- **Servidor MCP integrado** (não depende de processos externos)
- **Comunicação direta** com Ollama para máxima velocidade
- **Cache em memória** para operações repetidas
- **Otimizações de rede** para modelos locais

### 🎯 **Funcionalidades Inteligentes**
- **Detecção automática** de linguagem e framework do projeto
- **Contexto inteligente** baseado na estrutura do projeto
- **Sugestões contextuais** para melhor produtividade
- **Interface conversacional** natural e intuitiva

## 📦 Instalação

### Pré-requisitos
- **Node.js** 18+ 
- **Ollama** instalado e configurado

### Instalar CLI
```bash
# Instalar globalmente
npm install -g llm-cli

# Ou usar npx
npx llm-cli
```

### Instalar Ollama
```bash
# Linux/macOS
curl -fsSL https://ollama.ai/install.sh | sh

# Windows
# Baixar de https://ollama.ai/download
```

## 🚀 Uso Rápido

### 1. **Inicializar Projeto** (Download automático do phi3:mini)
```bash
cd seu-projeto
llm init
# ✅ phi3:mini será baixado automaticamente se não existir
```

### 2. **Iniciar Chat** (Respostas ultra-rápidas)
```bash
llm chat
# ⚡ Cache inteligente para respostas instantâneas
# 🔄 Fallback automático se MCP falhar
```

### 3. **Comandos Principais**
```bash
llm init          # Inicializar projeto (baixa modelo padrão)
llm chat          # Chat conversacional otimizado
llm status        # Status do projeto e modelo
llm list-models   # Listar modelos disponíveis
llm change-model  # Trocar modelo do projeto
```

## 🎯 Casos de Uso

### **Desenvolvedores**
- **Code Review** rápido com contexto do projeto
- **Debugging** assistido por IA
- **Refatoração** inteligente de código
- **Documentação** automática

### **Arquitetos**
- **Análise** de estrutura de projetos
- **Recomendações** de padrões
- **Otimizações** de performance
- **Migrações** assistidas

### **DevOps**
- **Análise** de logs e métricas
- **Automação** de processos
- **Troubleshooting** inteligente
- **Monitoramento** proativo

## ⚡ Otimizações de Performance

### **Cache Inteligente**
- **Respostas em cache** por 30 segundos
- **Modelos em cache** por 10 segundos
- **Hash de prompts** para identificação única
- **Limpeza automática** de cache expirado

### **Timeouts Configuráveis**
- **Resposta do modelo**: 30 segundos
- **Download de modelo**: 5 minutos
- **Listagem de modelos**: 5 segundos
- **Inicialização**: 10 segundos

### **Processamento Assíncrono**
- **Modelos em background** para não bloquear
- **Cache limpo** em paralelo
- **Verificações não-bloqueantes** de status
- **Fallbacks automáticos** para melhor UX

## 🔧 Configuração

### **Modelo Padrão**
```bash
# O phi3:mini é baixado automaticamente
# Para usar outros modelos:
ollama pull nome-do-modelo
llm change-model nome-do-modelo
```

### **Cache e Performance**
```bash
# Limpar cache manualmente
llm clear-cache

# Ver estatísticas
llm status
```

## 🏗️ Arquitetura

### **Componentes Principais**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   LLMCLI        │    │  OllamaManager  │    │   MCPServer     │
│   (Orquestrador)│◄──►│  (Cache + MCP)  │◄──►│  (Integrado)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ProjectManager   │    │  Conversation   │    │   FileManager   │
│(Projetos)      │    │  Manager        │    │  (Arquivos)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Fluxo de Performance**
1. **Cache Check** → Resposta instantânea se disponível
2. **MCP Integrado** → Comunicação direta sem processos externos
3. **Ollama Fallback** → Resposta direta se MCP falhar
4. **Cache Update** → Armazenar para futuras consultas

## 🚀 Modelos Recomendados

### **Modelo Padrão (Automático)**
- **`phi3:mini`** - Leve, rápido, ideal para desenvolvimento

### **Modelos Adicionais**
- **`llama3.2:3b`** - Equilibrado entre velocidade e qualidade
- **`mistral:7b`** - Excelente para código e documentação
- **`codellama:7b`** - Especializado em desenvolvimento

> **💡 Dica**: O `phi3:mini` é baixado automaticamente. Para outros modelos, use `ollama pull nome-do-modelo`

## 🔍 Troubleshooting

### **Modelo não encontrado**
```bash
# Baixar manualmente
ollama pull nome-do-modelo

# Ou usar modelo padrão
llm change-model phi3:mini
```

### **Performance lenta**
```bash
# Limpar cache
llm clear-cache

# Verificar status
llm status
```

### **Erro de conexão**
```bash
# Verificar Ollama
ollama list

# Reiniciar servidor
ollama serve
```

## 🤝 Contribuição

### **Como Contribuir**
1. **Fork** o projeto
2. **Crie** uma branch para sua feature
3. **Commit** suas mudanças
4. **Push** para a branch
5. **Abra** um Pull Request

### **Áreas de Melhoria**
- **Novos modelos** de IA
- **Otimizações** de performance
- **Integrações** com outras ferramentas
- **Testes** e documentação

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🙏 Agradecimentos

- **Ollama** pela plataforma de modelos locais
- **Comunidade open-source** pelo suporte contínuo
- **Contribuidores** que tornaram este projeto possível

---

**⭐ Se este projeto te ajudou, considere dar uma estrela!**

**💬 Dúvidas? Abra uma issue ou participe das discussões!**

**🚀 Desenvolvido para a comunidade ❤️**
