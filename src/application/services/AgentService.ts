import { Agent, AgentResponse, TaskPlan, TaskStep, ConfirmationResult, StepResult, ProjectContext, CodeSpecification, CodeResult } from '../../domain/agent/Agent';
import { ModelProvider } from '../../domain/communication/ModelProvider';
import { Configuration } from '../../domain/configuration/Configuration';
import { FileSystemService } from '../ports/FileSystemService';

export class AgentService implements Agent {
  constructor(
    private modelProvider: ModelProvider,
    private fileSystem: FileSystemService,
    private config: Configuration
  ) {}

  async processQuery(query: string): Promise<AgentResponse> {
    try {
      const systemPrompt = this.buildSystemPrompt();
      const response = await this.modelProvider.generateResponse({
        model: this.config.model.defaultModel,
        prompt: query,
        system: systemPrompt,
        options: {
          temperature: this.config.model.temperature,
          num_predict: this.config.model.maxTokens
        }
      });

      return {
        content: response.response,
        type: this.determineResponseType(response.response),
        metadata: {
          model: response.model,
          duration: response.total_duration
        }
      };
    } catch (error) {
      return {
        content: `Erro ao processar consulta: ${error}`,
        type: 'error'
      };
    }
  }

  async createPlan(task: string): Promise<TaskPlan> {
    const planPrompt = `
Crie um plano detalhado para a seguinte tarefa: "${task}"

Responda APENAS com um JSON válido no seguinte formato:
{
  "title": "Título do plano",
  "description": "Descrição detalhada",
  "steps": [
    {
      "id": "step-1",
      "title": "Título do passo",
      "description": "Descrição detalhada do que fazer",
      "type": "analysis|implementation|testing|documentation",
      "dependencies": ["step-id-anterior"],
      "files": ["arquivo1.ts", "arquivo2.ts"],
      "commands": ["npm install", "npm test"]
    }
  ],
  "estimatedTime": "30 minutos"
}`;

    try {
      const response = await this.modelProvider.generateResponse({
        model: this.config.model.defaultModel,
        prompt: planPrompt,
        system: 'Você é um especialista em planejamento de desenvolvimento. Responda apenas com JSON válido.',
        options: { temperature: 0.3 }
      });

      const planData = JSON.parse(response.response);
      return {
        id: `plan-${Date.now()}`,
        ...planData
      };
    } catch (error) {
      throw new Error(`Falha ao criar plano: ${error}`);
    }
  }

  async executeStep(step: TaskStep, confirmation: ConfirmationResult): Promise<StepResult> {
    if (confirmation.action === 'stop') {
      return { success: false, output: 'Execução interrompida pelo usuário' };
    }

    if (confirmation.action === 'skip') {
      return { success: true, output: 'Passo pulado pelo usuário' };
    }

    try {
      // Executing step

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
        output,
        filesModified
      };
    } catch (error) {
      // Error executing step
      return {
        success: false,
        error: `Erro na execução: ${error}`
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
        description: packageJson?.description
      };
    } catch (error) {
      // Error reading project
      throw new Error(`Falha ao ler projeto: ${error}`);
    }
  }

  async generateCode(specification: CodeSpecification): Promise<CodeResult> {
    const codePrompt = `
Gere código baseado na seguinte especificação:

Linguagem: ${specification.language}
Framework: ${specification.framework || 'Nenhum'}
Descrição: ${specification.description}
Requisitos:
${specification.requirements.map(req => `- ${req}`).join('\n')}

${specification.context ? `Contexto do projeto:
Tecnologias: ${specification.context.technologies.join(', ')}
Dependências: ${Object.keys(specification.context.dependencies).join(', ')}` : ''}

Responda APENAS com um JSON válido no seguinte formato:
{
  "files": [
    {
      "path": "src/example.ts",
      "content": "código aqui",
      "type": "create|modify|delete"
    }
  ],
  "instructions": ["Passo 1", "Passo 2"],
  "dependencies": ["package1", "package2"],
  "tests": [
    {
      "path": "tests/example.test.ts",
      "content": "código de teste",
      "type": "create"
    }
  ]
}`;

    try {
      const response = await this.modelProvider.generateResponse({
        model: this.config.model.defaultModel,
        prompt: codePrompt,
        system: 'Você é um especialista em desenvolvimento de software. Responda apenas com JSON válido.',
        options: { temperature: 0.2 }
      });

      return JSON.parse(response.response);
    } catch (error) {
      // Error generating code
      throw new Error(`Falha ao gerar código: ${error}`);
    }
  }

  private buildSystemPrompt(): string {
    return `Você é ${this.config.agent.name}, um assistente de IA especializado em desenvolvimento de software.

Personalidade: ${this.config.agent.personality}
Contexto: Chat interativo no terminal CLI
Capacidades: 
- Conversar naturalmente sobre programação e tecnologia
- Explicar conceitos técnicos de forma clara
- Criar planos detalhados de desenvolvimento
- Gerar código funcional e bem estruturado
- Analisar projetos e sugerir melhorias
- Executar comandos do sistema (com confirmação)

Diretrizes de conversa:
- Use português brasileiro coloquial e amigável
- Seja conversacional, como se estivesse ajudando um colega desenvolvedor
- Explique conceitos técnicos de forma didática
- Dê exemplos práticos sempre que possível
- Sugira boas práticas de desenvolvimento
- Se não souber algo, seja honesto e sugira alternativas
- Mantenha respostas úteis mas não muito longas
- Use emojis ocasionalmente para deixar a conversa mais amigável

Quando gerar código:
- Sempre inclua comentários explicativos
- Use boas práticas de Clean Code
- Sugira testes quando apropriado
- Explique as decisões técnicas tomadas

Lembre-se: Você está em um chat interativo, então seja natural e conversacional!`;
  }

  private determineResponseType(response: string): 'answer' | 'plan' | 'code' | 'error' {
    if (response.includes('erro') || response.includes('falha')) return 'error';
    if (response.includes('```') || response.includes('function') || response.includes('class')) return 'code';
    if (response.includes('plano') || response.includes('passos') || response.includes('etapas')) return 'plan';
    return 'answer';
  }

  private async readPackageJson(projectPath: string): Promise<any> {
    try {
      const packagePath = `${projectPath}/package.json`;
      if (await this.fileSystem.exists(packagePath)) {
        const content = await this.fileSystem.readFile(packagePath);
        return JSON.parse(content);
      }
    } catch (error) {
      // No package.json found or invalid JSON
    }
    return null;
  }

  private detectTechnologies(structure: any[]): string[] {
    const technologies: Set<string> = new Set();
    
    const checkFile = (file: any) => {
      if (file.type === 'file') {
        const ext = file.name.split('.').pop()?.toLowerCase();
        switch (ext) {
          case 'ts': technologies.add('TypeScript'); break;
          case 'js': technologies.add('JavaScript'); break;
          case 'py': technologies.add('Python'); break;
          case 'java': technologies.add('Java'); break;
          case 'go': technologies.add('Go'); break;
          case 'rs': technologies.add('Rust'); break;
          case 'cpp': case 'cc': case 'cxx': technologies.add('C++'); break;
          case 'c': technologies.add('C'); break;
        }
        
        if (file.name === 'package.json') technologies.add('Node.js');
        if (file.name === 'requirements.txt') technologies.add('Python');
        if (file.name === 'Cargo.toml') technologies.add('Rust');
        if (file.name === 'go.mod') technologies.add('Go');
      }
      
      if (file.children) {
        file.children.forEach(checkFile);
      }
    };
    
    structure.forEach(checkFile);
    return Array.from(technologies);
  }
}
