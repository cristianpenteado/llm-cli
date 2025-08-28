# Exemplos de Uso da LLM CLI

Este arquivo contém exemplos práticos de como usar a LLM CLI em diferentes cenários de desenvolvimento.

## 🚀 Configuração Inicial

### 1. Detectar Hardware e Configurar
```bash
# Detectar hardware do sistema
llm detect-hardware

# Saída esperada:
# 📊 Hardware detectado:
#   CPU: Intel(R) Core(TM) i7-10700K CPU @ 3.80GHz (8 cores)
#   RAM: 32GB
#   GPU: NVIDIA GeForce RTX 3070 (8GB)
# 
# 🚀 Modelos recomendados:
#   1. deepseek-coder:6.7b-instruct - Modelo de código especializado
#   2. phi-3:3.8b-instruct - Modelo compacto e eficiente
#   3. codellama:7b-instruct - Modelo especializado em código

# Definir modelo padrão
llm set-default-model deepseek-coder:6.7b-instruct
```

### 2. Inicializar Primeiro Projeto
```bash
# Navegar para pasta do projeto
cd ~/projetos/meu-app-react

# Inicializar projeto (detecta TypeScript + React automaticamente)
llm init

# Saída esperada:
# 🚀 Inicializando novo projeto...
# 🔍 Primeira execução detectada. Analisando hardware...
# 💡 Modelos recomendados para seu hardware:
#   1. deepseek-coder:6.7b-instruct - Modelo de código especializado
# ✅ Projeto inicializado em: /home/user/projetos/meu-app-react
# 📁 Estrutura do projeto: TypeScript/React
# 🤖 Modelo configurado: deepseek-coder:6.7b-instruct
```

## 💬 Modo Conversacional

### 3. Iniciar Chat com IA
```bash
# Iniciar modo conversacional
llm chat

# Saída esperada:
# 💬 Iniciando modo conversacional...
# 🤖 Conectado ao modelo: deepseek-coder:6.7b-instruct
# 💡 Digite suas perguntas ou comandos. Use /help para ver comandos disponíveis.
# 🤖 > 
```

### 4. Comandos de Chat Disponíveis
```bash
# No modo conversacional, digite:
/help                    # Mostra todos os comandos disponíveis
/status                  # Status da sessão atual
/context                 # Mostra contexto do projeto
/change-model phi-3      # Troca para outro modelo
/clear                   # Limpa histórico da conversa
/save sessao-importante  # Salva conversa atual
/load sessao-importante  # Carrega conversa salva
/exit                    # Sai do chat
```

### 5. Exemplos de Conversas
```bash
# Exemplo 1: Criar testes
🤖 > Crie testes unitários para o componente UserProfile

# A CLI irá:
# 1. Analisar o código existente
# 2. Gerar testes apropriados
# 3. Pedir confirmação antes de aplicar
# 4. Criar backups automáticos

# Exemplo 2: Refatorar código
🤖 > Converta o componente UserProfile para hooks funcionais

# Exemplo 3: Criar nova funcionalidade
🤖 > Crie um sistema de autenticação com JWT
```

## 🔧 Comandos de Desenvolvimento

### 6. Criar Funcionalidades
```bash
# Criar testes
llm create test UserProfile -d "Testes unitários para componente de perfil do usuário"

# Criar módulo
llm create module auth -d "Sistema de autenticação com JWT e refresh tokens"

# Criar componente
llm create component DataTable -d "Tabela de dados com paginação e filtros"

# Criar serviço
llm create service api -d "Serviço para comunicação com API REST"
```

### 7. Editar Arquivos
```bash
# Editar arquivo com instrução específica
llm edit src/components/UserProfile.tsx "Adicione validação de formulário e tratamento de erros"

# Editar arquivo para refatoração
llm edit src/services/auth.ts "Converta para usar async/await e adicione tratamento de erros"

# Editar arquivo para otimização
llm edit src/utils/helpers.ts "Otimize as funções de formatação de data e moeda"
```

### 8. Gerenciar Modelos
```bash
# Listar modelos disponíveis
llm list-models

# Trocar modelo do projeto atual
llm change-model -m phi-3:3.8b-instruct

# Ver status do projeto
llm status
```

## 📁 Gerenciamento de Projetos

### 9. Inicializar Diferentes Tipos de Projeto
```bash
# Projeto React/TypeScript
cd ~/projetos/react-app
llm init

# Projeto Node.js/Express
cd ~/projetos/api-backend
llm init

# Projeto Python/Django
cd ~/projetos/django-app
llm init

# Projeto Go/Gin
cd ~/projetos/go-api
llm init
```

