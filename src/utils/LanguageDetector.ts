import * as fs from 'fs-extra';
import * as path from 'path';
import { LanguageDetection } from '../types';
import { Logger } from './Logger';

export class LanguageDetector {
  private languagePatterns: Record<string, RegExp[]> = {};
  private frameworkPatterns: Record<string, RegExp[]> = {};
  private fileExtensions: Record<string, string[]> = {};

  constructor() {
    this.initializePatterns();
  }

  /**
   * Inicializa padrões de detecção
   */
  private initializePatterns(): void {
    // Padrões para linguagens
    this.languagePatterns = {
      'JavaScript': [
        /\.js$/,
        /\.jsx$/,
        /\.mjs$/,
        /import\s+.*\s+from\s+['"][^'"]+['"]/,
        /export\s+(default\s+)?(function|class|const|let|var)/,
        /console\.(log|warn|error|info)/,
        /function\s+\w+\s*\(/,
        /class\s+\w+/,
        /const\s+\w+\s*=/,
        /let\s+\w+\s*=/,
        /var\s+\w+\s*=/
      ],
      'TypeScript': [
        /\.ts$/,
        /\.tsx$/,
        /interface\s+\w+/,
        /type\s+\w+/,
        /:\s*(string|number|boolean|any|void|never|unknown)/,
        /<[^>]+>/,
        /as\s+\w+/,
        /enum\s+\w+/
      ],
      'Python': [
        /\.py$/,
        /\.pyw$/,
        /def\s+\w+\s*\(/,
        /class\s+\w+/,
        /import\s+\w+/,
        /from\s+\w+\s+import/,
        /if\s+__name__\s*==\s*['"]__main__['"]/,
        /print\s*\(/,
        /lambda\s+\w+:/,
        /try:/,
        /except\s+\w+:/
      ],
      'PHP': [
        /\.php$/,
        /<\?php/,
        /function\s+\w+\s*\(/,
        /class\s+\w+/,
        /\$\w+/,
        /echo\s+/,
        /print\s+/,
        /require\s+['"][^'"]+['"]/,
        /include\s+['"][^'"]+['"]/,
        /namespace\s+\w+/
      ],
      'Go': [
        /\.go$/,
        /package\s+\w+/,
        /import\s+\(/,
        /func\s+\w+\s*\(/,
        /type\s+\w+\s+struct/,
        /var\s+\w+/,
        /const\s+\w+/,
        /go\s+func/,
        /defer\s+\w+\(/,
        /if\s+err\s*!=/
      ],
      'Rust': [
        /\.rs$/,
        /fn\s+\w+\s*\(/,
        /let\s+mut?\s+\w+/,
        /struct\s+\w+/,
        /enum\s+\w+/,
        /impl\s+\w+/,
        /use\s+\w+/,
        /pub\s+(fn|struct|enum)/,
        /match\s+\w+/,
        /Result<[^>]+>/
      ],
      'Java': [
        /\.java$/,
        /public\s+class\s+\w+/,
        /public\s+static\s+void\s+main/,
        /import\s+java\./,
        /package\s+\w+/,
        /private\s+\w+/,
        /protected\s+\w+/,
        /extends\s+\w+/,
        /implements\s+\w+/,
        /try\s*\{/
      ],
      'C++': [
        /\.cpp$/,
        /\.cc$/,
        /\.cxx$/,
        /#include\s+<[^>]+>/,
        /using\s+namespace\s+std/,
        /std::/,
        /class\s+\w+/,
        /template\s*</,
        /namespace\s+\w+/,
        /cout\s*<</
      ],
      'C': [
        /\.c$/,
        /\.h$/,
        /#include\s+<[^>]+>/,
        /int\s+main\s*\(/,
        /printf\s*\(/,
        /scanf\s*\(/,
        /struct\s+\w+/,
        /typedef\s+struct/,
        /malloc\s*\(/,
        /free\s*\(/
      ],
      'C#': [
        /\.cs$/,
        /using\s+System/,
        /namespace\s+\w+/,
        /public\s+class\s+\w+/,
        /static\s+void\s+Main/,
        /Console\.WriteLine/,
        /var\s+\w+/,
        /foreach\s*\(/,
        /LINQ/,
        /async\s+Task/
      ]
    };

    // Padrões para frameworks
    this.frameworkPatterns = {
      'react': [
        /import\s+React/,
        /from\s+['"]react['"]/,
        /ReactDOM\.render/,
        /useState\s*\(/,
        /useEffect\s*\(/,
        /useContext\s*\(/,
        /useReducer\s*\(/,
        /useCallback\s*\(/,
        /useMemo\s*\(/,
        /<[A-Z][a-zA-Z]*\s*\/?>/
      ],
      'vue': [
        /import\s+Vue/,
        /from\s+['"]vue['"]/,
        /new\s+Vue/,
        /Vue\.component/,
        /export\s+default\s*\{/,
        /data\s*\(\)\s*\{/,
        /methods\s*:\s*\{/,
        /computed\s*:\s*\{/,
        /watch\s*:\s*\{/,
        /<template>/
      ],
      'angular': [
        /import\s+\{[^}]*\}\s+from\s+['"]@angular/,
        /@Component\s*\(/,
        /@Injectable\s*\(/,
        /@NgModule\s*\(/,
        /@Pipe\s*\(/,
        /@Directive\s*\(/,
        /@Input\s*\(/,
        /@Output\s*\(/,
        /@HostBinding/,
        /@HostListener/
      ],
      'express': [
        /import\s+express/,
        /from\s+['"]express['"]/,
        /const\s+express\s*=\s*require/,
        /app\.get\s*\(/,
        /app\.post\s*\(/,
        /app\.put\s*\(/,
        /app\.delete\s*\(/,
        /app\.use\s*\(/,
        /app\.listen\s*\(/,
        /router\.get/
      ],
      'nest': [
        /import\s+\{[^}]*\}\s+from\s+['"]@nestjs/,
        /@Controller\s*\(/,
        /@Injectable\s*\(/,
        /@Module\s*\(/,
        /@Get\s*\(/,
        /@Post\s*\(/,
        /@Put\s*\(/,
        /@Delete\s*\(/,
        /@UseGuards/,
        /@UseInterceptors/
      ],
      'laravel': [
        /use\s+Illuminate/,
        /Route::get/,
        /Route::post/,
        /Route::put/,
        /Route::delete/,
        /class\s+\w+\s+extends\s+Controller/,
        /class\s+\w+\s+extends\s+Model/,
        /Schema::create/,
        /DB::table/,
        /Artisan::command/
      ],
      'django': [
        /from\s+django/,
        /import\s+django/,
        /urlpatterns\s*=/,
        /class\s+\w+View/,
        /class\s+\w+Model/,
        /@login_required/,
        /@permission_required/,
        /@csrf_exempt/,
        /@require_http_methods/,
        /render\s*\(/
      ],
      'flask': [
        /from\s+flask\s+import/,
        /import\s+flask/,
        /app\s*=\s*Flask/,
        /@app\.route/,
        /@app\.before_request/,
        /@app\.after_request/,
        /@app\.errorhandler/,
        /app\.run\s*\(/,
        /Blueprint\s*\(/,
        /@blueprint\.route/
      ],
      'fastapi': [
        /from\s+fastapi\s+import/,
        /import\s+fastapi/,
        /app\s*=\s*FastAPI/,
        /@app\.get/,
        /@app\.post/,
        /@app\.put/,
        /@app\.delete/,
        /@app\.patch/,
        /@app\.head/,
        /@app\.options/
      ],
      'gin': [
        /import\s+["']github\.com\/gin-gonic\/gin["']/,
        /gin\.Default\s*\(/,
        /gin\.New\s*\(/,
        /r\.GET\s*\(/,
        /r\.POST\s*\(/,
        /r\.PUT\s*\(/,
        /r\.DELETE\s*\(/,
        /c\.JSON\s*\(/,
        /c\.String\s*\(/,
        /c\.HTML\s*\(/
      ],
      'echo': [
        /import\s+["']github\.com\/labstack\/echo["']/,
        /echo\.New\s*\(/,
        /e\.GET\s*\(/,
        /e\.POST\s*\(/,
        /e\.PUT\s*\(/,
        /e\.DELETE\s*\(/,
        /c\.JSON\s*\(/,
        /c\.String\s*\(/,
        /c\.HTML\s*\(/,
        /c\.Bind\s*\(/
      ],
      'actix': [
        /use\s+actix_web/,
        /extern\s+crate\s+actix_web/,
        /HttpServer::new/,
        /\.service\s*\(/,
        /\.wrap\s*\(/,
        /HttpResponse::Ok/,
        /HttpResponse::NotFound/,
        /HttpResponse::InternalServerError/,
        /web::get/,
        /web::post/
      ]
    };

    // Extensões de arquivo por linguagem
    this.fileExtensions = {
      'JavaScript': ['.js', '.jsx', '.mjs'],
      'TypeScript': ['.ts', '.tsx'],
      'Python': ['.py', '.pyw'],
      'PHP': ['.php'],
      'Go': ['.go'],
      'Rust': ['.rs'],
      'Java': ['.java'],
      'C++': ['.cpp', '.cc', '.cxx', '.hpp', '.hxx'],
      'C': ['.c', '.h'],
      'C#': ['.cs']
    };
  }

  /**
   * Detecta a linguagem principal do projeto
   */
  async detectLanguage(projectPath: string): Promise<LanguageDetection> {
    Logger.info('🔍 Detectando linguagem e framework do projeto...');

    const languageScores: Record<string, number> = {};
    const frameworkScores: Record<string, number> = {};
    const patterns: string[] = [];

    try {
      // Escanear arquivos do projeto
      const files = await this.scanProjectFiles(projectPath);
      
      for (const file of files) {
        if (file.language) {
          // Contar por extensão de arquivo
          languageScores[file.language] = (languageScores[file.language] || 0) + 1;
        }

        // Ler conteúdo do arquivo para análise de padrões
        try {
          const content = await fs.readFile(file.path, 'utf-8');
          await this.analyzeFileContent(content, languageScores, frameworkScores, patterns);
        } catch (error) {
          // Ignorar arquivos que não podem ser lidos
          continue;
        }
      }

      // Determinar linguagem principal
      const mainLanguage = this.determineMainLanguage(languageScores);
      
      // Determinar frameworks
      const frameworks = this.determineFrameworks(frameworkScores);
      
      // Calcular confiança
      const confidence = this.calculateConfidence(languageScores, mainLanguage);

      Logger.info(`✅ Linguagem detectada: ${mainLanguage} (confiança: ${confidence}%)`);
      if (frameworks.length > 0) {
        Logger.info(`🏗️ Frameworks detectados: ${frameworks.join(', ')}`);
      }

      return {
        language: mainLanguage,
        confidence,
        frameworks,
        patterns
      };

    } catch (error) {
      Logger.warn('Erro ao detectar linguagem:', error);
      return {
        language: 'Unknown',
        confidence: 0,
        frameworks: [],
        patterns: []
      };
    }
  }

  /**
   * Escaneia arquivos do projeto recursivamente
   */
  private async scanProjectFiles(projectPath: string): Promise<any[]> {
    const files: any[] = [];
    
    try {
      const items = await fs.readdir(projectPath, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(projectPath, item.name);
        
        if (item.isDirectory()) {
          // Ignorar diretórios do sistema
          if (this.shouldIgnoreDirectory(item.name)) continue;
          
          // Recursão para subdiretórios
          const subFiles = await this.scanProjectFiles(fullPath);
          files.push(...subFiles);
        } else if (item.isFile()) {
          // Ignorar arquivos do sistema
          if (this.shouldIgnoreFile(item.name)) continue;
          
          const stats = await fs.stat(fullPath);
          files.push({
            path: fullPath,
            name: item.name,
            extension: path.extname(item.name),
            size: stats.size,
            lastModified: stats.mtime,
            language: this.detectFileLanguage(item.name)
          });
        }
      }
    } catch (error) {
      Logger.warn('Erro ao escanear arquivos:', error);
    }
    
    return files;
  }

  /**
   * Verifica se deve ignorar arquivo
   */
  private shouldIgnoreFile(filename: string): boolean {
    const ignorePatterns = [
      /^\./,
      /~$/,
      /\.tmp$/,
      /\.log$/,
      /\.DS_Store$/,
      /Thumbs\.db$/,
      /\.git/,
      /\.llm-cli/,
      /node_modules/,
      /dist/,
      /build/,
      /coverage/,
      /\.cache/
    ];
    
    return ignorePatterns.some(pattern => pattern.test(filename));
  }

  /**
   * Verifica se deve ignorar diretório
   */
  private shouldIgnoreDirectory(dirname: string): boolean {
    const ignorePatterns = [
      /^\./,
      /node_modules/,
      /\.git/,
      /\.llm-cli/,
      /dist/,
      /build/,
      /coverage/,
      /\.cache/,
      /vendor/,
      /__pycache__/,
      /\.pytest_cache/
    ];
    
    return ignorePatterns.some(pattern => pattern.test(dirname));
  }

  /**
   * Detecta linguagem do arquivo por extensão
   */
  private detectFileLanguage(filename: string): string | undefined {
    const ext = path.extname(filename);
    
    for (const [language, extensions] of Object.entries(this.fileExtensions)) {
      if (extensions.includes(ext)) {
        return language;
      }
    }
    
    return undefined;
  }

  /**
   * Analisa conteúdo do arquivo para detectar padrões
   */
  private async analyzeFileContent(
    content: string,
    languageScores: Record<string, number>,
    frameworkScores: Record<string, number>,
    patterns: string[]
  ): Promise<void> {
    // Analisar padrões de linguagem
    for (const [language, patterns] of Object.entries(this.languagePatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          languageScores[language] = (languageScores[language] || 0) + 1;
          break; // Contar apenas uma vez por arquivo por linguagem
        }
      }
    }

    // Analisar padrões de framework
    for (const [framework, patterns] of Object.entries(this.frameworkPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          frameworkScores[framework] = (frameworkScores[framework] || 0) + 1;
          patterns.push(new RegExp(`${framework} pattern detected`));
          break; // Contar apenas uma vez por arquivo por framework
        }
      }
    }
  }

  /**
   * Determina a linguagem principal baseada nos scores
   */
  private determineMainLanguage(languageScores: Record<string, number>): string {
    if (Object.keys(languageScores).length === 0) {
      return 'Unknown';
    }

    let maxScore = 0;
    let mainLanguage = 'Unknown';

    for (const [language, score] of Object.entries(languageScores)) {
      if (score > maxScore) {
        maxScore = score;
        mainLanguage = language;
      }
    }

    return mainLanguage;
  }

  /**
   * Determina os frameworks baseados nos scores
   */
  private determineFrameworks(frameworkScores: Record<string, number>): string[] {
    const frameworks: string[] = [];
    const threshold = 1; // Mínimo de ocorrências para considerar um framework

    for (const [framework, score] of Object.entries(frameworkScores)) {
      if (score >= threshold) {
        frameworks.push(framework);
      }
    }

    // Ordenar por score (maior primeiro)
    return frameworks.sort((a, b) => frameworkScores[b] - frameworkScores[a]);
  }

  /**
   * Calcula a confiança da detecção
   */
  private calculateConfidence(languageScores: Record<string, number>, mainLanguage: string): number {
    if (mainLanguage === 'Unknown') {
      return 0;
    }

    const totalFiles = Object.values(languageScores).reduce((sum, score) => sum + score, 0);
    const mainLanguageScore = languageScores[mainLanguage] || 0;

    if (totalFiles === 0) {
      return 0;
    }

    return Math.round((mainLanguageScore / totalFiles) * 100);
  }
}
