import * as fs from 'fs-extra';
import * as path from 'path';
import { ProjectConfig, ProjectStructure, LanguageDetection } from '../types';
import { LanguageDetector } from '../utils/LanguageDetector';
import { Logger } from '../utils/Logger';
import { ConfigManager } from '../utils/ConfigManager';

export class ProjectManager {
  private languageDetector: LanguageDetector;
  private configManager: ConfigManager;

  constructor() {
    this.languageDetector = new LanguageDetector();
    this.configManager = new ConfigManager();
  }

  /**
   * Inicializa um novo projeto na pasta atual
   */
  async initializeProject(options: { model?: string; force?: boolean }): Promise<ProjectConfig> {
    const currentPath = process.cwd();
    
    // Verificar se já existe um projeto
    const existingProject = await this.findExistingProject(currentPath);
    if (existingProject && !options.force) {
      throw new Error(`Projeto já existe em ${currentPath}. Use --force para sobrescrever.`);
    }

    // Detectar linguagem e framework
    const detection = await this.languageDetector.detectLanguage(currentPath);
    
    // Criar estrutura do projeto
    const projectStructure = await this.createProjectStructure(currentPath, detection);
    
    // Criar configuração do projeto
    const projectConfig: ProjectConfig = {
      path: currentPath,
      name: path.basename(currentPath),
      language: detection.language,
      framework: detection.frameworks[0] || 'unknown',
      model: options.model,
      createdAt: new Date(),
      updatedAt: new Date(),
      description: await this.generateProjectDescription(detection),
      dependencies: await this.detectDependencies(currentPath, detection),
      structure: projectStructure
    };

    // Salvar configuração do projeto
    await this.saveProjectConfig(projectConfig);
    
    // Criar arquivo de contexto do projeto
    await this.createProjectContext(projectConfig);
    
    // Criar arquivo README se não existir
    await this.createProjectREADME(projectConfig);
    
    // Atualizar .gitignore para incluir .llm-cli
    await this.updateGitignore(currentPath);
    
    return projectConfig;
  }

  /**
   * Encontra projeto existente na pasta
   */
  private async findExistingProject(projectPath: string): Promise<ProjectConfig | null> {
    const configPath = path.join(projectPath, '.llm-cli', 'project.json');
    
    if (await fs.pathExists(configPath)) {
      try {
        const configData = await fs.readJson(configPath);
        return {
          ...configData,
          createdAt: new Date(configData.createdAt),
          updatedAt: new Date(configData.updatedAt)
        };
      } catch (error) {
        Logger.warn('Erro ao ler configuração existente do projeto');
        return null;
      }
    }
    
    return null;
  }

  /**
   * Verifica se um projeto está inicializado
   */
  async isProjectInitialized(projectPath: string): Promise<boolean> {
    const configPath = path.join(projectPath, '.llm-cli', 'project.json');
    return await fs.pathExists(configPath);
  }

  /**
   * Carrega um projeto existente
   */
  async loadProject(projectPath: string): Promise<ProjectConfig> {
    const project = await this.findExistingProject(projectPath);
    if (!project) {
      throw new Error(`Projeto não encontrado em ${projectPath}. Execute "llm init" primeiro.`);
    }
    return project;
  }

  /**
   * Cria estrutura do projeto
   */
  private async createProjectStructure(projectPath: string, detection: LanguageDetection): Promise<ProjectStructure> {
    const files = await this.scanProjectFiles(projectPath);
    const directories = await this.scanProjectDirectories(projectPath);
    
    return {
      files,
      directories,
      language: detection.language,
      framework: detection.frameworks[0] || 'unknown',
      patterns: detection.patterns
    };
  }

