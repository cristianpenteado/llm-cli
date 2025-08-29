#!/usr/bin/env node

import { Command } from 'commander';
import { LLMCLI } from './core/LLMCLI';
import { ProjectManager } from './core/ProjectManager';
import { ModelManager } from './core/ModelManager';
import { ConversationManager } from './core/ConversationManager';
import { FileManager } from './core/FileManager';
import { MCPClient } from './mcp/MCPClient';
import { OllamaManager } from './ollama/OllamaManager';
import { Logger } from './utils/Logger';
import { Banner } from './utils/Banner';

const program = new Command();

// Mostrar banner principal
Banner.show();

// Configuração principal da CLI
program
  .name('llm')
  .description('CLI inteligente para desenvolvimento com modelos LLMs locais')
  .version('1.0.0')
  .option('--logs', 'Mostrar logs detalhados de todas as operações');

// Comando para inicializar projeto
program
  .command('init')
  .description('Inicializa um novo projeto LLM')
  .option('-m, --model <model>', 'Modelo específico para usar')
  .option('-f, --force', 'Forçar inicialização mesmo se projeto existir')
  .action(async (options) => {
    const cli = new LLMCLI(program.opts().logs);
    await cli.initializeProject(options);
  });

// Comando para iniciar chat
program
  .command('chat')
  .description('Inicia modo conversacional com IA')
  .option('-m, --model <model>', 'Modelo específico para usar')
  .action(async (options) => {
    const cli = new LLMCLI(program.opts().logs);
    await cli.startChat(options.model);
  });

// Comando para trocar modelo durante o uso
program
  .command('change-model')
  .description('Trocar o modelo LLM para o projeto atual')
  .option('-m, --model <model>', 'Nome do novo modelo (opcional - usa seleção interativa)')
  .action(async (options) => {
    try {
      const cli = new LLMCLI();
      await cli.changeModel(options.model);
    } catch (error) {
      Logger.error('Erro ao trocar modelo:', error);
      process.exit(1);
    }
  });

// Comando para definir modelo base padrão
program
  .command('set-default-model')
  .description('Definir modelo base padrão para todos os projetos')
  .argument('[model]', 'Nome do modelo padrão (opcional - usa seleção interativa)')
  .action(async (model) => {
    try {
      const cli = new LLMCLI();
      await cli.setDefaultModel(model);
    } catch (error) {
      Logger.error('Erro ao definir modelo padrão:', error);
      process.exit(1);
    }
  });

// Comando para listar modelos disponíveis
program
  .command('list-models')
  .description('Listar modelos LLMs disponíveis')
  .action(async () => {
    try {
      const cli = new LLMCLI();
      await cli.listModels();
    } catch (error) {
      Logger.error('Erro ao listar modelos:', error);
      process.exit(1);
    }
  });

// Comando para criar funcionalidade
program
  .command('create')
  .description('Criar nova funcionalidade no projeto')
  .argument('<type>', 'Tipo de funcionalidade (test, module, component, etc.)')
  .argument('<name>', 'Nome da funcionalidade')
  .option('-d, --description <description>', 'Descrição da funcionalidade')
  .action(async (type, name, options) => {
    try {
      const cli = new LLMCLI();
      await cli.createFeature(type, name, options.description);
    } catch (error) {
      Logger.error('Erro ao criar funcionalidade:', error);
      process.exit(1);
    }
  });

// Comando para editar arquivo
program
  .command('edit')
  .description('Editar arquivo existente')
  .argument('<file>', 'Caminho do arquivo')
  .argument('<instruction>', 'Instrução para edição')
  .action(async (file, instruction) => {
    try {
      const cli = new LLMCLI();
      await cli.editFile(file, instruction);
    } catch (error) {
      Logger.error('Erro ao editar arquivo:', error);
      process.exit(1);
    }
  });

// Comando para rollback
program
  .command('rollback')
  .description('Desfazer última alteração')
  .option('-n, --number <number>', 'Número de alterações para desfazer', '1')
  .action(async (options) => {
    try {
      const cli = new LLMCLI();
      await cli.rollback(parseInt(options.number));
    } catch (error) {
      Logger.error('Erro ao fazer rollback:', error);
      process.exit(1);
    }
  });

// Comando para status do projeto
program
  .command('status')
  .description('Mostrar status do projeto atual')
  .action(async () => {
    try {
      const cli = new LLMCLI();
      await cli.showStatus();
    } catch (error) {
      Logger.error('Erro ao mostrar status:', error);
      process.exit(1);
    }
  });

// Se nenhum comando for especificado, iniciar modo conversacional
if (process.argv.length === 2) {
  program.parse();
  const cli = new LLMCLI();
  cli.startChat().catch((error) => {
    Logger.error('Erro ao iniciar CLI:', error);
    process.exit(1);
  });
} else {
  program.parse();
}
