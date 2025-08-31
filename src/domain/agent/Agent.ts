export type ChunkCallback = (chunk: string) => void;

export interface Agent {
  processQuery(query: string, onChunk?: ChunkCallback, signal?: AbortSignal): Promise<AgentResponse>;
  createPlan(task: string): Promise<TaskPlan>;
  executeStep(step: TaskStep, confirmation: ConfirmationResult): Promise<StepResult>;
  readProject(path?: string): Promise<ProjectContext>;
  generateCode(specification: CodeSpecification): Promise<CodeResult>;
}

export interface AgentResponse {
  content: string;
  type: 'answer' | 'plan' | 'code' | 'error';
  metadata?: Record<string, any>;
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
  type: 'analysis' | 'implementation' | 'testing' | 'documentation';
  dependencies?: string[];
  files?: string[];
  commands?: string[];
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
