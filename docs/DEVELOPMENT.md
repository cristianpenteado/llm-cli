# Guia de Desenvolvimento - LLM-CLI

## 🚀 Configuração do Ambiente

### Pré-requisitos
- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Git** para controle de versão
- **Editor**: VS Code recomendado com extensões TypeScript

### Extensões VS Code Recomendadas
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-jest"
  ]
}
```

### Configuração do Projeto
```bash
# Clone e setup
git clone https://github.com/llm-cli/llm-cli.git
cd llm-cli

# Instalar dependências
npm install

# Configurar pre-commit hooks (opcional)
npm run prepare

# Verificar configuração
npm run lint
npm run build
npm test
```

## 🏗️ Estrutura do Projeto

### Organização por Camadas (DDD)

```
src/
├── domain/                    # Regras de negócio
│   ├── agent/               # Domínio do agente IA
│   │   ├── Agent.ts         # Interface principal
│   │   ├── ConversationContext.ts # Contexto de conversa
│   │   └── interfaces.ts    # Interfaces do domínio
│   ├── communication/       # Comunicação com modelos
│   │   └── ModelProvider.ts # Interface de provedor
│   ├── configuration/       # Configuração do sistema
│   │   └── Configuration.ts # Estrutura de configuração
│   ├── search/             # Busca na web
│   │   └── WebSearch.ts     # Interface de busca
│   ├── interfaces.ts        # Interfaces compartilhadas
│   └── Logger.ts            # Interface de logging
├── application/             # Serviços de aplicação
│   ├── services/           # Implementação dos serviços
│   │   ├── AgentService.ts # Serviço principal do agente
│   │   └── WebSearchService.ts # Serviço de busca
│   └── ports/              # Interfaces para infraestrutura
│       ├── FileSystemService.ts # Operações de arquivo
│       └── Logger.ts        # Sistema de logs
└── infrastructure/          # Implementações concretas
    ├── cli/                # Interface de linha de comando
    │   └── CLI.ts          # Implementação principal da CLI
    ├── ollama/             # Integração com Ollama
    │   └── OllamaProvider.ts # Provedor Ollama
    ├── filesystem/         # Operações de arquivo
    │   └── NodeFileSystemService.ts # Implementação Node.js
    ├── logging/            # Sistema de logs
    │   └── ConsoleLogger.ts # Logger para console
    ├── configuration/      # Gerenciamento de configuração
    │   └── FileConfigurationRepository.ts # Repositório de arquivo
    ├── search/             # Implementações de busca
    │   └── DuckDuckGoProvider.ts # Provedor DuckDuckGo
    └── di/                 # Injeção de dependência
        └── Container.ts    # Container DI customizado
```

### Padrões de Nomenclatura

#### **Arquivos**
- **PascalCase** para classes e interfaces: `AgentService.ts`
- **camelCase** para métodos e propriedades: `processQuery()`
- **kebab-case** para arquivos de teste: `AgentService.test.ts`

#### **Classes e Interfaces**
- **Classes**: Sufixo descritivo: `AgentService`, `OllamaProvider`
- **Interfaces**: Sem sufixo: `Agent`, `ModelProvider`
- **Tipos**: Sufixo `Type` ou descritivo: `AgentResponse`, `FileNode`

#### **Métodos**
- **Verbos** para ações: `processQuery()`, `createPlan()`
- **Getters**: `getFormattedHistory()`, `isAvailable()`
- **Booleanos**: `isTechnicalQuestion()`, `hasComponents()`

## 🔧 Desenvolvimento

### Scripts NPM Disponíveis

```bash
# Desenvolvimento
npm run dev          # Executar com ts-node
npm run build        # Compilar TypeScript
npm run start        # Executar versão compilada
npm run clean        # Limpar dist/

# Testes
npm test             # Executar todos os testes
npm run test:watch   # Testes em modo watch
npm run test:coverage # Testes com cobertura

# Qualidade de Código
npm run lint         # Verificar ESLint
npm run lint:fix     # Corrigir problemas ESLint
npm run format       # Formatar código (se configurado)

