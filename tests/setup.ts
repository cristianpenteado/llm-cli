// Setup global para testes
import '@testing-library/jest-dom';

// Mock do console para evitar logs durante testes
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Mock do process.stdout para evitar problemas com readline
Object.defineProperty(process, 'stdout', {
  value: {
    write: jest.fn(),
    clearLine: jest.fn(),
    cursorTo: jest.fn(),
  },
});

// Mock do process.stdin
Object.defineProperty(process, 'stdin', {
  value: {
    on: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
  },
});

// Configuração global do Jest
jest.setTimeout(10000);

// Limpa todos os mocks após cada teste
afterEach(() => {
  jest.clearAllMocks();
});

// Limpa todos os timers após cada teste
afterEach(() => {
  jest.clearAllTimers();
});
