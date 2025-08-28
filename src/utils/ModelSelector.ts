import inquirer from 'inquirer';
import cliProgress from 'cli-progress';
import ora from 'ora';
import { Logger } from './Logger';
import { OllamaManager } from '../ollama/OllamaManager';
import { ModelConfig } from '../types';

export interface SuggestedModel {
  name: string;
  description: string;
  size: string;
  recommended: boolean;
  category: 'coding' | 'general' | 'quantized';
}

export class ModelSelector {
  private ollamaManager: OllamaManager;

  constructor(ollamaManager: OllamaManager) {
    this.ollamaManager = ollamaManager;
  }

  /**
   * Lista de modelos sugeridos padrão
   */
  private getSuggestedModels(): SuggestedModel[] {
    return [
      {
        name: 'deepseek-coder:6.7b',
        description: 'Modelo especializado em código, excelente para desenvolvimento',
        size: '~6.7GB',
        recommended: true,
        category: 'coding'
      },
      {
        name: 'qwen2.5-coder:7b',
        description: 'Modelo de código da Alibaba, bom equilíbrio performance/tamanho',
        size: '~7GB',
        recommended: true,
        category: 'coding'
      },
      {
        name: 'deepseek-coder-v2-lite:16b',
        description: 'Versão lite do DeepSeek Coder V2, mais rápido',
        size: '~16GB',
        recommended: false,
        category: 'coding'
      },
      {
        name: 'codellama:13b',
        description: 'Code LLaMA 13B, excelente para código complexo',
        size: '~13GB',
        recommended: true,
        category: 'coding'
      },
      {
        name: 'phi-3-mini:3.8b',
        description: 'Phi-3 Mini, modelo compacto e eficiente',
        size: '~3.8GB',
        recommended: true,
        category: 'general'
      },
      {
        name: 'mistral-codestral:7b',
        description: 'Mistral especializado em código',
        size: '~7GB',
        recommended: false,
        category: 'coding'
      },
      {
        name: 'llama3.1:8b',
        description: 'LLaMA 3.1 8B, modelo geral versátil',
        size: '~8GB',
        recommended: false,
        category: 'general'
      },
      {
        name: 'codegemma:7b',
        description: 'CodeGemma da Google, especializado em código',
        size: '~7GB',
        recommended: false,
        category: 'coding'
      },
      {
        name: 'ode-llama:13b',
        description: 'OdeLLaMA 13B quantizado Q4_K_M, otimizado para código',
        size: '~13GB',
        recommended: true,
        category: 'coding'
      },
      {
        name: 'mistral-codestral:7b',
        description: 'Mistral Codestral 7B, especializado em desenvolvimento',
        size: '~7GB',
        recommended: false,
        category: 'coding'
      }
    ];
  }

