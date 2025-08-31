import { Agent, AgentResponse, TaskPlan, TaskStep, ConfirmationResult, StepResult, ProjectContext, CodeSpecification, CodeResult, FileNode, ProjectAnalysis } from '../../domain/agent/Agent';
import { ModelProvider } from '../../domain/communication/ModelProvider';
import { Configuration } from '../../domain/configuration/Configuration';
import { ConversationContext } from '../../domain/agent/ConversationContext';
import { FileSystemService } from '../ports/FileSystemService';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';

export class AgentService implements Agent {
  private conversationContext: ConversationContext;

  constructor(
    private modelProvider: ModelProvider,
    private fileSystem: FileSystemService,
    private config: Configuration
  ) {
    this.conversationContext = new ConversationContext(5); // Mantém histórico das últimas 5 mensagens
  }

  private buildSystemPrompt(): string {
    return `Você é ${this.config.agent.name}, um assistente de programação versátil e experiente.

# Diretrizes de Resposta
1. Seja natural e conversacional em português brasileiro
2. Forneça respostas diretas e objetivas
3. Use markdown para formatar respostas

# Comportamento
- Responda de forma amigável e profissional
- Seja conciso e vá direto ao ponto
- Ao gerar código, use a linguagem solicitada ou a mais adequada ao contexto

# Geração de Código
- Use a linguagem de programação mais adequada ao contexto ou a solicitada
- Inclua comentários explicativos quando necessário
- Siga as melhores práticas da linguagem
- Considere casos de borda e tratamento de erros
- Formate o código com destaque de sintaxe apropriado

# Formato de Resposta para Código
\`\`\`linguagem
// código aqui
\`\`\`

Explicação: 1-2 frases sobre o código`;
  }

  private isCasualGreeting(content: string): boolean {
    const greetings = ['oi', 'olá', 'eae', 'opa', 'oie', 'fala aí', 'bom dia', 'boa tarde', 'boa noite'];
    const normalized = content.toLowerCase().trim().replace(/[^\w\s]/g, '');
    return greetings.some(greeting => normalized.startsWith(greeting));
  }

  private isTechnicalQuestion(content: string): boolean {
    const techKeywords = ['como', 'por que', 'quando', 'o que é', 'explique', 'ajuda com', 'ajuda em', 'erro', 'problema'];
    const normalized = content.toLowerCase();
    return techKeywords.some(keyword => normalized.includes(keyword));
  }

  private isCodeRequest(content: string): boolean {
    // Só detecta como código se a resposta CONTÉM código real (```)
    // Não baseado em palavras-chave da pergunta
    return content.includes('```') && (
      content.includes('```javascript') ||
      content.includes('```typescript') ||
      content.includes('```python') ||
      content.includes('```java') ||
      content.includes('```html') ||
      content.includes('```css') ||
      content.includes('```sql') ||
      content.includes('```json') ||
      content.includes('```bash') ||
      content.includes('```shell') ||
      content.includes('```yaml') ||
      content.includes('```xml') ||
      content.includes('```php') ||
      content.includes('```go') ||
      content.includes('```rust') ||
      content.includes('```cpp') ||
      content.includes('```c#') ||
      content.includes('```ruby') ||
      content.includes('```swift') ||
      content.includes('```kotlin')
    );
  }

  private isImplementationRequest(content: string): boolean {
    // Palavras-chave que indicam que o usuário quer IMPLEMENTAR algo
    const implementationKeywords = [
      'criar', 'fazer', 'implementar', 'desenvolver', 'construir', 'gerar',
      'adicionar', 'incluir', 'setup', 'configurar', 'instalar', 'montar',
      'escrever', 'programar', 'codificar', 'estruturar', 'organizar'
    ];
    
    // Palavras-chave que indicam que é apenas uma PERGUNTA
    const questionKeywords = [
      'como funciona', 'o que é', 'explique', 'entenda', 'diferenca',
      'quando usar', 'por que', 'qual', 'quem', 'onde', 'quando'
    ];
    
    const normalized = content.toLowerCase();
    
    // Se contém palavras de implementação E não é apenas uma pergunta
    const hasImplementationIntent = implementationKeywords.some(keyword => 
      normalized.includes(keyword)
    );
    
    const isJustQuestion = questionKeywords.some(keyword => 
      normalized.includes(keyword) && !hasImplementationIntent
    );
    
    // Retorna true se tem intenção de implementação e não é apenas pergunta
    return hasImplementationIntent && !isJustQuestion;
  }

