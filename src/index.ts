#!/usr/bin/env node

import { CLI } from './infrastructure/cli/CLI';
import { Container } from './infrastructure/di/Container';

async function main(): Promise<void> {
  try {
    const container = new Container();
    const cli = await container.resolve<CLI>('CLI');
    await cli.run();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
