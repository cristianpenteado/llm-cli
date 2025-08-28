import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { GlobalConfig, HardwareInfo, OllamaConfig } from '../types';
import { Logger } from './Logger';

export class ConfigManager {
  private configDir: string;
  private configPath: string;
  private config: GlobalConfig;

  constructor() {
    this.configDir = path.join(os.homedir(), '.llm-cli');
    this.configPath = path.join(this.configDir, 'config.json');
    this.config = this.getDefaultConfig();
    this.initializeConfig();
  }

  /**
   * Inicializa configuração
   */
  private async initializeConfig(): Promise<void> {
    try {
      await fs.ensureDir(this.configDir);
      
      if (await fs.pathExists(this.configPath)) {
        const savedConfig = await fs.readJson(this.configPath);
        this.config = { ...this.config, ...savedConfig };
      } else {
        await this.saveConfig();
      }
    } catch (error) {
      Logger.warn('Erro ao inicializar configuração:', error);
    }
  }

  /**
   * Obtém configuração padrão
   */
  private getDefaultConfig(): GlobalConfig {
    return {
      defaultModel: undefined,
      hardwareInfo: undefined,
      mcpConfig: {
        serverUrl: 'localhost',
        port: 8000,
        protocol: 'http',
        timeout: 30000
      },
      ollamaConfig: {
        modelsPath: path.join(os.homedir(), '.local', 'share', 'ollama', 'models'),
        serverUrl: 'localhost',
        port: 11434,
        maxMemory: 8192, // 8GB
        gpuEnabled: false
      },
      projects: {},
      theme: 'auto',
      language: 'pt-BR'
    };
  }

  /**
   * Salva configuração atual
   */
  private async saveConfig(): Promise<void> {
    try {
      await fs.writeJson(this.configPath, this.config, { spaces: 2 });
    } catch (error) {
      Logger.error('Erro ao salvar configuração:', error);
      throw new Error('Falha ao salvar configuração');
    }
  }

  /**
   * Verifica se é a primeira execução
   */
  async isFirstRun(): Promise<boolean> {
    return !this.config.hardwareInfo;
  }

  /**
   * Salva informações de hardware
   */
  async saveHardwareInfo(hardware: HardwareInfo): Promise<void> {
    this.config.hardwareInfo = hardware;
    await this.saveConfig();
    Logger.info('💾 Informações de hardware salvas');
  }

  /**
   * Obtém informações de hardware
   */
  getHardwareInfo(): HardwareInfo | undefined {
    return this.config.hardwareInfo;
  }

  /**
   * Define modelo padrão
   */
  async setDefaultModel(modelName: string): Promise<void> {
    this.config.defaultModel = modelName;
    await this.saveConfig();
    Logger.info(`💾 Modelo padrão definido: ${modelName}`);
  }

  /**
   * Obtém modelo padrão
   */
  getDefaultModel(): string | undefined {
    return this.config.defaultModel;
  }

  /**
   * Salva configuração MCP
   */
  async setMCPConfig(mcpConfig: any): Promise<void> {
    this.config.mcpConfig = { ...this.config.mcpConfig, ...mcpConfig };
    await this.saveConfig();
    Logger.info('💾 Configuração MCP atualizada');
  }

  /**
   * Obtém configuração MCP
   */
  getMCPConfig(): any {
    return this.config.mcpConfig;
  }

  /**
   * Salva configuração Ollama
   */
  async setOllamaConfig(ollamaConfig: any): Promise<void> {
    this.config.ollamaConfig = { ...this.config.ollamaConfig, ...ollamaConfig };
    await this.saveConfig();
    Logger.info('💾 Configuração Ollama atualizada');
  }

  /**
   * Obtém configuração Ollama
   */
  getOllamaConfig(): any {
    return this.config.ollamaConfig;
  }

  /**
   * Salva projeto
   */
  async saveProject(projectPath: string, projectConfig: any): Promise<void> {
    this.config.projects[projectPath] = projectConfig;
    await this.saveConfig();
  }

  /**
   * Obtém projeto
   */
  getProject(projectPath: string): any | undefined {
    return this.config.projects[projectPath];
  }

  /**
   * Remove projeto
   */
  async removeProject(projectPath: string): Promise<void> {
    delete this.config.projects[projectPath];
    await this.saveConfig();
    Logger.info(`🗑️ Projeto removido: ${projectPath}`);
  }

  /**
   * Lista todos os projetos
   */
  listProjects(): string[] {
    return Object.keys(this.config.projects);
  }

