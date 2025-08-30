// Jest setup file
import 'jest';

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock process.exit to prevent tests from actually exiting
const mockExit = jest.fn();
process.exit = mockExit as any;

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  mockExit.mockClear();
});