# Build e Deploy
npm run prepublishOnly # Build e testes antes de publicar
```

### Fluxo de Desenvolvimento

#### **1. Nova Funcionalidade**
```bash
# Criar branch
git checkout -b feature/nova-funcionalidade

# Desenvolver
npm run dev          # Desenvolvimento local
npm run build        # Verificar compilação
npm test             # Executar testes

# Commit
git add .
git commit -m "feat: adiciona nova funcionalidade"
git push origin feature/nova-funcionalidade
```

#### **2. Correção de Bug**
```bash
# Criar branch
git checkout -b fix/correcao-bug

# Corrigir
npm run lint         # Verificar código
npm test             # Verificar testes
npm run build        # Verificar compilação

# Commit
git add .
git commit -m "fix: corrige bug específico"
git push origin fix/correcao-bug
```

#### **3. Refatoração**
```bash
# Criar branch
git checkout -b refactor/melhoria-codigo

# Refatorar
npm run lint         # Verificar estilo
npm test             # Verificar funcionalidade
npm run build        # Verificar compilação

# Commit
git add .
git commit -m "refactor: melhora estrutura do código"
git push origin refactor/melhoria-codigo
```

### Convenções de Commit

#### **Formato**
```
<tipo>(<escopo>): <descrição>

[corpo opcional]

[rodapé opcional]
```

#### **Tipos**
- **feat**: Nova funcionalidade
- **fix**: Correção de bug
- **docs**: Documentação
- **style**: Formatação de código
- **refactor**: Refatoração
- **test**: Adição/modificação de testes
- **chore**: Tarefas de build/configuração

#### **Exemplos**
```bash
git commit -m "feat(agent): adiciona detecção automática de intenções"
git commit -m "fix(cli): corrige erro de parsing de comandos"
git commit -m "docs: atualiza guia de desenvolvimento"
git commit -m "refactor(service): simplifica lógica de processamento"
```

## 🧪 Testes

### Estratégia de Testes

#### **Unit Tests**
- **Cobertura**: 100% para lógica de negócio
- **Mocks**: Dependências externas e serviços
- **Isolamento**: Cada teste independente

#### **Integration Tests**
- **Fluxo completo**: CLI → Agent → Ollama
- **Dependências reais**: Sistema de arquivos, configuração
- **Mocks**: Apenas serviços externos (Ollama)

#### **Estrutura de Testes**
```
src/__tests__/
├── setup.ts                 # Configuração global
├── unit/                    # Testes unitários
│   ├── AgentService.test.ts
│   └── OllamaProvider.test.ts
└── integration/             # Testes de integração
    └── CLI.integration.test.ts
```

### Escrevendo Testes

#### **Estrutura de Teste**
```typescript
describe('AgentService', () => {
  let agentService: AgentService;
  let mockModelProvider: jest.Mocked<ModelProvider>;
  let mockFileSystem: jest.Mocked<FileSystemService>;

  beforeEach(() => {
    // Setup dos mocks
    mockModelProvider = {
      generateResponse: jest.fn(),
      isAvailable: jest.fn()
    };
    
    mockFileSystem = {
      readDirectory: jest.fn(),
      exists: jest.fn()
    };

    agentService = new AgentService(
      mockModelProvider,
      mockFileSystem,
      mockConfig
    );
  });

  describe('processQuery', () => {
    it('should process a simple query successfully', async () => {
      // Arrange
      const query = 'Como criar um arquivo?';
      const mockResponse = {
        content: 'Esta é uma resposta de teste',
        type: 'technical'
      };
      mockModelProvider.generateResponse.mockResolvedValue(mockResponse);

      // Act
      const result = await agentService.processQuery(query);

      // Assert
      expect(result.content).toBe('Esta é uma resposta de teste');
      expect(['casual', 'technical', 'code']).toContain(result.type);
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      mockModelProvider.generateResponse.mockRejectedValue(new Error('Test error'));

      // Act & Assert
      const result = await agentService.processQuery('test');
      expect(result.type).toBe('error');
      expect(result.content).toContain('Erro ao processar consulta');
    });
  });
});
```

#### **Boas Práticas**
- **AAA Pattern**: Arrange, Act, Assert
- **Nomes descritivos**: `should handle errors gracefully`
- **Mocks específicos**: Apenas o necessário para o teste
- **Isolamento**: Cada teste independente
- **Cobertura**: Testar casos de sucesso e erro

### Executando Testes

#### **Comandos Básicos**
```bash
# Todos os testes
npm test

