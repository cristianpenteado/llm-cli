import * as fs from 'fs-extra';
import * as path from 'path';
import { FileSystemService, FileStats } from '../../application/ports/FileSystemService';
import { FileNode } from '../../domain/agent/Agent';

export class NodeFileSystemService implements FileSystemService {
  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async readFile(filePath: string): Promise<string> {
    return await fs.readFile(filePath, 'utf-8');
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content, 'utf-8');
  }

  async readDirectory(dirPath: string, recursive = false): Promise<FileNode[]> {
    const items = await fs.readdir(dirPath);
    const nodes: FileNode[] = [];

    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = await fs.stat(itemPath);
      
      const node: FileNode = {
        name: item,
        path: itemPath,
        type: stats.isDirectory() ? 'directory' : 'file',
        size: stats.isFile() ? stats.size : undefined
      };

      if (recursive && stats.isDirectory()) {
        node.children = await this.readDirectory(itemPath, true);
      }

      nodes.push(node);
    }

    return nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  async createDirectory(dirPath: string): Promise<void> {
    await fs.ensureDir(dirPath);
  }

  async deleteFile(filePath: string): Promise<void> {
    await fs.remove(filePath);
  }

  async deleteDirectory(dirPath: string): Promise<void> {
    await fs.remove(dirPath);
  }

  async getStats(filePath: string): Promise<FileStats> {
    const stats = await fs.stat(filePath);
    
    return {
      size: stats.size,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      modifiedAt: stats.mtime,
      createdAt: stats.birthtime
    };
  }
}
