import { Agent } from '../../domain/agent/Agent';
import { ModelProvider } from '../../domain/communication/ModelProvider';
import { Configuration, ConfigurationRepository } from '../../domain/configuration/Configuration';
import { FileSystemService } from '../../application/ports/FileSystemService';
import { Logger } from '../../application/ports/Logger';

import { AgentService } from '../../application/services/AgentService';
import { OllamaProvider } from '../ollama/OllamaProvider';
import { FileConfigurationRepository } from '../configuration/FileConfigurationRepository';
import { NodeFileSystemService } from '../filesystem/NodeFileSystemService';
import { ConsoleLogger } from '../logging/ConsoleLogger';
import { CLI } from '../cli/CLI';

export class Container {
  private instances = new Map<string, any>();
  private config: Configuration | null = null;

  async resolve<T>(key: string): Promise<T> {
    if (this.instances.has(key)) {
      return this.instances.get(key);
    }

    const instance = await this.createInstance(key);
    this.instances.set(key, instance);
    return instance;
  }

  private async createInstance(key: string): Promise<any> {
    switch (key) {
      case 'Configuration':
        if (!this.config) {
          const configRepo = await this.resolve<ConfigurationRepository>('ConfigurationRepository');
          this.config = await configRepo.load();
        }
        return this.config;

      case 'ConfigurationRepository':
        return new FileConfigurationRepository();

      case 'Logger':
        const config = await this.resolve<Configuration>('Configuration');
        return new ConsoleLogger(config.cli.logLevel);

      case 'FileSystemService':
        return new NodeFileSystemService();

      case 'ModelProvider':
        const ollamaConfig = await this.resolve<Configuration>('Configuration');
        return new OllamaProvider(ollamaConfig.ollama);

      case 'Agent':
        const modelProvider = await this.resolve<ModelProvider>('ModelProvider');
        const fileSystem = await this.resolve<FileSystemService>('FileSystemService');
        const agentConfig = await this.resolve<Configuration>('Configuration');
        return new AgentService(modelProvider, fileSystem, agentConfig);

      case 'CLI':
        const agent = await this.resolve<Agent>('Agent');
        const provider = await this.resolve<ModelProvider>('ModelProvider');
        const cliConfig = await this.resolve<Configuration>('Configuration');
        const cliLogger = await this.resolve<Logger>('Logger');
        return new CLI(agent, provider, cliConfig, cliLogger);

      default:
        throw new Error(`Unknown dependency: ${key}`);
    }
  }
}
