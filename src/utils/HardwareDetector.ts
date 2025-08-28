import { exec } from 'child_process';
import { promisify } from 'util';
import { HardwareInfo, ModelRecommendation, HardwareRequirements } from '../types';
import { Logger } from './Logger';

const execAsync = promisify(exec);

export class HardwareDetector {
  private modelRecommendations: ModelRecommendation[] = [];

  constructor() {
    this.initializeModelRecommendations();
  }

  /**
   * Inicializa recomendações de modelos baseadas em hardware
   */
  private initializeModelRecommendations(): void {
    this.modelRecommendations = [
      {
        name: 'deepseek-coder:6.7b-instruct',
        description: 'Modelo de código especializado, ideal para desenvolvimento',
        score: 95,
        reason: 'Excelente para desenvolvimento com boa performance em hardware modesto',
        requirements: {
          minRAM: 8,
          minCPU: 4,
          recommendedRAM: 16,
          recommendedCPU: 8,
          gpuRequired: false
        }
      },
      {
        name: 'phi-3:3.8b-instruct',
        description: 'Modelo compacto e eficiente da Microsoft',
        score: 90,
        reason: 'Boa performance com baixo consumo de recursos',
        requirements: {
          minRAM: 4,
          minCPU: 2,
          recommendedRAM: 8,
          recommendedCPU: 4,
          gpuRequired: false
        }
      },
      {
        name: 'codellama:7b-instruct',
        description: 'Modelo especializado em código da Meta',
        score: 88,
        reason: 'Boa qualidade para desenvolvimento, requer mais RAM',
        requirements: {
          minRAM: 12,
          minCPU: 6,
          recommendedRAM: 16,
          recommendedCPU: 8,
          gpuRequired: false
        }
      },
      {
        name: 'deepseek-coder:33b-instruct',
        description: 'Modelo de código de alta qualidade',
        score: 85,
        reason: 'Excelente qualidade, requer hardware robusto',
        requirements: {
          minRAM: 24,
          minCPU: 8,
          recommendedRAM: 32,
          recommendedCPU: 12,
          gpuRequired: false
        }
      },
      {
        name: 'llama3.1:8b-instruct',
        description: 'Modelo geral da Meta com boa performance',
        score: 82,
        reason: 'Versátil e bem balanceado',
        requirements: {
          minRAM: 10,
          minCPU: 4,
          recommendedRAM: 16,
          recommendedCPU: 8,
          gpuRequired: false
        }
      },
      {
        name: 'mistral:7b-instruct',
        description: 'Modelo eficiente da Mistral AI',
        score: 80,
        reason: 'Boa qualidade com consumo moderado de recursos',
        requirements: {
          minRAM: 8,
          minCPU: 4,
          recommendedRAM: 16,
          recommendedCPU: 8,
          gpuRequired: false
        }
      },
      {
        name: 'qwen2.5:7b-instruct',
        description: 'Modelo da Alibaba com boa performance',
        score: 78,
        reason: 'Boa qualidade geral, requer recursos moderados',
        requirements: {
          minRAM: 8,
          minCPU: 4,
          recommendedRAM: 16,
          recommendedCPU: 8,
          gpuRequired: false
        }
      },
      {
        name: 'gemma2:9b-instruct',
        description: 'Modelo compacto do Google',
        score: 75,
        reason: 'Eficiente e rápido, ideal para desenvolvimento',
        requirements: {
          minRAM: 6,
          minCPU: 4,
          recommendedRAM: 12,
          recommendedCPU: 6,
          gpuRequired: false
        }
      }
    ];
  }

  /**
   * Detecta informações de hardware do sistema
   */
  async detect(): Promise<HardwareInfo> {
    Logger.info('🔍 Detectando hardware do sistema...');

    try {
      const [cpu, memory, gpu, storage, os] = await Promise.all([
        this.detectCPU(),
        this.detectMemory(),
        this.detectGPU(),
        this.detectStorage(),
        this.detectOS()
      ]);

      const hardwareInfo: HardwareInfo = {
        cpu,
        memory,
        gpu,
        storage,
        os
      };

      Logger.success('✅ Hardware detectado com sucesso');
      return hardwareInfo;

    } catch (error) {
      Logger.error('Erro ao detectar hardware:', error);
      throw new Error('Falha ao detectar hardware do sistema');
    }
  }

