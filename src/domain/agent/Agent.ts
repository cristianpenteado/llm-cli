export type ChunkCallback = (chunk: string) => void;

export interface Agent {
  processQuery(query: string, onChunk?: ChunkCallback, signal?: AbortSignal): Promise<AgentResponse>;
  createPlan(task: string): Promise<TaskPlan>;
  executeStep(step: TaskStep, confirmation: ConfirmationResult): Promise<StepResult>;
  readProject(path?: string): Promise<ProjectContext>;
  generateCode(specification: CodeSpecification): Promise<CodeResult>;
  analyzeProjectStructure(path?: string): Promise<ProjectAnalysis>;
}

export interface ProjectAnalysis {
  structure: FileNode[];
  technologies: string[];
  entryPoints: string[];
  dependencies: string[];
  designPatterns: string[];
  summary: string;
}

export type ResponseType = 'casual' | 'technical' | 'code' | 'plan' | 'analysis' | 'error';

export interface AgentResponse {
  content: string;
  type: ResponseType;
  metadata?: {
    requiresConfirmation?: boolean;
    confirmationOptions?: {
      type: 'sim/skip/stop' | 'yes/no' | 'custom';
      message?: string;
      options?: string[];
    };
    files?: string[];
    commands?: string[];
    [key: string]: any;
  };
}

export interface TaskPlan {
  id: string;
  title: string;
  description: string;
  steps: TaskStep[];
  estimatedTime?: string;
}

export interface TaskStep {
  id: string;
  title: string;
  description: string;
  type: 'analysis' | 'implementation' | 'testing' | 'documentation' | 'confirmation';
  dependencies?: string[];
  files?: string[];
  commands?: string[];
  requiresConfirmation?: boolean;
  confirmationPrompt?: string;
  confirmationOptions?: string[]; // e.g., ['sim', 'skip', 'stop']
}

export interface ConfirmationResult {
  action: 'sim' | 'skip' | 'stop';
  reason?: string;
}

export interface StepResult {
  success: boolean;
  output?: string;
  error?: string;
  filesModified?: string[];
  nextStep?: string;
}

export interface ProjectContext {
  structure: FileNode[];
  technologies: string[];
  dependencies: Record<string, string>;
  description?: string;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileNode[];
  content?: string;
}

export interface CodeSpecification {
  language: string;
  framework?: string;
  description: string;
  requirements: string[];
  files?: string[];
  context?: ProjectContext;
}

export interface CodeResult {
  files: GeneratedFile[];
  instructions: string[];
  dependencies?: string[];
  tests?: GeneratedFile[];
}

export interface GeneratedFile {
  path: string;
  content: string;
  type: 'create' | 'modify' | 'delete';
}
