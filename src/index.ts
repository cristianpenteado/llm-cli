#!/usr/bin/env node

import { CLI } from './infrastructure/cli/CLI';
import { Container } from './infrastructure/di/Container';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  // Handle simple commands without initializing full system
  if (args.includes('--version') || args.includes('-v')) {
    console.log('1.0.0');
    process.exit(0);
  }
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🤖 LLM-CLI - Assistente de IA para Desenvolvimento

Uso: llm [opções]

Opções:
  -v, --version       Mostra a versão
  -h, --help          Mostra esta ajuda
  --model <nome>      Especifica o modelo a usar

Para usar o chat interativo, execute apenas: llm
`);
    process.exit(0);
  }

  // Extract model from args
  const modelIndex = args.findIndex(arg => arg.startsWith('--model'));
  let selectedModel: string | undefined;
  
  if (modelIndex !== -1) {
    if (args[modelIndex].includes('=')) {
      selectedModel = args[modelIndex].split('=')[1];
    } else if (args[modelIndex + 1]) {
      selectedModel = args[modelIndex + 1];
    }
  }

  // Initialize full system only for interactive chat
  try {
    const container = new Container();
    const cli = await container.resolve<CLI>('CLI');
    await cli.run(selectedModel);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
