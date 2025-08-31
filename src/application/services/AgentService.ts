import { Agent, AgentResponse, TaskPlan, TaskStep, ConfirmationResult, StepResult, ProjectContext, CodeSpecification, CodeResult, FileNode, ProjectAnalysis } from '../../domain/agent/Agent';
import { ModelProvider } from '../../domain/communication/ModelProvider';
import { Configuration } from '../../domain/configuration/Configuration';
import { ConversationContext } from '../../domain/agent/ConversationContext';
import { FileSystemService } from '../ports/FileSystemService';
import { v4 as uuidv4 } from 'uuid';

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
    return `Você é ${this.config.agent.name}, um assistente de IA especializado em desenvolvimento de software.

# Diretrizes de Resposta
1. Seja natural e conversacional em português brasileiro
2. Adapte o tom conforme o contexto (técnico ou casual)
3. Para tarefas técnicas, seja preciso e direto
4. Use markdown para formatar respostas

# Comportamento
- Para saudações casuais (oi, olá, etc), responda de forma amigável sem contexto técnico
- Para perguntas técnicas, responda com profundidade adequada
- Ao propor alterações ou criar código, siga as melhores práticas
- Sempre que for executar uma ação, peça confirmação com [sim/skip/stop]

# Geração de Código
- Use TypeScript/JavaScript por padrão, a menos que especificado o contrário
- Inclua comentários explicativos
- Siga as melhores práticas da linguagem
- Considere casos de borda e tratamento de erros

# Análise de Projeto
- Ao analisar um projeto, identifique:
  * Estrutura de pastas
  * Tecnologias utilizadas
  * Pontos de entrada
  * Dependências
  * Padrões de projeto identificados

Lembre-se: Seja útil, conciso e mantenha uma conversa natural!`;
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
    const codeKeywords = ['criar', 'gerar', 'implementar', 'código', 'script', 'função', 'classe'];
    const normalized = content.toLowerCase();
    return codeKeywords.some(keyword => normalized.includes(keyword)) || content.includes('```');
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
        structure,
        technologies,
        entryPoints,
        dependencies,
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

  async executeStep(step: TaskStep, confirmation: ConfirmationResult): Promise<StepResult> {
    if (confirmation.action === 'stop') {
      return {
        success: false,
        error: 'Operação cancelada pelo usuário',
        output: 'A execução foi interrompida conforme solicitado.'
      };
    }

    if (confirmation.action === 'skip') {
      return {
        success: true,
        output: `Passo "${step.title}" pulado: ${confirmation.reason || 'Sem motivo especificado'}`
      };
    }

    try {
      const filesModified: string[] = [];
      let output = '';

      // Execute commands if any
      if (step.commands && step.commands.length > 0) {
        for (const command of step.commands) {
          output += `Executando: ${command}\n`;
          // Command execution would be implemented here
        }
      }

      // Modify files if any
      if (step.files && step.files.length > 0) {
        for (const file of step.files) {
          if (await this.fileSystem.exists(file)) {
            filesModified.push(file);
          }
        }
      }

      return {
        success: true,
        output: `Passo "${step.title}" executado com sucesso!\n${output}`,
        filesModified
      };
    } catch (error) {
      return {
        success: false,
        error: `Erro na execução: ${error}`,
        output: `Falha ao executar o passo: ${error}`
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
      instructions: [
        'Código gerado com sucesso!',
        'Revise o código gerado antes de utilizá-lo em produção.'
      ]
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
