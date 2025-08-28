import chalk from 'chalk';

export class Banner {
  /**
   * Exibe o banner principal do LLM-CLI
   */
  static show(): void {
    console.log('\n');
    console.log(chalk.hex('#FF6B6B')('██╗     ██╗██╗  ██╗███╗   ███╗'));
    console.log(chalk.hex('#FF8E53')('██║     ██║██║ ██╔╝████╗ ████║'));
    console.log(chalk.hex('#FFB347')('██║     ██║█████╔╝ ██╔████╔██║'));
    console.log(chalk.hex('#FFD700')('██║     ██║██╔═██╗ ██║╚██╔╝██║'));
    console.log(chalk.hex('#9ACD32')('███████╗██║██║  ██╗██║ ╚═╝ ██║'));
    console.log(chalk.hex('#32CD32')('╚══════╝╚═╝╚═╝  ╚═╝╚═╝     ╚═╝'));
    console.log('\n');
    console.log(chalk.hex('#FF6B6B').bold('╔══════════════════════════════════════════════════════════════╗'));
    console.log(chalk.hex('#FF8E53').bold('║                    AI Agent Terminal                        ║'));
    console.log(chalk.hex('#FFB347').bold('║                 Powered by Local LLMs                      ║'));
    console.log(chalk.hex('#FFD700').bold('╚══════════════════════════════════════════════════════════════╝'));
    console.log('\n');
  }

  /**
   * Exibe o banner do chat
   */
  static showChat(): void {
    console.log('\n');
    console.log(chalk.hex('#FF6B6B')('╔══════════════════════════════════════════════════════════════╗'));
    console.log(chalk.hex('#FF8E53')('║                        💬 CHAT MODE                          ║'));
    console.log(chalk.hex('#FFB347')('║                    Iniciando conversa...                      ║'));
    console.log(chalk.hex('#FFD700')('╚══════════════════════════════════════════════════════════════╝'));
    console.log('\n');
  }

  /**
   * Exibe o banner de inicialização de projeto
   */
  static showInit(): void {
    console.log('\n');
    console.log(chalk.hex('#FF6B6B')('╔══════════════════════════════════════════════════════════════╗'));
    console.log(chalk.hex('#FF8E53')('║                     🚀 PROJECT INIT                          ║'));
    console.log(chalk.hex('#FFB347')('║                  Inicializando projeto...                     ║'));
    console.log(chalk.hex('#FFD700')('╚══════════════════════════════════════════════════════════════╝'));
    console.log('\n');
  }
}