# Testes específicos
npm test -- --testNamePattern="AgentService"
npm test -- --testPathPattern="unit"

# Modo watch
npm run test:watch

# Com cobertura
npm run test:coverage
```

#### **Debug de Testes**
```bash
# Debug com Node.js
npm test -- --inspect-brk

# Debug com VS Code
# Adicione ao launch.json:
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## 🔍 Debugging

### Logs e Debug

#### **Níveis de Log**
```typescript
// No código
this.logger.debug('Iniciando processamento da query');
this.logger.info('Query processada com sucesso');
this.logger.warn('Modelo não disponível, usando fallback');
this.logger.error('Erro ao processar query', error);
```

#### **Configuração de Logs**
```yaml
# ~/.llm-cli/config.yaml
cli:
  logLevel: "debug"  # error|warn|info|debug
  showTimestamps: true
```

#### **Debug no VS Code**
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug LLM-CLI",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/index.ts",
      "runtimeArgs": ["-r", "ts-node/register"],
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal"
    }
  ]
}
```

### Troubleshooting

#### **Problemas Comuns**

**1. Erro de Compilação TypeScript**
```bash
# Verificar erros
npm run build

# Limpar e recompilar
npm run clean
npm run build
```

**2. Testes Falhando**
```bash
# Verificar configuração
npm test -- --verbose

# Limpar cache
npm test -- --no-cache
```

**3. Dependências Não Resolvidas**
```bash
# Limpar node_modules
rm -rf node_modules package-lock.json
npm install
```

**4. Problemas de Permissão**
```bash
# Verificar permissões
ls -la dist/
chmod +x dist/index.js
```

## 📦 Build e Deploy

### Processo de Build

#### **Build Local**
```bash
# Limpar build anterior
npm run clean

# Compilar TypeScript
npm run build

# Verificar arquivos gerados
ls -la dist/
```

#### **Verificação de Build**
```bash
# Testar versão compilada
npm run start

# Verificar dependências
npm ls --production
```

### Deploy

#### **Instalação Global**
```bash
# Build e instalação
npm run build
npm install -g .

# Verificação
llm --version
```

#### **Publicação no NPM**
```bash
# Login no NPM
npm login

# Publicar
npm publish

# Verificar
npm view llm-cli
```

## 🔧 Configuração de Desenvolvimento

### ESLint e Prettier

#### **Configuração ESLint**
```json
// .eslintrc.json
{
  "extends": [
    "@typescript-eslint/recommended",
    "@typescript-eslint/recommended-requiring-type-checking"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "prefer-const": "error"
  }
}
```

#### **Configuração Prettier**
```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

### Git Hooks

#### **Pre-commit**
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.ts": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

### VS Code Settings

#### **Configurações Recomendadas**
```json
// .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.suggest.autoImports": true
}
```

## 📚 Recursos Adicionais

### Documentação
- **[Arquitetura](ARCHITECTURE.md)**: Detalhes técnicos
- **[Guia Conversacional](CONVERSATIONAL-GUIDE.md)**: Como usar
- **[Changelog](CHANGELOG.md)**: Histórico de versões

### Ferramentas Úteis
- **TypeScript Playground**: Testar tipos online
- **Jest Documentation**: Guia completo de testes
- **ESLint Rules**: Regras e configurações

### Comunidade
- **GitHub Issues**: Reportar bugs e solicitar features
- **GitHub Discussions**: Discussões e perguntas
- **Pull Requests**: Contribuições são bem-vindas!

---

**Desenvolvido com ❤️ pela equipe LLM-CLI**