  /**
   * Seleciona modelo interativamente
   */
  async selectModel(): Promise<string> {
    Logger.info('🤖 Seleção de Modelo LLM');
    Logger.info('Escolha uma opção para seu projeto:');
    Logger.newline();

    // Obter modelos disponíveis no Ollama
    const availableModels = await this.ollamaManager.listModels();
    const availableModelNames = availableModels.map(m => m.name);

    // Filtrar modelos sugeridos que estão disponíveis
    const suggestedModels = this.getSuggestedModels();
    const availableSuggested = suggestedModels.filter(model => 
      availableModelNames.includes(model.name)
    );

    // Modelos disponíveis mas não na lista sugerida
    const otherAvailable = availableModels.filter(model => 
      !suggestedModels.some(s => s.name === model.name)
    );

    // Criar opções para o inquirer
    const choices = [];

    // Adicionar opção de setup completo
    choices.push(new inquirer.Separator('🚀 SETUP COMPLETO'));
    choices.push({
      name: '🚀 Setup Completo - Selecionar e baixar modelos',
      value: 'setup_complete'
    });

    // Adicionar modelos sugeridos disponíveis
    if (availableSuggested.length > 0) {
      choices.push(new inquirer.Separator('✅ MODELOS DISPONÍVEIS'));
      availableSuggested.forEach(model => {
        choices.push({
          name: `${model.name} - ${model.description} (${model.size})`,
          value: model.name,
          short: model.name
        });
      });
    }

    // Adicionar outros modelos disponíveis
    if (otherAvailable.length > 0) {
      choices.push(new inquirer.Separator('📚 OUTROS MODELOS'));
      otherAvailable.forEach(model => {
        choices.push({
          name: `${model.name} - ${model.description} (${model.size})`,
          value: model.name,
          short: model.name
        });
      });
    }

    // Adicionar opção para baixar modelo
    choices.push(new inquirer.Separator('📥 BAIXAR MODELO'));
    choices.push({
      name: '📥 Baixar modelo específico...',
      value: 'download'
    });

    // Adicionar opção para digitar nome manualmente
    choices.push({
      name: '✏️ Digitar nome do modelo...',
      value: 'manual'
    });

    const { selectedModel } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedModel',
        message: 'Escolha uma opção:',
        choices: choices,
        pageSize: 12
      }
    ]);

    if (selectedModel === 'setup_complete') {
      return await this.handleSetupComplete();
    } else if (selectedModel === 'download') {
      return await this.handleModelDownload();
    } else if (selectedModel === 'manual') {
      return await this.handleManualModelInput();
    }

    return selectedModel;
  }

  /**
   * Gerencia setup completo automático
   */
  private async handleSetupComplete(): Promise<string> {
    Logger.info('🚀 Setup Completo - Seleção de Modelos');
    Logger.info('Escolha quais modelos deseja baixar:');
    Logger.newline();

    const availableModels = [
      {
        name: 'deepseek-coder:6.7b',
        description: 'Modelo especializado em código, excelente para desenvolvimento',
        size: '~6.7GB',
        recommended: true
      },
      {
        name: 'qwen2.5-coder:7b',
        description: 'Modelo de código da Alibaba, bom equilíbrio performance/tamanho',
        size: '~7GB',
        recommended: true
      },
      {
        name: 'deepseek-coder-v2-lite:16b',
        description: 'Versão lite do DeepSeek Coder V2, mais rápido',
        size: '~16GB',
        recommended: false
      },
      {
        name: 'ode-llama:13b',
        description: 'OdeLLaMA 13B quantizado Q4_K_M, otimizado para código',
        size: '~13GB',
        recommended: true
      },
      {
        name: 'phi-3-mini:3.8b',
        description: 'Phi-3 Mini, modelo compacto e eficiente',
        size: '~3.8GB',
        recommended: true
      },
      {
        name: 'mistral-codestral:7b',
        description: 'Mistral especializado em código',
        size: '~7GB',
        recommended: false
      },
      {
        name: 'llama3.1:8b',
        description: 'LLaMA 3.1 8B, modelo geral versátil',
        size: '~8GB',
        recommended: false
      },
      {
        name: 'codegemma:7b',
        description: 'CodeGemma da Google, especializado em código',
        size: '~7GB',
        recommended: false
      },
      {
        name: 'codellama:13b',
        description: 'Code LLaMA 13B, excelente para código complexo',
        size: '~13GB',
        recommended: true
      }
    ];

    const { selectedModels } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedModels',
        message: 'Selecione os modelos que deseja baixar:',
        choices: availableModels.map(model => ({
          name: `${model.name} - ${model.description} (${model.size})${model.recommended ? ' [RECOMENDADO]' : ''}`,
          value: model.name,
          checked: model.recommended
        })),
        pageSize: 15
      }
    ]);

    if (selectedModels.length === 0) {
      Logger.warn('⚠️ Nenhum modelo selecionado. Voltando para seleção manual...');
      return await this.selectModel();
    }

    Logger.info(`🚀 Iniciando download de ${selectedModels.length} modelos...`);
    Logger.newline();

    // Criar barra de progresso múltipla
    const multibar = new cliProgress.MultiBar({
      clearOnComplete: false,
      hideCursor: true,
      format: ' {bar} | {model} | {percentage}% | {status}'
    }, cliProgress.Presets.shades_classic);

    const downloadedModels: string[] = [];
    const failedModels: string[] = [];

    // Criar barras de progresso para cada modelo
    const progressBars = selectedModels.map((modelName: string) => {
      return multibar.create(100, 0, {
        model: modelName.padEnd(25),
        status: 'Iniciando...',
        percentage: '0%'
      });
    });

    // Download em paralelo com progresso simulado
    const downloadPromises = selectedModels.map(async (modelName: string, index: number) => {
      const progressBar = progressBars[index];
      
      try {
        // Simular progresso durante o download
        let progress = 0;
        const progressInterval = setInterval(() => {
          progress += Math.random() * 15;
          if (progress > 90) progress = 90;
          
          progressBar.update(progress, {
            status: 'Baixando...',
            percentage: `${Math.round(progress)}%`
          });
        }, 500);

        // Fazer o download real
        await this.ollamaManager.downloadModel(modelName);
        
        clearInterval(progressInterval);
        progressBar.update(100, {
          status: '✅ Concluído',
          percentage: '100%'
        });
        
        downloadedModels.push(modelName);
        
      } catch (error) {
        progressBar.update(100, {
          status: '❌ Erro',
          percentage: '100%'
        });
        failedModels.push(modelName);
        Logger.error(`❌ Erro ao baixar ${modelName}:`, error);
      }
    });

    // Aguardar todos os downloads
    await Promise.all(downloadPromises);
    
    // Fechar barras de progresso
    multibar.stop();

    Logger.newline();
    if (downloadedModels.length > 0) {
      Logger.success(`✅ Download concluído! ${downloadedModels.length} modelos baixados.`);
      Logger.info('📋 Modelos baixados:');
      downloadedModels.forEach(model => Logger.info(`  ✅ ${model}`));
    }

    if (failedModels.length > 0) {
      Logger.warn(`⚠️ ${failedModels.length} modelos falharam no download:`);
      failedModels.forEach(model => Logger.warn(`  ❌ ${model}`));
    }

    // Sugerir o primeiro modelo baixado como padrão
    if (downloadedModels.length > 0) {
      const recommendedModel = downloadedModels[0];
      Logger.info(`💡 Recomendamos usar: ${recommendedModel}`);
      
      const { useRecommended } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'useRecommended',
          message: `Deseja usar ${recommendedModel} como modelo padrão?`,
          default: true
        }
      ]);

      if (useRecommended) {
        return recommendedModel;
      }
    }

    // Se não quiser usar o recomendado, voltar para seleção
    Logger.info('🔄 Escolha um modelo dos disponíveis:');
    return await this.selectModel();
  }

  /**
   * Gerencia download de modelo
   */
  private async handleModelDownload(): Promise<string> {
    Logger.info('📥 Download de Modelo');
    Logger.info('Modelos populares para desenvolvimento:');
    Logger.newline();

    const popularModels = [
      'deepseek-coder:6.7b',
      'qwen2.5-coder:7b',
      'deepseek-coder-v2-lite:16b',
      'ode-llama:13b',
      'phi-3-mini:3.8b',
      'mistral-codestral:7b',
      'llama3.1:8b',
      'codegemma:7b',
      'codellama:13b'
    ];

    const { modelToDownload } = await inquirer.prompt([
      {
        type: 'list',
        name: 'modelToDownload',
        message: 'Qual modelo deseja baixar?',
        choices: [
          ...popularModels.map(name => ({
            name: name,
            value: name
          })),
          new inquirer.Separator(''),
          {
            name: '✏️ Digitar nome personalizado...',
            value: 'custom'
          }
        ]
      }
    ]);

    if (modelToDownload === 'custom') {
      const { customModelName } = await inquirer.prompt([
        {
          type: 'input',
          name: 'customModelName',
          message: 'Digite o nome do modelo (ex: llama2:7b):',
          validate: (input: string) => {
            if (input.trim().length === 0) {
              return 'Nome do modelo é obrigatório';
            }
            return true;
          }
        }
      ]);
      return await this.downloadAndReturnModel(customModelName);
    }

    return await this.downloadAndReturnModel(modelToDownload);
  }

  /**
   * Gerencia input manual de modelo
   */
  private async handleManualModelInput(): Promise<string> {
    const { manualModelName } = await inquirer.prompt([
      {
        type: 'input',
        name: 'manualModelName',
        message: 'Digite o nome do modelo:',
        validate: (input: string) => {
          if (input.trim().length === 0) {
            return 'Nome do modelo é obrigatório';
          }
          return true;
        }
      }
    ]);

    // Verificar se o modelo está disponível
    const availableModels = await this.ollamaManager.listModels();
    const modelExists = availableModels.some(m => m.name === manualModelName);

    if (!modelExists) {
      Logger.warn(`⚠️ Modelo "${manualModelName}" não encontrado localmente.`);
      
      const { shouldDownload } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'shouldDownload',
          message: `Deseja baixar o modelo "${manualModelName}"?`,
          default: true
        }
      ]);

      if (shouldDownload) {
        return await this.downloadAndReturnModel(manualModelName);
      } else {
        // Tentar novamente
        return await this.handleManualModelInput();
      }
    }

    return manualModelName;
  }

  /**
   * Faz download do modelo e retorna o nome
   */
  private async downloadAndReturnModel(modelName: string): Promise<string> {
    try {
      Logger.info(`📥 Iniciando download do modelo ${modelName}...`);
      
      // Criar barra de progresso
      const progressBar = new cliProgress.SingleBar({
        format: ' {bar} | {model} | {percentage}% | {status}',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
      }, cliProgress.Presets.shades_classic);

      progressBar.start(100, 0, {
        model: modelName.padEnd(25),
        status: 'Iniciando...',
        percentage: '0%'
      });

      // Simular progresso durante o download
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 90) progress = 90;
        
        progressBar.update(progress, {
          status: 'Baixando...',
          percentage: `${Math.round(progress)}%`
        });
      }, 500);

      // Fazer o download real
      await this.ollamaManager.downloadModel(modelName);
      
      clearInterval(progressInterval);
      progressBar.update(100, {
        status: '✅ Concluído',
        percentage: '100%'
      });
      
      progressBar.stop();
      Logger.success(`✅ Modelo ${modelName} baixado com sucesso!`);
      return modelName;
      
    } catch (error) {
      Logger.error(`❌ Erro ao baixar modelo ${modelName}:`, error);
      
      const { retry } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'retry',
          message: 'Deseja tentar novamente ou escolher outro modelo?',
          default: false
        }
      ]);

      if (retry) {
        return await this.handleModelDownload();
      } else {
        return await this.selectModel();
      }
    }
  }

  /**
   * Verifica se modelo está disponível e sugere alternativas
   */
  async ensureModelAvailable(modelName: string): Promise<string> {
    const availableModels = await this.ollamaManager.listModels();
    const modelExists = availableModels.some(m => m.name === modelName);

    if (modelExists) {
      return modelName;
    }

    Logger.warn(`⚠️ Modelo "${modelName}" não encontrado.`);
    Logger.info('💡 Modelos disponíveis:');
    
    availableModels.forEach((model, index) => {
      Logger.info(`  ${index + 1}. ${model.name} (${model.size})`);
    });

    const { useAvailable } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'useAvailable',
        message: 'Deseja escolher um dos modelos disponíveis?',
        default: true
      }
    ]);

    if (useAvailable) {
      return await this.selectModel();
    } else {
      // Tentar baixar o modelo original
      return await this.downloadAndReturnModel(modelName);
    }
  }
}