  private isProjectAnalysisRequest(content: string): boolean {
    const analysisKeywords = ['analisar', 'entender', 'projeto', 'estrutura', 'pasta', 'arquivo'];
    const normalized = content.toLowerCase();
    return analysisKeywords.some(keyword => normalized.includes(keyword));
  }

  private determineResponseType(content: string): 'casual' | 'technical' | 'code' | 'plan' | 'analysis' | 'error' {
    if (this.isCasualGreeting(content)) {
      return 'casual';
    }
    if (this.isImplementationRequest(content)) {
      return 'plan'; // Se quer implementar, retorna 'plan' para criar plano
    }
    if (this.isCodeRequest(content)) {
      return 'code';
    }
    if (this.isProjectAnalysisRequest(content)) {
      return 'analysis';
    }
    if (content.toLowerCase().includes('plano:') || content.toLowerCase().includes('passo')) {
      return 'plan';
    }
    return this.isTechnicalQuestion(content) ? 'technical' : 'casual';
  }

  async analyzeProjectStructure(path: string = process.cwd()): Promise<ProjectAnalysis> {
    try {
      // Lê a estrutura do diretório atual
      const structure = await this.fileSystem.readDirectory(path, true);
      // Filtra diretórios excluídos
      const filteredStructure = structure.filter(node => 
        !['node_modules', '.git', 'dist', 'build', 'coverage'].some(
          exclude => node.path.includes(`/${exclude}/`) || node.path.endsWith(`/${exclude}`)
        )
      );

      // Analisa tecnologias baseado nos arquivos encontrados
      const technologies = this.detectTechnologies(filteredStructure);
      
      // Identifica pontos de entrada (ex: package.json, main.ts, app.js, etc.)
      const entryPoints = this.findEntryPoints(filteredStructure);
      
      // Extrai dependências do package.json se existir
      const dependencies = await this.extractDependencies(path);
      
      // Gera um resumo da análise
      const summary = this.generateAnalysisSummary(filteredStructure, technologies, entryPoints);
      
      return {
        files: this.extractFilePaths(filteredStructure),
        structure,
        technologies,
        entryPoints,
        dependencies: Object.fromEntries(dependencies.map(dep => [dep, '*'])),
        designPatterns: this.identifyDesignPatterns(filteredStructure),
        summary
      };
      
    } catch (error) {
      console.error('Erro ao analisar a estrutura do projeto:', error);
      throw new Error('Não foi possível analisar a estrutura do projeto');
    }
  }

