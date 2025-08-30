# Guia de Uso Conversacional - LLM-CLI

## Como Conversar com o Assistente

O LLM-CLI agora funciona como um chat natural. Não há comandos especiais - apenas converse!

## Tipos de Conversa

### 📚 **Perguntas Conceituais**
Faça qualquer pergunta sobre programação, tecnologias ou desenvolvimento:

```
> Como funciona JWT?
> Qual a diferença entre REST e GraphQL?
> Explique o padrão Repository
> O que é Clean Architecture?
> Como implementar autenticação segura?
```

**O que acontece**: O assistente responde diretamente com explicações detalhadas.

### 🛠️ **Solicitações de Implementação**
Peça para implementar, criar ou desenvolver algo:

```
> Quero criar uma API REST com Express
> Implementa autenticação no meu projeto
> Fazer um sistema de login completo
> Configurar TypeScript no projeto
> Adicionar testes unitários
> Criar um CRUD de usuários
```

**O que acontece**:
1. 🎯 **Detecção automática**: "Detectei uma solicitação de implementação!"
2. ❓ **Pergunta**: "Quer que eu crie um plano detalhado para isso?"
3. ✅ **Plano criado**: Mostra passos detalhados
4. ❓ **Execução**: "Executar o plano agora?"
5. 🚀 **Execução com confirmações**: Cada passo pede [sim/skip/stop]

### ⚡ **Comandos Sugeridos**
O assistente pode sugerir comandos do terminal:

```
> Configurar projeto Node.js
💬 Resposta: [Explicação...]
💡 Comandos sugeridos:
  • npm init -y
  • npm install express
  • npm install -D typescript @types/node
Executar os comandos sugeridos? [s/n]:
```

## Palavras-chave que Ativam Implementação

O sistema detecta automaticamente quando você quer implementar algo:

### **Verbos de Ação**
- `implementar` - "Implementa autenticação JWT"
- `criar` - "Criar uma API REST"
- `fazer` - "Fazer um sistema de login"
- `desenvolver` - "Desenvolver um CRUD"
- `construir` - "Construir uma aplicação web"
- `gerar` - "Gerar testes para este código"

### **Verbos de Configuração**
- `adicionar` - "Adicionar middleware de CORS"
- `incluir` - "Incluir validação de dados"
- `setup` - "Setup do ambiente de desenvolvimento"
- `configurar` - "Configurar banco de dados"
- `instalar` - "Instalar dependências necessárias"

## Exemplos Práticos

### **Exemplo 1: Pergunta Conceitual**
```
Usuário: Como funciona o padrão MVC?

Assistente: 
💬 Resposta:
O padrão MVC (Model-View-Controller) é uma arquitetura que separa...
[Explicação detalhada]
```

### **Exemplo 2: Implementação Simples**
```
Usuário: Criar um servidor Express básico

🤔 Processando...
💬 Resposta: Vou criar um servidor Express básico para você...

🎯 Detectei uma solicitação de implementação!
❓ Quer que eu crie um plano detalhado para isso? [s/n]: s

✅ Plano criado: Servidor Express Básico
📝 Passos:
  ▶️ 1. Inicializar projeto Node.js
     Criar package.json e estrutura básica
  ⏸️ 2. Instalar Express
     npm install express
  ⏸️ 3. Criar servidor básico
     Arquivo server.js com rotas essenciais

❓ Executar o plano agora? [s/n]: s

🚀 Executando plano...
📍 Passo 1: Inicializar projeto Node.js
Executar este passo? [sim/skip/stop]: sim
✅ Passo concluído
```

### **Exemplo 3: Comandos Sugeridos**
```
Usuário: Configurar TypeScript no projeto

💬 Resposta: Para configurar TypeScript, precisamos instalar as dependências...

💡 Comandos sugeridos:
  • npm install -D typescript @types/node
  • npx tsc --init
  • npm install -D ts-node nodemon

Executar os comandos sugeridos? [s/n]: s

⚡ Executando: npm install -D typescript @types/node
✅ Comando executado
⚡ Executando: npx tsc --init
✅ Comando executado
```

## Comandos Básicos

Apenas 3 comandos especiais existem:

- `help` - Mostra ajuda sobre como usar
- `clear` - Limpa a tela
- `exit` - Sair do programa

**Tudo mais é conversa natural!**

## Dicas de Uso

### ✅ **Boas Práticas**
- **Seja específico**: "Criar API REST com autenticação JWT" é melhor que "fazer API"
- **Contextualize**: "Adicionar testes ao meu projeto React" vs "fazer testes"
- **Use linguagem natural**: Fale como falaria com um colega desenvolvedor

### ❌ **Evite**
- Comandos antigos como `plan`, `execute`, `status` (não existem mais)
- Linguagem muito técnica desnecessária
- Pedidos muito vagos como "fazer algo"

### 💡 **Truques**
- **Iteração**: Após uma implementação, peça melhorias: "Adiciona validação a essa API"
- **Explicação**: "Explica esse código que você gerou"
- **Alternativas**: "Tem uma forma melhor de fazer isso?"

## Fluxo de Trabalho Típico

```
1. 💬 Conversa inicial
   "Quero criar um sistema de autenticação"

2. 🎯 Detecção automática
   Sistema detecta intenção de implementação

3. 📋 Criação de plano
   Plano detalhado com passos específicos

4. 🚀 Execução guiada
   Cada passo com confirmação [sim/skip/stop]

5. ⚡ Comandos sugeridos
   Execução de comandos do sistema com aprovação

6. 🔄 Iteração
   Melhorias e ajustes conforme necessário
```

## Personalização

O assistente adapta-se à sua personalidade configurada:

- **helpful** (padrão): Amigável e prestativo
- **concise**: Respostas mais diretas
- **detailed**: Explicações mais profundas
- **creative**: Soluções mais inovadoras

Configure em `~/.llm-cli/config.yaml`:
```yaml
agent:
  personality: "helpful"
```

## Solução de Problemas

### **Assistente não detecta implementação**
- Use palavras-chave mais claras: "criar", "implementar", "fazer"
- Seja mais específico sobre o que quer

### **Muitas perguntas de confirmação**
- Configure `autoConfirm: true` para pular algumas confirmações
- Use "skip" para pular passos desnecessários

### **Comandos não executam**
- Verifique se tem permissões necessárias
- Comandos são simulados por padrão (implementação real em desenvolvimento)

### **Respostas muito longas/curtas**
- Ajuste `personality` na configuração
- Peça especificamente: "resposta mais curta" ou "explique melhor"
