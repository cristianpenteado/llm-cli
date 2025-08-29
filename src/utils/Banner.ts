import chalk from 'chalk';

export class Banner {
  /**
   * Exibe o banner principal do LLM CLI
   */
  static show(): void {
    console.log('\n');
    console.log(chalk.hex('#8B5CF6')('██╗     ██╗      ███╗   ███╗     ██████╗██╗     ██╗'));
    console.log(chalk.hex('#A78BFA')('██║     ██║     ║████╗ ████║    ██╔════╝██║     ██║'));
    console.log(chalk.hex('#C4B5FD')('██║     ██║     ║██╔████╔██║    ██║     ██║     ██║'));
    console.log(chalk.hex('#DDD6FE')('██║     ██║     ║██║╚██╔╝██║    ██║     ██║     ██║'));
    console.log(chalk.hex('#EDE9FE')('███████╗███████╗║██║ ╚═╝ ██║    ╚██████╗███████╗██║'));
    console.log(chalk.hex('#F3F4F6')('╚══════╝╚══════╝╚═╝╚═╝     ╚═╝     ╚═════╝╚══════╝╚═╝'));
    console.log('\n');
    console.log(chalk.hex('#8B5CF6').bold('╔══════════════════════════════════════════════════════════════╗'));
    console.log(chalk.hex('#A78BFA').bold('║                    AI Agent Terminal                        ║'));
    console.log(chalk.hex('#C4B5FD').bold('║              Desenvolvido para a comunidade ❤️               ║'));
    console.log(chalk.hex('#DDD6FE').bold('╚══════════════════════════════════════════════════════════════╝'));
    console.log('\n');
  }

  /**
   * Exibe o banner do chat
   */
  static showChat(): void {
    console.log('\n');
    console.log(chalk.hex('#8B5CF6')('╔══════════════════════════════════════════════════════════════╗'));
    console.log(chalk.hex('#A78BFA')('║                        💬 CHAT MODE                          ║'));
    console.log(chalk.hex('#C4B5FD')('║                    Iniciando conversa...                      ║'));
    console.log(chalk.hex('#DDD6FE')('║              Desenvolvido para a comunidade ❤️               ║'));
    console.log(chalk.hex('#EDE9FE')('╚══════════════════════════════════════════════════════════════╝'));
    console.log('\n');
  }

  /**
   * Exibe o banner de inicialização de projeto
   */
  static showInit(): void {
    console.log('\n');
    console.log(chalk.hex('#8B5CF6')('╔══════════════════════════════════════════════════════════════╗'));
    console.log(chalk.hex('#A78BFA')('║                     🚀 PROJECT INIT                          ║'));
    console.log(chalk.hex('#C4B5FD')('║                  Inicializando projeto...                     ║'));
    console.log(chalk.hex('#DDD6FE')('║              Desenvolvido para a comunidade ❤️               ║'));
    console.log(chalk.hex('#EDE9FE')('╚══════════════════════════════════════════════════════════════╝'));
    console.log('\n');
  }
}
