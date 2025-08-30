import chalk from 'chalk';
import { Logger, LogLevel } from '../../application/ports/Logger';

export class ConsoleLogger implements Logger {
  constructor(private level: LogLevel = 'info') {}

  debug(message: string, meta?: Record<string, any>): void {
    if (this.shouldLog('debug')) {
      console.log(chalk.gray(`[DEBUG] ${message}`), meta ? chalk.gray(JSON.stringify(meta)) : '');
    }
  }

  info(message: string, meta?: Record<string, any>): void {
    if (this.shouldLog('info')) {
      console.log(chalk.blue(`[INFO] ${message}`), meta ? chalk.gray(JSON.stringify(meta)) : '');
    }
  }

  warn(message: string, meta?: Record<string, any>): void {
    if (this.shouldLog('warn')) {
      console.log(chalk.yellow(`[WARN] ${message}`), meta ? chalk.yellow(JSON.stringify(meta)) : '');
    }
  }

  error(message: string, meta?: Record<string, any>): void {
    if (this.shouldLog('error')) {
      console.error(chalk.red(`[ERROR] ${message}`), meta ? chalk.red(JSON.stringify(meta)) : '');
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    
    return levels[level] >= levels[this.level];
  }
}
