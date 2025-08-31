import { Agent, AgentResponse, TaskPlan, TaskStep, ConfirmationResult, StepResult, ProjectContext, CodeSpecification, CodeResult, FileNode } from '../../domain/agent/Agent';
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
    return `Você é ${this.config.agent.name}, um assistente de IA especializado em desenvolvimento JavaScript/TypeScript.

Diretrizes de resposta:
1. Priorize JavaScript/TypeScript em todas as explicações e exemplos
2. Seja conciso e vá direto ao ponto
3. Use português brasileiro coloquial
4. Para exemplos de código, use TypeScript por padrão, a menos que especificado o contrário
5. Mantenha as respostas curtas e objetivas
6. Execute comandos do sistema apenas quando solicitado explicitamente

Quando gerar código:
- Use TypeScript com tipagem explícita
- Inclua apenas comentários essenciais
- Prefira soluções nativas sem bibliotecas externas quando possível
- Use boas práticas de Clean Code
- Sugira testes quando apropriado
- Explique as decisões técnicas tomadas

Lembre-se: Você está em um chat interativo, então seja natural e conversacional!`;
  }

  private determineResponseType(content: string): 'answer' | 'plan' | 'code' | 'error' {
    // Lógica simples para determinar o tipo de resposta com base no conteúdo
    if (content.toLowerCase().includes('plano:') || content.toLowerCase().includes('passo')) {
      return 'plan';
    }
    if (content.includes('```')) {
      return 'code';
    }
    return 'answer';
  }

  async processQuery(query: string, onChunk?: (chunk: string) => void, signal?: AbortSignal): Promise<AgentResponse> {
    try {
      // Adiciona a mensagem do usuário ao contexto
      this.conversationContext.addMessage('user', query);
      
      // Prepara o prompt com as instruções do sistema e histórico
      const systemPrompt = this.buildSystemPrompt();
      const history = this.conversationContext.getFormattedHistory();
      
      // Combina tudo em um prompt estruturado
      const fullPrompt = `${systemPrompt}

Histórico da conversa:
${history}

Usuário: ${query}

Resposta:`;
      
      // Obtém a resposta do modelo
      let fullResponse = '';
      let responseType: 'answer' | 'plan' | 'code' | 'error' = 'answer';
      
      // Se tivermos um callback de streaming, usamos streamResponse
      if (onChunk) {
        await this.modelProvider.streamResponse(
          {
            model: this.config.model.defaultModel,
            prompt: query,
            system: systemPrompt,
            options: {
              temperature: this.config.model.temperature,
              num_predict: this.config.model.maxTokens
            },
            stream: true
          },
          (chunk: string, done: boolean) => {
            if (signal?.aborted) {
              return; // Skip processing if aborted
            }
            fullResponse += chunk;
            onChunk?.(chunk);
            if (done) {
              this.conversationContext.addMessage('assistant', fullResponse);
              responseType = this.determineResponseType(fullResponse);
            }
          },
          signal // Pass the abort signal to the model provider
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
        responseType = this.determineResponseType(fullResponse);
        this.conversationContext.addMessage('assistant', fullResponse);
      }
      
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

  private detectTechnologies(structure: FileNode[]): string[] {
    const techs = new Set<string>();
    
    const checkFiles = (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.type === 'file') {
          if (node.name.endsWith('.ts') || node.name.endsWith('.tsx')) {
            techs.add('TypeScript');
          } else if (node.name.endsWith('.js') || node.name.endsWith('.jsx')) {
            techs.add('JavaScript');
          } else if (node.name.endsWith('.css')) {
            techs.add('CSS');
          } else if (node.name.endsWith('.html')) {
            techs.add('HTML');
          } else if (node.name === 'package.json') {
            techs.add('Node.js');
          } else if (node.name === 'Dockerfile') {
            techs.add('Docker');
          } else if (node.name.endsWith('.py')) {
            techs.add('Python');
          }
        } else if (node.type === 'directory' && node.children) {
          checkFiles(node.children);
        }
      }
    };

    checkFiles(structure);
    return Array.from(techs);
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
