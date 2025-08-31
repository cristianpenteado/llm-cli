import { CLI } from './src/infrastructure/cli/CLI';

// Create a mock CLI instance and test the banner
const cli = new CLI({
  processQuery: async () => ({ content: 'Test response' }),
  createPlan: async () => ({} as any),
  executeStep: async () => ({} as any),
  readProject: async () => ({} as any),
  generateCode: async () => ({} as any)
} as any, {
  listModels: async () => [],
  sendPrompt: async () => ({ content: 'Test response' })
} as any, {
  model: { defaultModel: 'test' },
  cli: { logLevel: 'info' }
} as any, {
  info: console.log,
  error: console.error,
  debug: console.debug
} as any);

// Test banner display
console.log('Testing banner display...');
console.log(cli['getBannerContent']());
console.log('Banner test complete!');
