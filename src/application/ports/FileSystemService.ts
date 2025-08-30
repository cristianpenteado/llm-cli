import { FileNode } from '../../domain/agent/Agent';

export interface FileSystemService {
  exists(path: string): Promise<boolean>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  readDirectory(path: string, recursive?: boolean): Promise<FileNode[]>;
  createDirectory(path: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  deleteDirectory(path: string): Promise<void>;
  getStats(path: string): Promise<FileStats>;
}

export interface FileStats {
  size: number;
  isFile: boolean;
  isDirectory: boolean;
  modifiedAt: Date;
  createdAt: Date;
}