  private detectTechnologies(structure: FileNode[]): string[] {
    const techs = new Set<string>();
    
    const checkFiles = (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.type === 'file') {
          if (node.name.endsWith('.ts') || node.name.endsWith('.tsx')) {
            techs.add('TypeScript');
            if (node.name.endsWith('.tsx') || node.name.endsWith('.jsx')) {
              techs.add('React');
            }
          } else if (node.name.endsWith('.js')) {
            techs.add('JavaScript');
          } else if (node.name.endsWith('.vue')) {
            techs.add('Vue.js');
          } else if (node.name.endsWith('.svelte')) {
            techs.add('Svelte');
          } else if (node.name === 'package.json') {
            techs.add('Node.js');
          } else if (node.name === 'requirements.txt') {
            techs.add('Python');
          } else if (node.name === 'pom.xml') {
            techs.add('Java');
          }
        } else if (node.type === 'directory' && node.children) {
          checkFiles(node.children);
        }
      }
    };

    checkFiles(structure);
    return Array.from(techs);
  }

  private findEntryPoints(structure: FileNode[]): string[] {
    const entryPoints: string[] = [];
    
    // Procura por arquivos de entrada comuns
    const commonEntryPoints = [
      'main.ts', 'index.ts', 'app.ts', 'server.ts',
      'main.js', 'index.js', 'app.js', 'server.js',
      'App.tsx', 'App.jsx', 'main.tsx', 'main.jsx'
    ];
    
    structure.forEach(node => {
      if (node.type === 'file' && commonEntryPoints.includes(node.name)) {
        entryPoints.push(node.path);
      }
    });
    
    return entryPoints;
  }

  private async extractDependencies(path: string): Promise<string[]> {
    try {
      const packageJsonPath = `${path}/package.json`;
      if (await this.fileSystem.exists(packageJsonPath)) {
        const content = await this.fileSystem.readFile(packageJsonPath);
        const pkg = JSON.parse(content);
        
        const deps = [
          ...Object.keys(pkg.dependencies || {}),
          ...Object.keys(pkg.devDependencies || {})
        ];
        
        return Array.from(new Set(deps)); // Remove duplicatas
      }
      return [];
    } catch (error) {
      console.warn('Erro ao extrair dependências:', error);
      return [];
    }
  }

  private identifyDesignPatterns(structure: FileNode[]): string[] {
    const patterns: string[] = [];
    
    // Análise simplificada de padrões com base na estrutura de pastas
    const hasComponents = structure.some(node => 
      node.type === 'directory' && 
      (node.name === 'components' || node.name === 'views')
    );
    
    const hasServices = structure.some(node => 
      node.type === 'directory' && node.name === 'services'
    );
    
    const hasHooks = structure.some(node => 
      node.type === 'directory' && 
      (node.name === 'hooks' || node.name === 'composables')
    );
    
    if (hasComponents) patterns.push('Component-based Architecture');
    if (hasServices) patterns.push('Service Layer');
    if (hasHooks) patterns.push('Custom Hooks/Composables');
    
    return patterns;
  }

  private extractFilePaths(structure: FileNode[]): string[] {
    const files: string[] = [];
    
    const extractFiles = (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.type === 'file') {
          files.push(node.path);
        } else if (node.type === 'directory' && node.children) {
          extractFiles(node.children);
        }
      }
    };
    
    extractFiles(structure);
    return files;
  }

  private generateAnalysisSummary(
    structure: FileNode[],
    technologies: string[],
    entryPoints: string[]
  ): string {
    const fileCount = structure.filter(n => n.type === 'file').length;
    const dirCount = structure.filter(n => n.type === 'directory').length;
    
    return `Projeto com ${fileCount} arquivos e ${dirCount} diretórios.\n` +
           `Tecnologias principais: ${technologies.join(', ')}\n` +
           `Pontos de entrada: ${entryPoints.length > 0 ? entryPoints.join(', ') : 'Não identificados'}`;
  }

    async processQuery(query: string, onChunk?: (chunk: string) => void, signal?: AbortSignal): Promise<AgentResponse> {
    try {
      // Adiciona a mensagem do usuário ao contexto
      this.conversationContext.addMessage('user', query);
      
      // Determina o tipo de resposta necessário
      let responseType = this.determineResponseType(query);
      
      // Prepara o prompt com as instruções do sistema e histórico
      const systemPrompt = this.buildSystemPrompt();
      
      // Adiciona contexto adicional baseado no tipo de resposta
      let context = '';
      
      if (responseType === 'analysis') {
        try {
          const analysis = await this.analyzeProjectStructure();
          context = `## Análise do Projeto Atual\n${analysis.summary}\n\n`;
        } catch (error) {
          console.warn('Erro ao analisar o projeto:', error);
          context = 'Não foi possível analisar o projeto. Continuando sem contexto adicional.\n\n';
        }
      }
      
      let fullResponse = '';
      
      if (onChunk) {
        // Caso com streaming
        await this.modelProvider.streamResponse(
          {
            model: this.config.model.defaultModel,
            prompt: query,
            system: systemPrompt,
            options: {
              temperature: this.config.model.temperature,
              num_predict: this.config.model.maxTokens
            }
          },
          (chunk, done) => {
            fullResponse += chunk;
            onChunk(chunk);
          },
          signal
        );
      } else {
        // Caso sem streaming
        const response = await this.modelProvider.generateResponse({
          model: this.config.model.defaultModel,
          prompt: query,
          system: systemPrompt,
          options: {
            temperature: this.config.model.temperature,
            num_predict: this.config.model.maxTokens
          }
        });
        
        fullResponse = response.response;
      }
      
      // Atualiza o contexto da conversa
      this.conversationContext.addMessage('assistant', fullResponse);
      responseType = this.determineResponseType(fullResponse);
      
      return {
        content: fullResponse,
        type: responseType
      };
    } catch (error) {
      const errorMessage = `Erro ao processar consulta: ${error}`;
      if (onChunk) {
        onChunk(`\n${errorMessage}`);
      }
      return {
        content: errorMessage,
        type: 'error'
      };
    }
  }

  async createPlan(task: string): Promise<TaskPlan> {
    // Implementação simplificada - na prática, isso usaria o modelo para criar um plano
    const planId = uuidv4();
    return {
      id: planId,
      title: `Plano para: ${task.substring(0, 30)}...`,
      description: `Plano detalhado para: ${task}`,
      steps: [
        {
          id: uuidv4(),
          title: 'Análise inicial',
          description: 'Analisar os requisitos e contexto',
          type: 'analysis'
        },
        {
          id: uuidv4(),
          title: 'Implementação',
          description: 'Implementar a solução',
          type: 'implementation',
          dependencies: ['analysis']
        },
        {
          id: uuidv4(),
          title: 'Testes',
          description: 'Testar a implementação',
          type: 'testing',
          dependencies: ['implementation']
        }
      ]
    };
  }

  async executeStep(step: TaskStep, confirmation: boolean): Promise<StepResult> {
    if (!confirmation) {
      return {
        success: false,
        message: 'Operação cancelada pelo usuário'
      };
    }

    try {
      let message = '';
      const filesModified: string[] = [];

      if (step.command) {
        const execPromise = promisify(exec);
        await execPromise(step.command);
        message += `Comando executado: ${step.command}\n`;
      }

      return {
        success: true,
        message: `Passo "${step.title}" executado com sucesso!\n${message}`,
        filesModified
      };
    } catch (error) {
      return {
        success: false,
        message: `Erro na execução: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async readProject(path?: string): Promise<ProjectContext> {
    const projectPath = path || process.cwd();
    
    try {
      const structure = await this.fileSystem.readDirectory(projectPath, true);
      const packageJson = await this.readPackageJson(projectPath);
      
      return {
        structure,
        technologies: this.detectTechnologies(structure),
        dependencies: packageJson?.dependencies || {},
        description: packageJson?.description || 'Projeto TypeScript/Node.js'
      };
    } catch (error) {
      // Fallback para uma estrutura básica em caso de erro
      return {
        structure: [{
          name: projectPath.split('/').pop() || 'project',
          path: projectPath,
          type: 'directory',
          children: []
        }],
        technologies: [],
        dependencies: {},
        description: 'Projeto não pôde ser lido completamente'
      };
    }
  }

  async generateCode(specification: CodeSpecification): Promise<CodeResult> {
    // Implementação simplificada - na prática, isso usaria o modelo para gerar código
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '');
    const fileName = `generated_${timestamp}.ts`;
    
    return {
      code: `// Código gerado automaticamente
// ${specification.description}

${specification.requirements.join('\n')}

// Implementação gerada pelo assistente de IA`,
      files: [
        {
          path: fileName,
          content: `// Código gerado automaticamente
// ${specification.description}

${specification.requirements.join('\n')}

// Implementação gerada pelo assistente de IA`,
          type: 'create' as const
        }
      ],
      message: 'Código gerado com sucesso! Revise o código gerado antes de utilizá-lo em produção.'
    };
  }


  private async readPackageJson(projectPath: string): Promise<{ dependencies?: Record<string, string>; description?: string } | null> {
    try {
      const packageJsonPath = `${projectPath}/package.json`;
      if (await this.fileSystem.exists(packageJsonPath)) {
        const content = await this.fileSystem.readFile(packageJsonPath);
        return JSON.parse(content);
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}