  /**
   * Detecta informações da CPU
   */
  private async detectCPU(): Promise<any> {
    try {
      // Tentar diferentes comandos para diferentes sistemas
      let cpuInfo: any = {};

      try {
        // Linux - /proc/cpuinfo
        const { stdout } = await execAsync('cat /proc/cpuinfo | grep -E "model name|processor|cpu cores|siblings" | head -20');
        const lines = stdout.split('\n').filter(line => line.trim());
        
        const modelMatch = lines.find(line => line.includes('model name'))?.split(':')[1]?.trim();
        const processorCount = lines.filter(line => line.includes('processor')).length;
        const coresMatch = lines.find(line => line.includes('cpu cores'))?.split(':')[1]?.trim();
        const siblingsMatch = lines.find(line => line.includes('siblings'))?.split(':')[1]?.trim();

        cpuInfo = {
          model: modelMatch || 'CPU Desconhecido',
          cores: parseInt(coresMatch || '1'),
          threads: parseInt(siblingsMatch || processorCount.toString()),
          architecture: await this.detectArchitecture(),
          frequency: await this.detectCPUFrequency()
        };
      } catch {
        // Fallback para outros sistemas
        const { stdout: arch } = await execAsync('uname -m');
        const { stdout: cores } = await execAsync('nproc');
        
        cpuInfo = {
          model: 'CPU Linux',
          cores: parseInt(cores.trim()),
          threads: parseInt(cores.trim()),
          architecture: arch.trim(),
          frequency: 'Desconhecida'
        };
      }

      return cpuInfo;
    } catch (error) {
      Logger.warn('Erro ao detectar CPU, usando valores padrão');
      return {
        model: 'CPU Desconhecido',
        cores: 1,
        threads: 1,
        architecture: 'x86_64',
        frequency: 'Desconhecida'
      };
    }
  }

  /**
   * Detecta arquitetura do sistema
   */
  private async detectArchitecture(): Promise<string> {
    try {
      const { stdout } = await execAsync('uname -m');
      return stdout.trim();
    } catch {
      return 'x86_64';
    }
  }

  /**
   * Detecta frequência da CPU
   */
  private async detectCPUFrequency(): Promise<string> {
    try {
      const { stdout } = await execAsync('cat /proc/cpuinfo | grep "cpu MHz" | head -1 | cut -d: -f2');
      const mhz = parseFloat(stdout.trim());
      if (mhz > 1000) {
        return `${(mhz / 1000).toFixed(2)} GHz`;
      }
      return `${mhz.toFixed(0)} MHz`;
    } catch {
      return 'Desconhecida';
    }
  }

  /**
   * Detecta informações de memória
   */
  private async detectMemory(): Promise<any> {
    try {
      const { stdout } = await execAsync('free -g | grep Mem');
      const parts = stdout.trim().split(/\s+/);
      
      const total = parseInt(parts[1]);
      const available = parseInt(parts[6]);

      // Tentar detectar tipo de memória
      let memoryType = 'DDR4';
      try {
        const { stdout: dmidecode } = await execAsync('dmidecode -t memory 2>/dev/null | grep -i "ddr" | head -1');
        if (dmidecode.includes('DDR5')) memoryType = 'DDR5';
        else if (dmidecode.includes('DDR4')) memoryType = 'DDR4';
        else if (dmidecode.includes('DDR3')) memoryType = 'DDR3';
      } catch {
        // Ignorar erro, usar padrão
      }

      return {
        total,
        available,
        type: memoryType
      };
    } catch (error) {
      Logger.warn('Erro ao detectar memória, usando valores padrão');
      return {
        total: 8,
        available: 6,
        type: 'DDR4'
      };
    }
  }

  /**
   * Detecta informações da GPU
   */
  private async detectGPU(): Promise<any | undefined> {
    try {
      // Tentar detectar GPU NVIDIA
      try {
        const { stdout } = await execAsync('nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader,nounits 2>/dev/null');
        if (stdout.trim()) {
          const [name, memory, driver] = stdout.trim().split(', ');
          return {
            model: name,
            memory: parseInt(memory) / 1024, // Converter MB para GB
            driver: driver
          };
        }
      } catch {
        // GPU NVIDIA não encontrada
      }

      // Tentar detectar GPU AMD
      try {
        const { stdout } = await execAsync('lspci | grep -i "vga\|3d\|display" | grep -i amd');
        if (stdout.trim()) {
          return {
            model: stdout.trim(),
            memory: 0, // Não é possível detectar memória facilmente
            driver: 'AMD Driver'
          };
        }
      } catch {
        // GPU AMD não encontrada
      }

      // Tentar detectar GPU Intel
      try {
        const { stdout } = await execAsync('lspci | grep -i "vga\|3d\|display" | grep -i intel');
        if (stdout.trim()) {
          return {
            model: stdout.trim(),
            memory: 0, // GPU integrada
            driver: 'Intel Driver'
          };
        }
      } catch {
        // GPU Intel não encontrada
      }

      return undefined; // Nenhuma GPU detectada
    } catch (error) {
      Logger.warn('Erro ao detectar GPU');
      return undefined;
    }
  }

