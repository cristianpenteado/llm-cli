import { CLI } from './src/infrastructure/cli/CLI';
import { AgentService } from './src/application/services/AgentService';
import { OllamaProvider } from './src/infrastructure/ollama/OllamaProvider';
import { NodeFileSystemService } from './src/infrastructure/filesystem/NodeFileSystemService';
import { ConsoleLogger } from './src/infrastructure/logging/ConsoleLogger';
import { Configuration } from './src/domain/configuration/Configuration';

async function testCLI() {
  const mockConfig: Configuration = {
    model: {
      defaultModel: 'llama3',
      temperature: 0.7,
      maxTokens: 2000,
      systemPrompt: 'You are a helpful AI assistant',
      fallbackModels: ['llama2', 'mistral']
    },
    cli: {
      theme: 'dark',
      showTimestamps: true,
      logLevel: 'info',
      historySize: 100
    },
    ollama: {
      host: 'localhost',
      port: 11434,
      timeout: 30000,
      retryAttempts: 3,
      keepAlive: '5m'
    },
    agent: {
      name: 'llm-cli',
      personality: 'helpful',
      autoConfirm: false,
      maxPlanSteps: 10,
      contextWindow: 4000
    }
  };

  const logger = new ConsoleLogger('info');
  const fileSystem = new NodeFileSystemService();
  const modelProvider = new OllamaProvider(mockConfig.ollama);
  const agent = new AgentService(modelProvider, fileSystem, mockConfig);
  
  const cli = new CLI(agent, modelProvider, mockConfig, logger);
  
  console.log('Starting CLI test...');
  console.log('Banner content:');
  console.log(cli['getBannerContent']());
  
  // Test banner with a message
  console.log('Banner with message:');
  console.log(cli['getBannerContent']());
  
  console.log('\nTest complete!');
}

testCLI().catch(console.error);