  /**
   * Escaneia arquivos do projeto
   */
  private async scanProjectFiles(projectPath: string): Promise<any[]> {
    const files: any[] = [];
    
    try {
      const items = await fs.readdir(projectPath, { withFileTypes: true });
      
      for (const item of items) {
        if (item.isFile()) {
          const filePath = path.join(projectPath, item.name);
          const stats = await fs.stat(filePath);
          
          // Ignorar arquivos do sistema e temporários
          if (this.shouldIgnoreFile(item.name)) continue;
          
          files.push({
            path: filePath,
            name: item.name,
            extension: path.extname(item.name),
            size: stats.size,
            lastModified: stats.mtime,
            language: this.detectFileLanguage(item.name)
          });
        }
      }
    } catch (error) {
      Logger.warn('Erro ao escanear arquivos do projeto:', error);
    }
    
    return files;
  }

  /**
   * Escaneia diretórios do projeto
   */
  private async scanProjectDirectories(projectPath: string): Promise<string[]> {
    const directories: string[] = [];
    
    try {
      const items = await fs.readdir(projectPath, { withFileTypes: true });
      
      for (const item of items) {
        if (item.isDirectory()) {
          // Ignorar diretórios do sistema
          if (this.shouldIgnoreDirectory(item.name)) continue;
          
          directories.push(item.name);
        }
      }
    } catch (error) {
      Logger.warn('Erro ao escanear diretórios do projeto:', error);
    }
    
    return directories;
  }

  /**
   * Verifica se deve ignorar arquivo
   */
  private shouldIgnoreFile(filename: string): boolean {
    const ignorePatterns = [
      /^\./,
      /~$/,
      /\.tmp$/,
      /\.log$/,
      /\.DS_Store$/,
      /Thumbs\.db$/,
      /\.git/,
      /\.llm-cli/
    ];
    
    return ignorePatterns.some(pattern => pattern.test(filename));
  }

  /**
   * Verifica se deve ignorar diretório
   */
  private shouldIgnoreDirectory(dirname: string): boolean {
    const ignorePatterns = [
      /^\./,
      /node_modules/,
      /\.git/,
      /\.llm-cli/,
      /dist/,
      /build/,
      /coverage/,
      /\.cache/
    ];
    
    return ignorePatterns.some(pattern => pattern.test(dirname));
  }

  /**
   * Detecta linguagem do arquivo
   */
  private detectFileLanguage(filename: string): string | undefined {
    const extensions: Record<string, string> = {
      '.js': 'JavaScript',
      '.ts': 'TypeScript',
      '.jsx': 'React JSX',
      '.tsx': 'React TSX',
      '.py': 'Python',
      '.php': 'PHP',
      '.go': 'Go',
      '.rs': 'Rust',
      '.java': 'Java',
      '.cpp': 'C++',
      '.c': 'C',
      '.cs': 'C#',
      '.rb': 'Ruby',
      '.swift': 'Swift',
      '.kt': 'Kotlin',
      '.scala': 'Scala',
      '.html': 'HTML',
      '.css': 'CSS',
      '.scss': 'SCSS',
      '.sass': 'Sass',
      '.json': 'JSON',
      '.yaml': 'YAML',
      '.yml': 'YAML',
      '.md': 'Markdown',
      '.sql': 'SQL'
    };
    
    const ext = path.extname(filename);
    return extensions[ext] || undefined;
  }

