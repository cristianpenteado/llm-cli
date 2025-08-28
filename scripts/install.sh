#!/bin/bash

# LLM CLI - Script de Instalação
# Este script instala a LLM CLI e suas dependências

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para logging
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar se é Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    error "Este script é destinado apenas para sistemas Linux"
    exit 1
fi

# Verificar se é executado como root
if [[ $EUID -eq 0 ]]; then
    error "Não execute este script como root"
    exit 1
fi

log "🚀 Iniciando instalação da LLM CLI..."

# Verificar Node.js
log "📋 Verificando Node.js..."
if ! command -v node &> /dev/null; then
    error "Node.js não encontrado. Instalando..."
    
    # Detectar distribuição Linux
    if command -v apt-get &> /dev/null; then
        # Ubuntu/Debian
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif command -v yum &> /dev/null; then
        # CentOS/RHEL
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo yum install -y nodejs
    elif command -v dnf &> /dev/null; then
        # Fedora
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo dnf install -y nodejs
    else
        error "Distribuição Linux não suportada. Instale Node.js manualmente: https://nodejs.org/"
        exit 1
    fi
else
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [[ $NODE_VERSION -lt 18 ]]; then
        error "Node.js versão 18+ é requerida. Versão atual: $(node --version)"
        exit 1
    fi
    success "Node.js $(node --version) encontrado"
fi

# Verificar npm
log "📦 Verificando npm..."
if ! command -v npm &> /dev/null; then
    error "npm não encontrado"
    exit 1
fi
success "npm $(npm --version) encontrado"

# Instalar dependências do sistema
log "🔧 Instalando dependências do sistema..."
if command -v apt-get &> /dev/null; then
    sudo apt-get update
    sudo apt-get install -y curl wget git build-essential
elif command -v yum &> /dev/null; then
    sudo yum install -y curl wget git gcc gcc-c++ make
elif command -v dnf &> /dev/null; then
    sudo dnf install -y curl wget git gcc gcc-c++ make
fi

# Verificar se o Vlama está instalado
log "🤖 Verificando Vlama..."
if ! command -v vlama &> /dev/null; then
    warn "Vlama não encontrado. Instalando..."
    
    # Tentar instalar Vlama
    if curl -fsSL https://get.vlama.ai | sh; then
        success "Vlama instalado com sucesso"
    else
        warn "Falha na instalação automática do Vlama"
        log "Instale manualmente: https://vlama.ai"
    fi
else
    success "Vlama encontrado"
fi

# Instalar LLM CLI globalmente
log "📥 Instalando LLM CLI..."
if npm install -g llm-cli; then
    success "LLM CLI instalada com sucesso"
else
    error "Falha ao instalar LLM CLI"
    exit 1
fi

# Verificar instalação
log "✅ Verificando instalação..."
if command -v llm &> /dev/null; then
    success "LLM CLI instalada e disponível como 'llm'"
    llm --version
else
    error "LLM CLI não foi instalada corretamente"
    exit 1
fi

# Criar diretório de configuração
log "⚙️ Configurando diretório de configuração..."
mkdir -p ~/.llm-cli
success "Diretório de configuração criado: ~/.llm-cli"

# Configuração inicial
log "🔧 Executando configuração inicial..."
if llm detect-hardware; then
    success "Configuração inicial concluída"
else
    warn "Configuração inicial falhou. Execute 'llm detect-hardware' manualmente"
fi

# Mostrar próximos passos
echo ""
success "🎉 Instalação concluída com sucesso!"
echo ""
log "📚 Próximos passos:"
echo "  1. Execute 'llm detect-hardware' para configurar seu sistema"
echo "  2. Execute 'llm set-default-model <modelo>' para definir modelo padrão"
echo "  3. Navegue para um projeto e execute 'llm init'"
echo "  4. Use 'llm chat' para iniciar modo conversacional"
echo ""
log "📖 Documentação: https://github.com/llm-cli/llm-cli"
log "🐛 Problemas: https://github.com/llm-cli/llm-cli/issues"
echo ""
success "🚀 Boa codificação com LLM CLI!"
