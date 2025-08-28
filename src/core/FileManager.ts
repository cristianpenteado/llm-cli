import * as fs from 'fs-extra';
import * as path from 'path';
import { FileChange, ChangeHistory, ProjectStats } from '../types';
import { Logger } from '../utils/Logger';
import { v4 as uuidv4 } from 'uuid';

export class FileManager {
  private changeHistory: ChangeHistory[] = [];
  private backupDir: string;
  private maxBackups: number = 10;

  constructor() {
    this.backupDir = path.join(process.cwd(), '.llm-cli', 'backups');
    this.initializeBackupDir();
  }

  /**
   * Inicializa diretório de backups
   */
  private async initializeBackupDir(): Promise<void> {
    try {
      await fs.ensureDir(this.backupDir);
    } catch (error) {
      Logger.warn('Erro ao criar diretório de backups:', error);
    }
  }

  /**
   * Lê conteúdo de um arquivo
   */
  async readFile(filePath: string): Promise<string> {
    try {
      const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
      
      if (!(await fs.pathExists(absolutePath))) {
        throw new Error(`Arquivo não encontrado: ${filePath}`);
      }

      const content = await fs.readFile(absolutePath, 'utf-8');
      Logger.file(`📖 Arquivo lido: ${filePath}`);
      return content;
      
    } catch (error) {
      Logger.error(`Erro ao ler arquivo ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Escreve conteúdo em um arquivo
   */
  async writeFile(filePath: string, content: string, createBackup: boolean = true): Promise<void> {
    try {
      const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
      
      // Criar backup se solicitado e se o arquivo existir
      if (createBackup && await fs.pathExists(absolutePath)) {
        await this.createBackup(absolutePath);
      }

      // Garantir que o diretório existe
      await fs.ensureDir(path.dirname(absolutePath));
      
      // Escrever arquivo
      await fs.writeFile(absolutePath, content, 'utf-8');
      
      Logger.file(`✏️ Arquivo escrito: ${filePath}`);
      
    } catch (error) {
      Logger.error(`Erro ao escrever arquivo ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Cria um arquivo
   */
  async createFile(filePath: string, content: string): Promise<void> {
    try {
      const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
      
      // Verificar se o arquivo já existe
      if (await fs.pathExists(absolutePath)) {
        throw new Error(`Arquivo já existe: ${filePath}`);
      }

      // Garantir que o diretório existe
      await fs.ensureDir(path.dirname(absolutePath));
      
      // Criar arquivo
      await fs.writeFile(absolutePath, content, 'utf-8');
      
      // Registrar mudança
      this.recordChange({
        type: 'create',
        path: filePath,
        content: content,
        description: `Arquivo criado: ${path.basename(filePath)}`,
        timestamp: new Date()
      });
      
      Logger.file(`📄 Arquivo criado: ${filePath}`);
      
    } catch (error) {
      Logger.error(`Erro ao criar arquivo ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Modifica um arquivo existente
   */
  async modifyFile(filePath: string, newContent: string, description?: string): Promise<void> {
    try {
      const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
      
      // Verificar se o arquivo existe
      if (!(await fs.pathExists(absolutePath))) {
        throw new Error(`Arquivo não encontrado: ${filePath}`);
      }

      // Ler conteúdo original
      const originalContent = await fs.readFile(absolutePath, 'utf-8');
      
      // Criar backup
      await this.createBackup(absolutePath);
      
      // Escrever novo conteúdo
      await fs.writeFile(absolutePath, newContent, 'utf-8');
      
      // Registrar mudança
      this.recordChange({
        type: 'modify',
        path: filePath,
        content: newContent,
        originalContent: originalContent,
        description: description || `Arquivo modificado: ${path.basename(filePath)}`,
        timestamp: new Date()
      });
      
      Logger.file(`✏️ Arquivo modificado: ${filePath}`);
      
    } catch (error) {
      Logger.error(`Erro ao modificar arquivo ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Deleta um arquivo
   */
  async deleteFile(filePath: string, description?: string): Promise<void> {
    try {
      const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
      
      // Verificar se o arquivo existe
      if (!(await fs.pathExists(absolutePath))) {
        throw new Error(`Arquivo não encontrado: ${filePath}`);
      }

      // Ler conteúdo para backup
      const content = await fs.readFile(absolutePath, 'utf-8');
      
      // Criar backup
      await this.createBackup(absolutePath);
      
      // Deletar arquivo
      await fs.remove(absolutePath);
      
      // Registrar mudança
      this.recordChange({
        type: 'delete',
        path: filePath,
        originalContent: content,
        description: description || `Arquivo deletado: ${path.basename(filePath)}`,
        timestamp: new Date()
      });
      
      Logger.file(`🗑️ Arquivo deletado: ${filePath}`);
      
    } catch (error) {
      Logger.error(`Erro ao deletar arquivo ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Aplica mudanças sugeridas pelo modelo
   */
  async applyChanges(changes: FileChange[]): Promise<void> {
    if (!changes || changes.length === 0) {
      Logger.info('📝 Nenhuma mudança para aplicar');
      return;
    }

    Logger.info(`🔧 Aplicando ${changes.length} mudança(ões)...`);

    for (const change of changes) {
      try {
        switch (change.type) {
          case 'create':
            await this.createFile(change.path, change.content || '');
            break;
            
          case 'modify':
            await this.modifyFile(change.path, change.content || '', change.description);
            break;
            
          case 'delete':
            await this.deleteFile(change.path, change.description);
            break;
            
          default:
            Logger.warn(`Tipo de mudança desconhecido: ${change.type}`);
        }
      } catch (error) {
        Logger.error(`Erro ao aplicar mudança em ${change.path}:`, error);
        // Continuar com outras mudanças
      }
    }

    Logger.success(`✅ ${changes.length} mudança(ões) aplicada(s)`);
  }

  /**
   * Cria backup de um arquivo
   */
  private async createBackup(filePath: string): Promise<void> {
    try {
      const fileName = path.basename(filePath);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `${fileName}.${timestamp}.backup`;
      const backupPath = path.join(this.backupDir, backupName);
      
      await fs.copy(filePath, backupPath);
      
      // Limpar backups antigos
      await this.cleanupOldBackups();
      
    } catch (error) {
      Logger.warn(`Erro ao criar backup de ${filePath}:`, error);
    }
  }

  /**
   * Limpa backups antigos
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files
        .filter(file => file.endsWith('.backup'))
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file),
          stats: fs.statSync(path.join(this.backupDir, file))
        }))
        .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

      // Manter apenas os backups mais recentes
      if (backupFiles.length > this.maxBackups) {
        const filesToDelete = backupFiles.slice(this.maxBackups);
        
        for (const file of filesToDelete) {
          await fs.remove(file.path);
        }
        
        Logger.debug(`🧹 ${filesToDelete.length} backups antigos removidos`);
      }
      
    } catch (error) {
      Logger.warn('Erro ao limpar backups antigos:', error);
    }
  }

  /**
   * Registra uma mudança no histórico
   */
  private recordChange(change: FileChange): void {
    const historyEntry: ChangeHistory = {
      id: uuidv4(),
      description: change.description,
      timestamp: change.timestamp,
      changes: [change],
      model: 'llm-cli',
      prompt: 'Mudança automática'
    };

    this.changeHistory.push(historyEntry);
    
    // Manter apenas as últimas 100 mudanças
    if (this.changeHistory.length > 100) {
      this.changeHistory = this.changeHistory.slice(-100);
    }
  }

  /**
   * Desfaz alterações recentes
   */
  async rollback(numberOfChanges: number = 1): Promise<number> {
    if (this.changeHistory.length === 0) {
      Logger.warn('📚 Nenhuma alteração para desfazer');
      return 0;
    }

    const changesToUndo = Math.min(numberOfChanges, this.changeHistory.length);
    Logger.info(`↩️ Desfazendo ${changesToUndo} alteração(ões)...`);

    let undoneCount = 0;

    for (let i = 0; i < changesToUndo; i++) {
      const historyEntry = this.changeHistory[this.changeHistory.length - 1 - i];
      
      try {
        for (const change of historyEntry.changes) {
          await this.undoChange(change);
        }
        
        undoneCount++;
        Logger.info(`✅ Alteração desfeita: ${historyEntry.description}`);
        
      } catch (error) {
        Logger.error(`Erro ao desfazer alteração: ${historyEntry.description}`, error);
      }
    }

    // Remover alterações desfeitas do histórico
    this.changeHistory = this.changeHistory.slice(0, -changesToUndo);
    
    Logger.success(`✅ ${undoneCount} alteração(ões) desfeita(s)`);
    return undoneCount;
  }

  /**
   * Desfaz uma mudança específica
   */
  private async undoChange(change: FileChange): Promise<void> {
    try {
      switch (change.type) {
        case 'create':
          // Se foi criado, deletar
          if (change.path) {
            await fs.remove(change.path);
          }
          break;
          
        case 'modify':
          // Se foi modificado, restaurar conteúdo original
          if (change.path && change.originalContent !== undefined) {
            await fs.writeFile(change.path, change.originalContent, 'utf-8');
          }
          break;
          
        case 'delete':
          // Se foi deletado, recriar com conteúdo original
          if (change.path && change.originalContent !== undefined) {
            await fs.ensureDir(path.dirname(change.path));
            await fs.writeFile(change.path, change.originalContent, 'utf-8');
          }
          break;
      }
      
    } catch (error) {
      Logger.error(`Erro ao desfazer mudança em ${change.path}:`, error);
      throw error;
    }
  }

  /**
   * Obtém histórico de alterações
   */
  getChangeHistory(): ChangeHistory[] {
    return [...this.changeHistory];
  }

  /**
   * Obtém estatísticas do projeto
   */
  async getProjectStats(projectPath: string): Promise<ProjectStats> {
    try {
      const stats = await this.scanProject(projectPath);
      
      return {
        fileCount: stats.fileCount,
        lineCount: stats.lineCount,
        languageDistribution: stats.languageDistribution,
        frameworkDistribution: stats.frameworkDistribution,
        lastActivity: new Date()
      };
      
    } catch (error) {
      Logger.error('Erro ao obter estatísticas do projeto:', error);
      return {
        fileCount: 0,
        lineCount: 0,
        languageDistribution: {},
        frameworkDistribution: {},
        lastActivity: new Date()
      };
    }
  }

  /**
   * Escaneia projeto para estatísticas
   */
  private async scanProject(projectPath: string): Promise<any> {
    const stats = {
      fileCount: 0,
      lineCount: 0,
      languageDistribution: {} as Record<string, number>,
      frameworkDistribution: {} as Record<string, number>
    };

    try {
      await this.scanDirectory(projectPath, stats);
    } catch (error) {
      Logger.warn('Erro ao escanear projeto:', error);
    }

    return stats;
  }

  /**
   * Escaneia diretório recursivamente
   */
  private async scanDirectory(dirPath: string, stats: any): Promise<void> {
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      
      if (item.isDirectory()) {
        // Ignorar diretórios do sistema
        if (this.shouldIgnoreDirectory(item.name)) continue;
        
        // Recursão para subdiretórios
        await this.scanDirectory(fullPath, stats);
        
      } else if (item.isFile()) {
        // Ignorar arquivos do sistema
        if (this.shouldIgnoreFile(item.name)) continue;
        
        stats.fileCount++;
        
        // Contar linhas
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          const lines = content.split('\n').length;
          stats.lineCount += lines;
        } catch {
          // Ignorar arquivos que não podem ser lidos
        }
        
        // Detectar linguagem
        const language = this.detectLanguage(item.name);
        if (language) {
          stats.languageDistribution[language] = (stats.languageDistribution[language] || 0) + 1;
        }
      }
    }
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
      /\.llm-cli/,
      /node_modules/,
      /dist/,
      /build/,
      /coverage/,
      /\.cache/
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
      /\.cache/,
      /vendor/,
      /__pycache__/,
      /\.pytest_cache/
    ];
    
    return ignorePatterns.some(pattern => pattern.test(dirname));
  }

  /**
   * Detecta linguagem do arquivo
   */
  private detectLanguage(filename: string): string | undefined {
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
    return extensions[ext];
  }

  /**
   * Lista arquivos de backup disponíveis
   */
  async listBackups(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.backupDir);
      return files.filter(file => file.endsWith('.backup'));
    } catch (error) {
      Logger.warn('Erro ao listar backups:', error);
      return [];
    }
  }

  /**
   * Restaura arquivo de um backup específico
   */
  async restoreFromBackup(backupName: string, targetPath?: string): Promise<void> {
    try {
      const backupPath = path.join(this.backupDir, backupName);
      
      if (!(await fs.pathExists(backupPath))) {
        throw new Error(`Backup não encontrado: ${backupName}`);
      }

      const finalTargetPath = targetPath || backupName.replace(/\.\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.backup$/, '');
      
      await fs.copy(backupPath, finalTargetPath);
      
      Logger.success(`✅ Arquivo restaurado de backup: ${backupName}`);
      
    } catch (error) {
      Logger.error('Erro ao restaurar backup:', error);
      throw error;
    }
  }
}
