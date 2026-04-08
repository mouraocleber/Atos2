#!/bin/bash

# 📱 Script para Gerar QR Code de Instalação - Atos2

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════╗"
echo "║     📱 ATOS2 - GERAR QR CODE DE INSTALAÇÃO 📱         ║"
echo "╚════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Verificar se o link foi fornecido
if [ $# -eq 0 ]; then
    echo -e "${YELLOW}Opção 1: Fornecer link do APK${NC}"
    echo "Uso: $0 <link_apk>"
    echo ""
    echo -e "${YELLOW}Opção 2: Obter link do EAS automaticamente${NC}"
    echo ""
    echo "Obtendo builds do EAS..."
    
    # Verificar se EAS CLI está instalado
    if ! command -v eas &> /dev/null; then
        echo -e "${RED}✗ EAS CLI não encontrado${NC}"
        echo "Instale com: npm install -g eas-cli"
        exit 1
    fi
    
    # Listar builds
    echo -e "${BLUE}Builds disponíveis:${NC}"
    eas build:list --limit 5
    
    echo ""
    echo -e "${YELLOW}Cole o link do APK abaixo:${NC}"
    read -p "Link: " APK_LINK
else
    APK_LINK=$1
fi

# Validar link
if [ -z "$APK_LINK" ]; then
    echo -e "${RED}✗ Link do APK não fornecido${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}[1/3]${NC} Verificando se Python está instalado..."
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}✗ Python3 não encontrado${NC}"
    echo "Instale com: apt-get install python3"
    exit 1
fi
echo -e "${GREEN}✓ Python3 encontrado${NC}"

echo ""
echo -e "${YELLOW}[2/3]${NC} Instalando biblioteca qrcode..."
pip3 install -q qrcode[pil] 2>/dev/null || pip install -q qrcode[pil]
echo -e "${GREEN}✓ Biblioteca instalada${NC}"

echo ""
echo -e "${YELLOW}[3/3]${NC} Gerando QR Code..."

# Criar script Python inline
python3 << EOF
import qrcode
import os

apk_link = """$APK_LINK"""

# Gerar QR Code
qr = qrcode.QRCode(
    version=1,
    error_correction=qrcode.constants.ERROR_CORRECT_H,
    box_size=10,
    border=4,
)
qr.add_data(apk_link)
qr.make(fit=True)

# Criar imagem
img = qr.make_image(fill_color="black", back_color="white")

# Salvar
output_file = "atos2_install_qr.png"
img.save(output_file)

print(f"✓ QR Code gerado: {output_file}")
print(f"✓ Tamanho: {os.path.getsize(output_file)} bytes")
EOF

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              ✓ QR CODE GERADO COM SUCESSO!            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}📱 Próximas Etapas:${NC}"
echo ""
echo "1. Abra a câmera do seu celular"
echo "2. Aponte para o QR Code (atos2_install_qr.png)"
echo "3. Toque na notificação que aparecer"
echo "4. O APK será baixado automaticamente"
echo "5. Toque em 'Instalar'"
echo ""

echo -e "${YELLOW}📋 Informações do QR Code:${NC}"
echo ""
echo "Arquivo: atos2_install_qr.png"
echo "Link: $APK_LINK"
echo "Localização: $(pwd)/atos2_install_qr.png"
echo ""

echo -e "${BLUE}💡 Dicas:${NC}"
echo ""
echo "- Compartilhar QR Code: Enviar arquivo atos2_install_qr.png"
echo "- Imprimir QR Code: Abrir arquivo e imprimir"
echo "- Aumentar tamanho: Abrir em editor de imagens"
echo ""

echo -e "${GREEN}✓ Script concluído com sucesso!${NC}"
echo ""

