import { Agent } from '../../domain/agent/Agent';
import { Logger } from '../../domain/Logger';
import { ConversationContext } from '../../domain/agent/ConversationContext';
import { ModelProvider } from '../../domain/communication/ModelProvider';
import { Configuration, ConfigurationRepository } from '../../domain/configuration/Configuration';
import { FileSystemService } from '../../application/ports/FileSystemService';
import { ConsoleLogger } from '../logging/ConsoleLogger';
import { CLI } from '../cli/CLI';
import { AgentService } from '../../application/services/AgentService';
import { OllamaProvider } from '../ollama/OllamaProvider';
import { FileConfigurationRepository } from '../configuration/FileConfigurationRepository';
import { NodeFileSystemService } from '../filesystem/NodeFileSystemService';

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

      case 'ConversationContext':
        return new ConversationContext();

      case 'CLI':
        const agent = await this.resolve<Agent>('Agent');
        const provider = await this.resolve<ModelProvider>('ModelProvider');
        const cliConfig = await this.resolve<Configuration>('Configuration');
        const cliLogger = await this.resolve<Logger>('Logger');
        const conversationContext = await this.resolve<ConversationContext>('ConversationContext');
        const cli = new CLI(
          agent,
          cliLogger,
          conversationContext
        );
        return cli;

      default:
        throw new Error(`Unknown dependency: ${key}`);
    }
  }

  public get<T>(name: string): T {
    const service = this.instances.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found in container`);
    }
    return service as T;
  }

  public async createCLI(): Promise<CLI> {
    const agent = await this.resolve<Agent>('Agent');
    const logger = await this.resolve<Logger>('Logger');
    const conversationContext = await this.resolve<ConversationContext>('ConversationContext');
    
    return new CLI(
      agent,
      logger,
      conversationContext
    );
  }
}