  /**
   * Detecta informações de armazenamento
   */
  private async detectStorage(): Promise<any> {
    try {
      const { stdout } = await execAsync('df -h / | tail -1');
      const parts = stdout.trim().split(/\s+/);
      
      const total = this.parseStorageSize(parts[1]);
      const available = this.parseStorageSize(parts[3]);

      // Tentar detectar tipo de armazenamento
      let storageType = 'HDD';
      try {
        const { stdout: lsblk } = await execAsync('lsblk -d -o name,rota /dev/sda 2>/dev/null | tail -1');
        if (lsblk.includes('0')) storageType = 'SSD';
        else if (lsblk.includes('1')) storageType = 'HDD';
      } catch {
        // Ignorar erro, usar padrão
      }

      return {
        total,
        available,
        type: storageType
      };
    } catch (error) {
      Logger.warn('Erro ao detectar armazenamento, usando valores padrão');
      return {
        total: 500,
        available: 400,
        type: 'HDD'
      };
    }
  }

  /**
   * Converte tamanho de armazenamento para GB
   */
  private parseStorageSize(sizeStr: string): number {
    const size = parseFloat(sizeStr);
    if (sizeStr.includes('T')) return size * 1024;
    if (sizeStr.includes('G')) return size;
    if (sizeStr.includes('M')) return size / 1024;
    if (sizeStr.includes('K')) return size / (1024 * 1024);
    return size;
  }

  /**
   * Detecta informações do sistema operacional
   */
  private async detectOS(): Promise<any> {
    try {
      const { stdout: osName } = await execAsync('cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2 | tr -d \'"\'');
      const { stdout: version } = await execAsync('cat /etc/os-release | grep VERSION_ID | cut -d= -f2 | tr -d \'"\'');
      const { stdout: arch } = await execAsync('uname -m');

      return {
        name: osName.trim(),
        version: version.trim(),
        architecture: arch.trim()
      };
    } catch (error) {
      Logger.warn('Erro ao detectar SO, usando valores padrão');
      return {
        name: 'Linux',
        version: 'Desconhecida',
        architecture: 'x86_64'
      };
    }
  }

  /**
   * Obtém recomendações de modelos baseadas no hardware
   */
  async getModelRecommendations(hardware: HardwareInfo): Promise<ModelRecommendation[]> {
    Logger.info('💡 Analisando compatibilidade de modelos...');

    const recommendations: ModelRecommendation[] = [];

    for (const model of this.modelRecommendations) {
      const compatibility = this.checkModelCompatibility(hardware, model.requirements);
      
      if (compatibility.compatible) {
        recommendations.push({
          ...model,
          score: this.calculateModelScore(hardware, model.requirements, compatibility)
        });
      }
    }

    // Ordenar por score (maior primeiro)
    recommendations.sort((a, b) => b.score - a.score);

    Logger.success(`✅ ${recommendations.length} modelos compatíveis encontrados`);
    return recommendations;
  }

  /**
   * Verifica compatibilidade de um modelo com o hardware
   */
  private checkModelCompatibility(hardware: HardwareInfo, requirements: HardwareRequirements): {
    compatible: boolean;
    issues: string[];
    warnings: string[];
  } {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Verificar RAM
    if (hardware.memory.total < requirements.minRAM) {
      issues.push(`RAM insuficiente: ${hardware.memory.total}GB < ${requirements.minRAM}GB mínimo`);
    } else if (hardware.memory.total < requirements.recommendedRAM) {
      warnings.push(`RAM abaixo do recomendado: ${hardware.memory.total}GB < ${requirements.recommendedRAM}GB`);
    }

    // Verificar CPU
    if (hardware.cpu.cores < requirements.minCPU) {
      issues.push(`CPU insuficiente: ${hardware.cpu.cores} cores < ${requirements.minCPU} cores mínimo`);
    } else if (hardware.cpu.cores < requirements.recommendedCPU) {
      warnings.push(`CPU abaixo do recomendado: ${hardware.cpu.cores} cores < ${requirements.recommendedCPU} cores`);
    }

    // Verificar GPU
    if (requirements.gpuRequired && !hardware.gpu) {
      issues.push('GPU requerida mas não detectada');
    }

    const compatible = issues.length === 0;

    return {
      compatible,
      issues,
      warnings
    };
  }

  /**
   * Calcula score de um modelo baseado no hardware
   */
  private calculateModelScore(
    hardware: HardwareInfo, 
    requirements: HardwareRequirements,
    compatibility: { compatible: boolean; issues: string[]; warnings: string[] }
  ): number {
    if (!compatibility.compatible) {
      return 0;
    }

    let score = 100;

    // Penalizar por estar abaixo do recomendado
    if (hardware.memory.total < requirements.recommendedRAM) {
      score -= 10;
    }
    if (hardware.cpu.cores < requirements.recommendedCPU) {
      score -= 10;
    }

    // Bônus por estar acima do recomendado
    if (hardware.memory.total > requirements.recommendedRAM * 1.5) {
      score += 5;
    }
    if (hardware.cpu.cores > requirements.recommendedCPU * 1.5) {
      score += 5;
    }

    // Bônus por ter GPU dedicada
    if (hardware.gpu && hardware.gpu.memory > 0) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }
}
