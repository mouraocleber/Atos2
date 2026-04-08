#!/bin/bash

# 🚀 Script Automático de Build APK - Atos2

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════╗"
echo "║          🚀 ATOS2 - BUILD APK AUTOMÁTICO 🚀           ║"
echo "╚════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Verificar se Expo CLI está instalado
echo -e "${YELLOW}[1/6]${NC} Verificando Expo CLI..."
if ! command -v eas &> /dev/null; then
    echo -e "${RED}✗ EAS CLI não encontrado${NC}"
    echo "Instalando EAS CLI..."
    npm install -g eas-cli
fi
echo -e "${GREEN}✓ EAS CLI encontrado${NC}"

# Verificar se está no diretório correto
echo -e "${YELLOW}[2/6]${NC} Verificando diretório do projeto..."
if [ ! -f "app.json" ]; then
    echo -e "${RED}✗ app.json não encontrado${NC}"
    echo "Certifique-se de estar no diretório /home/ubuntu/atos2"
    exit 1
fi
echo -e "${GREEN}✓ Projeto encontrado${NC}"

# Verificar se está logado no Expo
echo -e "${YELLOW}[3/6]${NC} Verificando login no Expo..."
if ! eas whoami &> /dev/null; then
    echo -e "${RED}✗ Não está logado no Expo${NC}"
    echo -e "${BLUE}Faça login em: https://expo.dev${NC}"
    echo "Executando login..."
    eas login
fi
echo -e "${GREEN}✓ Logado no Expo${NC}"

# Instalar dependências
echo -e "${YELLOW}[4/6]${NC} Instalando dependências..."
npm install --silent
echo -e "${GREEN}✓ Dependências instaladas${NC}"

# Gerar APK
echo -e "${YELLOW}[5/6]${NC} Gerando APK..."
echo -e "${BLUE}Isso pode levar 10-15 minutos...${NC}"
echo ""

eas build --platform android --type apk

echo ""
echo -e "${YELLOW}[6/6]${NC} Build concluído!"
echo ""

# Exibir informações
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                   ✓ APK GERADO COM SUCESSO!           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}📱 Próximas Etapas:${NC}"
echo ""
echo "1. Baixar o APK:"
echo "   eas build:list"
echo ""
echo "2. Transferir para o celular:"
echo "   - Via USB: adb install app.apk"
echo "   - Via Email/WhatsApp: Enviar arquivo"
echo "   - Via QR Code: Gerar código do link"
echo ""
echo "3. Instalar no celular:"
echo "   - Abrir arquivo APK"
echo "   - Clicar em 'Instalar'"
echo ""
echo "4. Testar o app:"
echo "   - Abrir Atos2"
echo "   - Seguir guia de testes: MOBILE_TESTING_GUIDE.md"
echo ""

echo -e "${YELLOW}📋 Informações Úteis:${NC}"
echo ""
echo "- Ver builds anteriores: eas build:list"
echo "- Cancelar build: eas build:cancel"
echo "- Ver logs: eas build:view"
echo "- Documentação: https://docs.expo.dev/build/introduction/"
echo ""

echo -e "${BLUE}📚 Guias Disponíveis:${NC}"
echo ""
echo "- MOBILE_TESTING_GUIDE.md - Guia completo de testes"
echo "- BUILD_APK.md - Guia detalhado de build"
echo "- README.md - Documentação do projeto"
echo ""

echo -e "${GREEN}✓ Script concluído com sucesso!${NC}"
echo ""

