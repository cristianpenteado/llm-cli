import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'yaml';
import { Configuration, ConfigurationRepository, ValidationResult } from '../../domain/configuration/Configuration';

export class FileConfigurationRepository implements ConfigurationRepository {
  private configPath: string;

  constructor(configDir?: string) {
    const homeDir = process.env.HOME || process.env.USERPROFILE || process.cwd();
    this.configPath = path.join(configDir || path.join(homeDir, '.llm-cli'), 'config.yaml');
  }

  async load(): Promise<Configuration> {
    try {
      if (await fs.pathExists(this.configPath)) {
        const content = await fs.readFile(this.configPath, 'utf-8');
        const config = yaml.parse(content);
        const validation = this.validate(config);
        
        if (!validation.valid) {
          throw new Error(`Configuração inválida: ${validation.errors.join(', ')}`);
        }
        
        return { ...this.getDefault(), ...config };
      }
    } catch (error) {
      console.warn(`Falha ao carregar configuração: ${error}. Usando padrão.`);
    }
    
    return this.getDefault();
  }

  async save(config: Configuration): Promise<void> {
    const validation = this.validate(config);
    if (!validation.valid) {
      throw new Error(`Configuração inválida: ${validation.errors.join(', ')}`);
    }

    await fs.ensureDir(path.dirname(this.configPath));
    const content = yaml.stringify(config, { indent: 2 });
    await fs.writeFile(this.configPath, content, 'utf-8');
  }

  getDefault(): Configuration {
    return {
      model: {
        defaultModel: 'phi3:mini',
        temperature: 0.3,
        maxTokens: 2048,
        systemPrompt: undefined,
        fallbackModels: ['deepseek-coder:6.7b', 'codellama:13b']
      },
      agent: {
        name: 'Dev Assistant',
        personality: 'helpful',
        autoConfirm: false,
        maxPlanSteps: 12,
        contextWindow: 8192
      },
      cli: {
        theme: 'auto',
        showTimestamps: false,
        logLevel: 'info',
        historySize: 100
      },
      ollama: {
        host: 'localhost',
        port: 11434,
        timeout: 60000,
        retryAttempts: 1,
        keepAlive: '2m'
      }
    };
  }

  validate(config: Partial<Configuration>): ValidationResult {
    const errors: string[] = [];

    if (config.model) {
      if (config.model.temperature !== undefined && (config.model.temperature < 0 || config.model.temperature > 2)) {
        errors.push('Temperature deve estar entre 0 e 2');
      }
      if (config.model.maxTokens !== undefined && config.model.maxTokens < 1) {
        errors.push('maxTokens deve ser maior que 0');
      }
    }

    if (config.agent) {
      if (config.agent.personality && !['helpful', 'concise', 'detailed', 'creative'].includes(config.agent.personality)) {
        errors.push('Personalidade deve ser: helpful, concise, detailed ou creative');
      }
      if (config.agent.maxPlanSteps !== undefined && config.agent.maxPlanSteps < 1) {
        errors.push('maxPlanSteps deve ser maior que 0');
      }
    }

    if (config.cli) {
      if (config.cli.theme && !['dark', 'light', 'auto'].includes(config.cli.theme)) {
        errors.push('Tema deve ser: dark, light ou auto');
      }
      if (config.cli.logLevel && !['error', 'warn', 'info', 'debug'].includes(config.cli.logLevel)) {
        errors.push('logLevel deve ser: error, warn, info ou debug');
      }
    }

    if (config.ollama) {
      if (config.ollama.port !== undefined && (config.ollama.port < 1 || config.ollama.port > 65535)) {
        errors.push('Porta deve estar entre 1 e 65535');
      }
      if (config.ollama.timeout !== undefined && config.ollama.timeout < 1000) {
        errors.push('Timeout deve ser pelo menos 1000ms');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
