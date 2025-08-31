export type ChunkCallback = (chunk: string) => void;

export interface Agent {
  processQuery(query: string, onChunk?: ChunkCallback, signal?: AbortSignal): Promise<AgentResponse>;
  createPlan(task: string): Promise<TaskPlan>;
  executeStep(step: TaskStep, confirmation: boolean): Promise<StepResult>;
  readProject(path?: string): Promise<ProjectContext>;
  generateCode(specification: CodeSpecification): Promise<CodeResult>;
  analyzeProjectStructure(path?: string): Promise<ProjectAnalysis>;
}

export interface AgentResponse {
  content: string;
  type?: 'code' | 'text' | 'markdown' | 'json' | 'casual' | 'technical' | 'plan' | 'analysis' | 'error';
}

export interface ProjectAnalysis {
  files: string[];
  dependencies: { [key: string]: string };
  structure: { [key: string]: any };
  technologies: string[];
  entryPoints: string[];
  designPatterns: string[];
  summary?: string;
}

export interface TaskStep {
  id: string;
  title: string;
  command?: string;
  description?: string;
  type?: string;
  dependencies?: string[];
}

export interface TaskPlan {
  id: string;
  title: string;
  description: string;
  estimatedTime?: string;
  steps: TaskStep[];
}

export interface ConfirmationResult {
  confirmed: boolean;
  message?: string;
}

export interface StepResult {
  success: boolean;
  message?: string;
  filesModified?: string[];
}

export interface ProjectContext {
  structure: FileNode[];
  technologies: string[];
  dependencies: { [key: string]: string };
  description: string;
}

export interface CodeSpecification {
  type: string;
  language: string;
  description: string;
  requirements: string[];
  tests?: boolean;
}

export interface CodeResult {
  code: string;
  files?: Array<{
    path: string;
    content: string;
    type: string;
  }>;
  message?: string;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileNode[];
}