### 10. Configurações por Projeto
```bash
# Cada projeto terá sua configuração em .llm-cli/project.json
{
  "path": "/home/user/projetos/react-app",
  "name": "react-app",
  "language": "TypeScript",
  "framework": "React",
  "model": "deepseek-coder:6.7b-instruct",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## 🔄 Sistema de Rollback

### 11. Desfazer Alterações
```bash
# Desfazer última alteração
llm rollback

# Desfazer múltiplas alterações
llm rollback -n 3

# Ver histórico de alterações
# (disponível no comando /status no modo conversacional)
```

### 12. Sistema de Backups
```bash
# Backups são criados automaticamente em .llm-cli/backups/
# Formato: arquivo.timestamp.backup

# Listar backups disponíveis
# (funcionalidade disponível via FileManager)

# Restaurar de backup específico
# (funcionalidade disponível via FileManager)
```

## 🎯 Cenários de Uso Comuns

### 13. Desenvolvimento de API
```bash
# 1. Inicializar projeto
cd ~/projetos/api-rest
llm init

# 2. Iniciar chat para desenvolvimento
llm chat

# 3. Solicitar criação de endpoints
🤖 > Crie endpoints CRUD para usuários com validação e autenticação

# 4. Solicitar testes
🤖 > Crie testes de integração para os endpoints de usuários

# 5. Solicitar documentação
🤖 > Gere documentação OpenAPI/Swagger para a API
```

### 14. Desenvolvimento Frontend
```bash
# 1. Inicializar projeto React
cd ~/projetos/react-dashboard
llm init

# 2. Solicitar criação de componentes
🤖 > Crie um dashboard responsivo com gráficos e tabelas

# 3. Solicitar otimização
🤖 > Otimize o componente de gráficos para melhor performance

# 4. Solicitar testes
🤖 > Crie testes para os componentes do dashboard
```

### 15. Refatoração de Código
```bash
# 1. Identificar arquivo para refatorar
llm edit src/legacy/auth.js "Converta para TypeScript e use padrões modernos"

# 2. Aplicar mudanças sugeridas
# (a CLI pedirá confirmação)

# 3. Verificar resultado
llm status

# 4. Se necessário, fazer rollback
llm rollback
```

## 🔧 Configurações Avançadas

### 16. Configuração MCP
```bash
# Editar ~/.llm-cli/config.json
{
  "mcpConfig": {
    "serverUrl": "http://localhost",
    "port": 8000,
    "protocol": "http",
    "timeout": 30000
  }
}
```

### 17. Configuração Ollama
```bash
# Editar ~/.llm-cli/config.json
{
  "ollamaConfig": {
    "modelsPath": "~/.local/share/ollama/models",
    "serverUrl": "http://localhost",
    "port": 11434,
    "maxMemory": 8192,
    "gpuEnabled": true
  }
}
```

## 🚨 Solução de Problemas

### 18. Problemas Comuns
```bash
# Erro: "Modelo não encontrado"
llm list-models                    # Verificar modelos disponíveis
llm detect-hardware               # Verificar compatibilidade

# Erro: "Falha ao conectar ao servidor MCP"
# Verificar se o servidor MCP está rodando
# Verificar configuração em ~/.llm-cli/config.json

# Erro: "Hardware não detectado"
llm detect-hardware               # Executar detecção manual
# Verificar permissões de sistema

# Erro: "Projeto não inicializado"
llm init                          # Inicializar projeto
# Verificar se está na pasta correta
```

### 19. Logs e Debug
```bash
# Ver logs detalhados
# A CLI mostra logs informativos durante operações

# Verificar configuração
cat ~/.llm-cli/config.json

# Verificar projeto atual
cat .llm-cli/project.json
```

## 📚 Dicas e Melhores Práticas

### 20. Dicas de Uso
- **Use comandos específicos**: Seja claro nas instruções para o modelo
- **Confirme mudanças**: Sempre revise as mudanças antes de aplicar
- **Mantenha contexto**: Use o chat para manter contexto entre sessões
- **Faça backups**: O sistema cria backups automáticos, mas mantenha controle de versão
- **Teste modelos**: Experimente diferentes modelos para encontrar o melhor para seu caso

### 21. Fluxo de Trabalho Recomendado
```bash
# 1. Configuração inicial
llm detect-hardware
llm set-default-model <modelo-recomendado>

# 2. Por projeto
cd projeto/
llm init
llm chat

# 3. Desenvolvimento iterativo
# - Use chat para discussões e planejamento
# - Use comandos específicos para ações precisas
# - Revise mudanças antes de aplicar
# - Use rollback quando necessário

# 4. Manutenção
llm status                    # Verificar status
llm list-models              # Verificar modelos
# Limpar conversas antigas periodicamente
```

---

**💡 Dica**: A LLM CLI é mais eficaz quando você combina o modo conversacional para discussões e comandos específicos para ações precisas. Use o chat para entender o contexto e os comandos para executar mudanças específicas.
