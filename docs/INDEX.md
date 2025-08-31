# 📚 Índice da Documentação - LLM-CLI

## 🚀 Documentação Principal

### **[README.md](README.md)** - Visão Geral do Projeto
- **Descrição**: Documentação principal com visão geral, instalação e uso básico
- **Conteúdo**: 
  - Características principais
  - Casos de uso
  - Instalação e configuração
  - Exemplos práticos
  - Arquitetura geral
  - Contribuição e suporte

### **[ARCHITECTURE.md](ARCHITECTURE.md)** - Arquitetura Técnica
- **Descrição**: Documentação detalhada da arquitetura e decisões técnicas
- **Conteúdo**:
  - Princípios arquiteturais (DDD, Clean Architecture)
  - Estrutura de camadas
  - Domínios e responsabilidades
  - Fluxos principais
  - Configuração
  - Testes e métricas

### **[CONVERSATIONAL-GUIDE.md](CONVERSATIONAL-GUIDE.md)** - Guia de Uso
- **Descrição**: Como usar o chat conversacional do LLM-CLI
- **Conteúdo**:
  - Tipos de conversa
  - Palavras-chave detectadas
  - Exemplos práticos
  - Fluxo de trabalho
  - Dicas e truques
  - Solução de problemas

### **[CHANGELOG.md](CHANGELOG.md)** - Histórico de Versões
- **Descrição**: Registro completo de mudanças e evolução do projeto
- **Conteúdo**:
  - Versão atual (2.0.0)
  - Breaking changes
  - Novas funcionalidades
  - Correções e melhorias
  - Métricas e estatísticas

## 🔧 Documentação de Desenvolvimento

### **[DEVELOPMENT.md](DEVELOPMENT.md)** - Guia de Desenvolvimento
- **Descrição**: Guia completo para desenvolvedores
- **Conteúdo**:
  - Configuração do ambiente
  - Estrutura do projeto
  - Padrões de nomenclatura
  - Scripts e comandos
  - Fluxo de desenvolvimento
  - Convenções de commit
  - Testes e debugging
  - Build e deploy

### **[API.md](API.md)** - Referência da API
- **Descrição**: Documentação completa de todas as interfaces e classes
- **Conteúdo**:
  - Domain Layer (interfaces principais)
  - Application Layer (serviços e ports)
  - Infrastructure Layer (implementações)
  - Tipos compartilhados
  - Exemplos de uso
  - Padrões de design

## 📖 Como Navegar na Documentação

### **Para Usuários Finais**
1. **Comece com**: [README.md](README.md) - Visão geral e instalação
2. **Aprenda a usar**: [CONVERSATIONAL-GUIDE.md](CONVERSATIONAL-GUIDE.md) - Como conversar com o assistente
3. **Configure**: Seção de configuração no README
4. **Resolva problemas**: Seção de troubleshooting no README

### **Para Desenvolvedores**
1. **Entenda a arquitetura**: [ARCHITECTURE.md](ARCHITECTURE.md) - Visão técnica
2. **Configure o ambiente**: [DEVELOPMENT.md](DEVELOPMENT.md) - Setup e desenvolvimento
3. **Consulte a API**: [API.md](API.md) - Interfaces e classes
4. **Contribua**: Seção de contribuição no README

### **Para Contribuidores**
1. **Leia o guia de desenvolvimento**: [DEVELOPMENT.md](DEVELOPMENT.md)
2. **Entenda a arquitetura**: [ARCHITECTURE.md](ARCHITECTURE.md)
3. **Consulte a API**: [API.md](API.md)
4. **Siga as convenções**: Padrões de código e commit

## 🎯 Seções por Tipo de Usuário

### **👤 Usuário Final**
- [README.md](README.md) - Instalação e uso básico
- [CONVERSATIONAL-GUIDE.md](CONVERSATIONAL-GUIDE.md) - Como usar o chat
- [CHANGELOG.md](CHANGELOG.md) - O que mudou

### **👨‍💻 Desenvolvedor**
- [ARCHITECTURE.md](ARCHITECTURE.md) - Entender a estrutura
- [DEVELOPMENT.md](DEVELOPMENT.md) - Configurar e desenvolver
- [API.md](API.md) - Referência técnica