  /**
   * Define tema
   */
  async setTheme(theme: 'light' | 'dark' | 'auto'): Promise<void> {
    this.config.theme = theme;
    await this.saveConfig();
    Logger.info(`🎨 Tema definido: ${theme}`);
  }

  /**
   * Obtém tema atual
   */
  getTheme(): 'light' | 'dark' | 'auto' {
    return this.config.theme;
  }

  /**
   * Define idioma
   */
  async setLanguage(language: 'pt-BR' | 'en-US'): Promise<void> {
    this.config.language = language;
    await this.saveConfig();
    Logger.info(`🌐 Idioma definido: ${language}`);
  }

  /**
   * Obtém idioma atual
   */
  getLanguage(): 'pt-BR' | 'en-US' {
    return this.config.language;
  }

  /**
   * Obtém configuração completa
   */
  getConfig(): GlobalConfig {
    return { ...this.config };
  }

  /**
   * Reseta configuração para padrão
   */
  async resetConfig(): Promise<void> {
    this.config = this.getDefaultConfig();
    await this.saveConfig();
    Logger.info('🔄 Configuração resetada para padrão');
  }

  /**
   * Exporta configuração
   */
  async exportConfig(exportPath: string): Promise<void> {
    try {
      await fs.writeJson(exportPath, this.config, { spaces: 2 });
      Logger.success(`📤 Configuração exportada para: ${exportPath}`);
    } catch (error) {
      Logger.error('Erro ao exportar configuração:', error);
      throw new Error('Falha ao exportar configuração');
    }
  }

  /**
   * Importa configuração
   */
  async importConfig(importPath: string): Promise<void> {
    try {
      const importedConfig = await fs.readJson(importPath);
      
      // Validar configuração importada
      if (this.validateConfig(importedConfig)) {
        this.config = { ...this.config, ...importedConfig };
        await this.saveConfig();
        Logger.success('📥 Configuração importada com sucesso');
      } else {
        throw new Error('Configuração inválida');
      }
    } catch (error) {
      Logger.error('Erro ao importar configuração:', error);
      throw new Error('Falha ao importar configuração');
    }
  }

  /**
   * Valida configuração
   */
  private validateConfig(config: any): boolean {
    // Verificações básicas
    if (typeof config !== 'object' || config === null) {
      return false;
    }

    // Verificar se tem propriedades obrigatórias
    const requiredProps = ['mcpConfig', 'ollamaConfig', 'projects', 'theme', 'language'];
    for (const prop of requiredProps) {
      if (!(prop in config)) {
        return false;
      }
    }

    // Verificar tipos
    if (!['light', 'dark', 'auto'].includes(config.theme)) {
      return false;
    }

    if (!['pt-BR', 'en-US'].includes(config.language)) {
      return false;
    }

    return true;
  }

  /**
   * Obtém estatísticas da configuração
   */
  getConfigStats(): any {
    return {
      totalProjects: Object.keys(this.config.projects).length,
      hasDefaultModel: !!this.config.defaultModel,
      hasHardwareInfo: !!this.config.hardwareInfo,
      configSize: JSON.stringify(this.config).length,
      lastModified: this.getConfigLastModified()
    };
  }

  /**
   * Obtém data da última modificação
   */
  private getConfigLastModified(): Date | null {
    try {
      const stats = fs.statSync(this.configPath);
      return stats.mtime;
    } catch {
      return null;
    }
  }

  /**
   * Limpa projetos antigos
   */
  async cleanupOldProjects(maxAge: number = 30): Promise<void> {
    const now = new Date();
    const maxAgeMs = maxAge * 24 * 60 * 60 * 1000; // Converter dias para milissegundos
    
    let cleanedCount = 0;
    
    for (const [projectPath, projectConfig] of Object.entries(this.config.projects)) {
      const projectAge = now.getTime() - new Date(projectConfig.updatedAt).getTime();
      
      if (projectAge > maxAgeMs) {
        // Verificar se o projeto ainda existe
        if (!(await fs.pathExists(projectPath))) {
          delete this.config.projects[projectPath];
          cleanedCount++;
        }
      }
    }
    
    if (cleanedCount > 0) {
      await this.saveConfig();
      Logger.info(`🧹 ${cleanedCount} projetos antigos removidos`);
    }
  }

  /**
   * Obtém caminho do diretório de configuração
   */
  getConfigDir(): string {
    return this.configDir;
  }

  /**
   * Obtém caminho do arquivo de configuração
   */
  getConfigPath(): string {
    return this.configPath;
  }
}