  /**
   * Detecta dependências do projeto
   */
  private async detectDependencies(projectPath: string, detection: LanguageDetection): Promise<string[]> {
    const dependencies: string[] = [];
    
    try {
      switch (detection.language) {
        case 'JavaScript':
        case 'TypeScript':
          const packageJsonPath = path.join(projectPath, 'package.json');
          if (await fs.pathExists(packageJsonPath)) {
            const packageJson = await fs.readJson(packageJsonPath);
            if (packageJson.dependencies) {
              dependencies.push(...Object.keys(packageJson.dependencies));
            }
            if (packageJson.devDependencies) {
              dependencies.push(...Object.keys(packageJson.devDependencies));
            }
          }
          break;
          
        case 'Python':
          const requirementsPath = path.join(projectPath, 'requirements.txt');
          if (await fs.pathExists(requirementsPath)) {
            const requirements = await fs.readFile(requirementsPath, 'utf-8');
            dependencies.push(...requirements.split('\n').filter(line => line.trim() && !line.startsWith('#')));
          }
          break;
          
        case 'PHP':
          const composerPath = path.join(projectPath, 'composer.json');
          if (await fs.pathExists(composerPath)) {
            const composer = await fs.readJson(composerPath);
            if (composer.require) {
              dependencies.push(...Object.keys(composer.require));
            }
            if (composer['require-dev']) {
              dependencies.push(...Object.keys(composer['require-dev']));
            }
          }
          break;
          
        case 'Go':
          const goModPath = path.join(projectPath, 'go.mod');
          if (await fs.pathExists(goModPath)) {
            const goMod = await fs.readFile(goModPath, 'utf-8');
            const requireMatches = goMod.match(/require\s+([^\s]+)/g);
            if (requireMatches) {
              dependencies.push(...requireMatches.map(match => match.replace('require ', '')));
            }
          }
          break;
      }
    } catch (error) {
      Logger.warn('Erro ao detectar dependências:', error);
    }
    
    return dependencies;
  }

  /**
   * Gera descrição do projeto
   */
  private async generateProjectDescription(detection: LanguageDetection): Promise<string> {
    const languageNames: Record<string, string> = {
      'JavaScript': 'JavaScript',
      'TypeScript': 'TypeScript',
      'Python': 'Python',
      'PHP': 'PHP',
      'Go': 'Go',
      'Rust': 'Rust',
      'Java': 'Java',
      'C++': 'C++',
      'C': 'C',
      'C#': 'C#'
    };
    
    const frameworkNames: Record<string, string> = {
      'react': 'React',
      'vue': 'Vue.js',
      'angular': 'Angular',
      'express': 'Express.js',
      'nest': 'NestJS',
      'laravel': 'Laravel',
      'django': 'Django',
      'flask': 'Flask',
      'fastapi': 'FastAPI',
      'gin': 'Gin',
      'echo': 'Echo',
      'actix': 'Actix'
    };
    
    const language = languageNames[detection.language] || detection.language;
    const framework = detection.frameworks.length > 0 
      ? frameworkNames[detection.frameworks[0]] || detection.frameworks[0]
      : 'sem framework específico';
    
    return `Projeto ${language} ${framework !== 'sem framework específico' ? `usando ${framework}` : ''}`;
  }

  /**
   * Salva configuração do projeto
   */
  private async saveProjectConfig(config: ProjectConfig): Promise<void> {
    const configDir = path.join(config.path, '.llm-cli');
    const configPath = path.join(configDir, 'project.json');
    
    try {
      await fs.ensureDir(configDir);
      await fs.writeJson(configPath, config, { spaces: 2 });
    } catch (error) {
      throw new Error(`Erro ao salvar configuração do projeto: ${error}`);
    }
  }

  /**
   * Cria arquivo de contexto do projeto
   */
  private async createProjectContext(config: ProjectConfig): Promise<void> {
    const contextPath = path.join(config.path, '.llm-cli', 'context.md');
    
    const contextContent = `# Contexto do Projeto: ${config.name}

## Informações Gerais
- **Linguagem**: ${config.language}
- **Framework**: ${config.framework}
- **Modelo LLM**: ${config.model || 'Não configurado'}
- **Criado em**: ${config.createdAt.toLocaleDateString()}
- **Atualizado em**: ${config.updatedAt.toLocaleDateString()}

## Descrição
${config.description}

## Estrutura
- **Arquivos**: ${config.structure?.files.length || 0}
- **Diretórios**: ${config.structure?.directories.length || 0}
- **Padrões detectados**: ${config.structure?.patterns.join(', ') || 'Nenhum'}

## Dependências
${config.dependencies?.map(dep => `- ${dep}`).join('\n') || 'Nenhuma dependência detectada'}

## Histórico de Alterações
Este arquivo é atualizado automaticamente pela LLM CLI.
`;

    try {
      await fs.writeFile(contextPath, contextContent, 'utf-8');
    } catch (error) {
      Logger.warn('Erro ao criar arquivo de contexto:', error);
    }
  }