### **🔧 Contribuidor**
- [DEVELOPMENT.md](DEVELOPMENT.md) - Guia completo
- [ARCHITECTURE.md](ARCHITECTURE.md) - Decisões técnicas
- [README.md](README.md) - Visão geral do projeto

## 📋 Estrutura da Documentação

```
docs/
├── INDEX.md                    # Este arquivo - Índice principal
├── README.md                   # Documentação principal
├── ARCHITECTURE.md             # Arquitetura técnica
├── CONVERSATIONAL-GUIDE.md     # Guia de uso
├── DEVELOPMENT.md              # Guia de desenvolvimento
├── API.md                      # Referência da API
└── CHANGELOG.md                # Histórico de versões
```

## 🔍 Busca Rápida

### **Por Funcionalidade**
- **Chat conversacional**: [CONVERSATIONAL-GUIDE.md](CONVERSATIONAL-GUIDE.md)
- **Detecção automática**: [CONVERSATIONAL-GUIDE.md](CONVERSATIONAL-GUIDE.md#palavras-chave-que-ativam-implementação)
- **Planejamento**: [CONVERSATIONAL-GUIDE.md](CONVERSATIONAL-GUIDE.md#fluxo-de-trabalho-típico)
- **Configuração**: [README.md](README.md#configuração)

### **Por Técnica**
- **Arquitetura DDD**: [ARCHITECTURE.md](ARCHITECTURE.md#domain-driven-design-ddd)
- **Clean Architecture**: [ARCHITECTURE.md](ARCHITECTURE.md#clean-architecture)
- **Injeção de dependência**: [ARCHITECTURE.md](ARCHITECTURE.md#container-di)
- **Testes**: [DEVELOPMENT.md](DEVELOPMENT.md#testes)

### **Por Problema**
- **Erro de compilação**: [DEVELOPMENT.md](DEVELOPMENT.md#erro-de-compilação-typescript)
- **Testes falhando**: [DEVELOPMENT.md](DEVELOPMENT.md#testes-falhando)
- **ConversationContext not found**: [README.md](README.md#erro-service-conversationcontext-not-found)
- **Ollama não responde**: [README.md](README.md#ollama-não-responde)

## 📚 Recursos Adicionais

### **Documentação Externa**
- **TypeScript**: [Documentação oficial](https://www.typescriptlang.org/docs/)
- **Jest**: [Guia de testes](https://jestjs.io/docs/getting-started)
- **Ollama**: [Documentação oficial](https://ollama.ai/docs)

### **Ferramentas de Desenvolvimento**
- **VS Code**: Editor recomendado com extensões TypeScript
- **ESLint**: Linting e formatação de código
- **Prettier**: Formatação automática
- **Git**: Controle de versão

### **Comunidade**
- **GitHub Issues**: Reportar bugs e solicitar features
- **GitHub Discussions**: Discussões e perguntas
- **Pull Requests**: Contribuições são bem-vindas

## 🆕 Atualizações Recentes

### **v2.0.0** - Rebuild Completo
- **Arquitetura DDD** implementada
- **Chat conversacional** substituiu comandos
- **Comunicação direta Ollama** ao invés de MCP
- **Documentação completa** criada

### **Próximas Atualizações**
- Implementação real de execução de comandos
- Salvamento automático de arquivos
- Integração com Git
- Interface web opcional

## 💡 Dicas de Uso

### **Para Usuários**
- Comece com perguntas simples para testar
- Use palavras-chave claras para implementações
- Configure a personalidade do agente conforme sua preferência
- Mantenha o Ollama atualizado

### **Para Desenvolvedores**
- Siga os padrões de código estabelecidos
- Escreva testes para novas funcionalidades
- Documente mudanças na API
- Use branches para features e correções

### **Para Contribuidores**
- Leia o guia de desenvolvimento completo
- Siga as convenções de commit
- Teste suas mudanças localmente
- Abra issues para discussões

---

**📚 Documentação completa do LLM-CLI v2.0.0**

*Última atualização: Janeiro 2025*
