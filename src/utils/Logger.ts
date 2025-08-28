import chalk from 'chalk';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export class Logger {
  private static currentLevel: LogLevel = LogLevel.INFO;
  private static isColored: boolean = true;

  /**
   * Define o nível de log
   */
  static setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  /**
   * Habilita/desabilita cores
   */
  static setColored(colored: boolean): void {
    this.isColored = colored;
  }

  /**
   * Log de debug
   */
  static debug(message: string, ...args: any[]): void {
    if (this.currentLevel <= LogLevel.DEBUG) {
      const formattedMessage = this.formatMessage('DEBUG', message, chalk.gray);
      console.log(formattedMessage, ...args);
    }
  }

  /**
   * Log de informação
   */
  static info(message: string, ...args: any[]): void {
    if (this.currentLevel <= LogLevel.INFO) {
      const formattedMessage = this.formatMessage('INFO', message, chalk.blue);
      console.log(formattedMessage, ...args);
    }
  }

  /**
   * Log de sucesso
   */
  static success(message: string, ...args: any[]): void {
    if (this.currentLevel <= LogLevel.INFO) {
      const formattedMessage = this.formatMessage('SUCCESS', message, chalk.green);
      console.log(formattedMessage, ...args);
    }
  }

  /**
   * Log de aviso
   */
  static warn(message: string, ...args: any[]): void {
    if (this.currentLevel <= LogLevel.WARN) {
      const formattedMessage = this.formatMessage('WARN', message, chalk.yellow);
      console.warn(formattedMessage, ...args);
    }
  }

  /**
   * Log de erro
   */
  static error(message: string, ...args: any[]): void {
    if (this.currentLevel <= LogLevel.ERROR) {
      const formattedMessage = this.formatMessage('ERROR', message, chalk.red);
      console.error(formattedMessage, ...args);
    }
  }

  /**
   * Log de erro crítico
   */
  static critical(message: string, ...args: any[]): void {
    if (this.currentLevel <= LogLevel.ERROR) {
      const formattedMessage = this.formatMessage('CRITICAL', message, chalk.red.bold);
      console.error(formattedMessage, ...args);
    }
  }

  /**
   * Log de progresso
   */
  static progress(message: string, ...args: any[]): void {
    if (this.currentLevel <= LogLevel.INFO) {
      const formattedMessage = this.formatMessage('PROGRESS', message, chalk.cyan);
      console.log(formattedMessage, ...args);
    }
  }

  /**
   * Log de comando
   */
  static command(message: string, ...args: any[]): void {
    if (this.currentLevel <= LogLevel.INFO) {
      const formattedMessage = this.formatMessage('CMD', message, chalk.magenta);
      console.log(formattedMessage, ...args);
    }
  }

  /**
   * Log de arquivo
   */
  static file(message: string, ...args: any[]): void {
    if (this.currentLevel <= LogLevel.INFO) {
      const formattedMessage = this.formatMessage('FILE', message, chalk.blue.bold);
      console.log(formattedMessage, ...args);
    }
  }

  /**
   * Log de modelo
   */
  static model(message: string, ...args: any[]): void {
    if (this.currentLevel <= LogLevel.INFO) {
      const formattedMessage = this.formatMessage('MODEL', message, chalk.green.bold);
      console.log(formattedMessage, ...args);
    }
  }

  /**
   * Log de projeto
   */
  static project(message: string, ...args: any[]): void {
    if (this.currentLevel <= LogLevel.INFO) {
      const formattedMessage = this.formatMessage('PROJECT', message, chalk.yellow.bold);
      console.log(formattedMessage, ...args);
    }
  }

  /**
   * Log de hardware
   */
  static hardware(message: string, ...args: any[]): void {
    if (this.currentLevel <= LogLevel.INFO) {
      const formattedMessage = this.formatMessage('HARDWARE', message, chalk.cyan.bold);
      console.log(formattedMessage, ...args);
    }
  }

  /**
   * Log de MCP
   */
  static mcp(message: string, ...args: any[]): void {
    if (this.currentLevel <= LogLevel.INFO) {
      const formattedMessage = this.formatMessage('MCP', message, chalk.magenta.bold);
      console.log(formattedMessage, ...args);
    }
  }

  /**
   * Log de Vlama
   */
  static vlama(message: string, ...args: any[]): void {
    if (this.currentLevel <= LogLevel.INFO) {
      const formattedMessage = this.formatMessage('VLAMA', message, chalk.blue.bold);
      console.log(formattedMessage, ...args);
    }
  }

  /**
   * Formata mensagem de log
   */
  private static formatMessage(level: string, message: string, colorFn: (text: string) => string): string {
    const timestamp = new Date().toISOString();
    const levelStr = `[${level}]`;
    
    if (this.isColored) {
      return `${chalk.gray(timestamp)} ${colorFn(levelStr)} ${message}`;
    } else {
      return `${timestamp} ${levelStr} ${message}`;
    }
  }

  /**
   * Cria separador visual
   */
  static separator(char: string = '=', length: number = 80): void {
    if (this.currentLevel <= LogLevel.INFO) {
      const separator = char.repeat(length);
      if (this.isColored) {
        console.log(chalk.gray(separator));
      } else {
        console.log(separator);
      }
    }
  }

  /**
   * Cria cabeçalho
   */
  static header(title: string, char: string = '='): void {
    if (this.currentLevel <= LogLevel.INFO) {
      this.separator(char);
      if (this.isColored) {
        console.log(chalk.bold.blue(title));
      } else {
        console.log(title);
      }
      this.separator(char);
    }
  }

  /**
   * Cria subcabeçalho
   */
  static subheader(title: string, char: string = '-'): void {
    if (this.currentLevel <= LogLevel.INFO) {
      this.separator(char);
      if (this.isColored) {
        console.log(chalk.bold.cyan(title));
      } else {
        console.log(title);
      }
      this.separator(char);
    }
  }

  /**
   * Log de tabela
   */
  static table(data: any[], columns: string[]): void {
    if (this.currentLevel <= LogLevel.INFO) {
      // Implementar formatação de tabela se necessário
      console.table(data);
    }
  }

  /**
   * Log de lista
   */
  static list(items: string[], title?: string): void {
    if (this.currentLevel <= LogLevel.INFO) {
      if (title) {
        if (this.isColored) {
          console.log(chalk.bold.cyan(title));
        } else {
          console.log(title);
        }
      }
      
      items.forEach((item, index) => {
        if (this.isColored) {
          console.log(chalk.gray(`${index + 1}.`), item);
        } else {
          console.log(`${index + 1}. ${item}`);
        }
      });
    }
  }

  /**
   * Log de estatísticas
   */
  static stats(stats: Record<string, any>): void {
    if (this.currentLevel <= LogLevel.INFO) {
      if (this.isColored) {
        console.log(chalk.bold.cyan('📊 Estatísticas:'));
      } else {
        console.log('📊 Estatísticas:');
      }
      
      Object.entries(stats).forEach(([key, value]) => {
        if (this.isColored) {
          console.log(`  ${chalk.gray(key)}: ${chalk.blue(value)}`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      });
    }
  }

  /**
   * Log de tempo de execução
   */
  static time(label: string, fn: () => any): any {
    if (this.currentLevel <= LogLevel.DEBUG) {
      const start = performance.now();
      const result = fn();
      const end = performance.now();
      const duration = (end - start).toFixed(2);
      
      if (this.isColored) {
        console.log(chalk.gray(`⏱️  ${label}: ${chalk.blue(duration)}ms`));
      } else {
        console.log(`⏱️  ${label}: ${duration}ms`);
      }
      
      return result;
    } else {
      return fn();
    }
  }

  /**
   * Log de tempo de execução assíncrono
   */
  static async timeAsync(label: string, fn: () => Promise<any>): Promise<any> {
    if (this.currentLevel <= LogLevel.DEBUG) {
      const start = performance.now();
      const result = await fn();
      const end = performance.now();
      const duration = (end - start).toFixed(2);
      
      if (this.isColored) {
        console.log(chalk.gray(`⏱️  ${label}: ${chalk.blue(duration)}ms`));
      } else {
        console.log(`⏱️  ${label}: ${duration}ms`);
      }
      
      return result;
    } else {
      return await fn();
    }
  }

  /**
   * Limpa a tela
   */
  static clear(): void {
    if (this.currentLevel <= LogLevel.INFO) {
      console.clear();
    }
  }

  /**
   * Log de nova linha
   */
  static newline(): void {
    if (this.currentLevel <= LogLevel.INFO) {
      console.log();
    }
  }
}
