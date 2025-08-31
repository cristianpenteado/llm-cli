export interface Agent {
  analyzeProjectStructure(path?: string): Promise<ProjectAnalysis>;
  createPlan(task: string): Promise<Plan>;
  executeStep(step: Step, confirmation: boolean): Promise<CommandResult>;
}

export interface Logger {
  debug(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
}

export interface ConversationContext {
  getFormattedHistory(): string;
}

export interface ProjectAnalysis {
  files: string[];
  dependencies: {
    [key: string]: string;
  };
  structure: {
    [key: string]: any;
  };
}

export interface Step {
  title: string;
  command?: string;
}

export interface Plan {
  title: string;
  description: string;
  estimatedTime?: string;
  steps: Step[];
}

export interface CommandResult {
  success: boolean;
  message?: string;
  filesModified?: string[];
}