  /**
   * Cria README do projeto se não existir
   */
  private async createProjectREADME(config: ProjectConfig): Promise<void> {
    const readmePath = path.join(config.path, 'README.md');
    
    if (await fs.pathExists(readmePath)) {
      return; // README já existe
    }
    
    const readmeContent = `# ${config.name}

${config.description}

## Tecnologias
- **Linguagem**: ${config.language}
- **Framework**: ${config.framework}

## Instalação
\`\`\`bash
# Instalar dependências
${this.getInstallCommand(config)}

# Executar projeto
${this.getRunCommand(config)}
\`\`\`

## Desenvolvimento
Este projeto foi configurado com a LLM CLI para desenvolvimento assistido por IA.

## Comandos Úteis
- \`llm status\` - Ver status do projeto
- \`llm chat\` - Iniciar conversa com IA
- \`llm create <tipo> <nome>\` - Criar nova funcionalidade
- \`llm edit <arquivo> <instrução>\` - Editar arquivo
`;

    try {
      await fs.writeFile(readmePath, readmeContent, 'utf-8');
    } catch (error) {
      Logger.warn('Erro ao criar README do projeto:', error);
    }
  }

  /**
   * Obtém comando de instalação baseado na linguagem
   */
  private getInstallCommand(config: ProjectConfig): string {
    switch (config.language) {
      case 'JavaScript':
      case 'TypeScript':
        return 'npm install';
      case 'Python':
        return 'pip install -r requirements.txt';
      case 'PHP':
        return 'composer install';
      case 'Go':
        return 'go mod download';
      default:
        return 'echo "Instalação não configurada para esta linguagem"';
    }
  }

  /**
   * Obtém comando de execução baseado na linguagem
   */
  private getRunCommand(config: ProjectConfig): string {
    switch (config.language) {
      case 'JavaScript':
      case 'TypeScript':
        return 'npm start';
      case 'Python':
        return 'python main.py';
      case 'PHP':
        return 'php -S localhost:8000';
      case 'Go':
        return 'go run .';
      default:
        return 'echo "Execução não configurada para esta linguagem"';
    }
  }

  /**
   * Atualiza .gitignore para incluir .llm-cli
   */
  private async updateGitignore(projectPath: string): Promise<void> {
    const gitignorePath = path.join(projectPath, '.gitignore');
    const gitignoreContent = `# LLM CLI
.llm-cli/
`;

    if (await fs.pathExists(gitignorePath)) {
      const existingContent = await fs.readFile(gitignorePath, 'utf-8');
      if (!existingContent.includes('.llm-cli/')) {
        await fs.appendFile(gitignorePath, gitignoreContent);
        Logger.info('📝 Atualizado .gitignore para incluir .llm-cli');
      }
    } else {
      await fs.writeFile(gitignorePath, gitignoreContent);
      Logger.info('📝 Criado .gitignore com .llm-cli');
    }
  }

  /**
   * Atualiza a configuração do projeto com o modelo selecionado
   */
  async updateProjectModel(projectPath: string, modelName: string): Promise<void> {
    try {
      const configPath = path.join(projectPath, '.llm-cli', 'project.json');
      
      if (await fs.pathExists(configPath)) {
        const configData = await fs.readJson(configPath);
        configData.model = modelName;
        configData.updatedAt = new Date();
        
        await fs.writeJson(configPath, configData, { spaces: 2 });
        Logger.info(`💾 Modelo ${modelName} salvo na configuração do projeto`);
      }
    } catch (error) {
      Logger.warn('Erro ao atualizar modelo do projeto:', error);
    }
  }
}
