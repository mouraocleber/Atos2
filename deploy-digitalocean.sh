

#!/bin/bash
# ============================================
# deploy-digitalocean.sh
# Script de deploy automático para DigitalOcean
# Uso: ./deploy-digitalocean.sh SEU_IP_DO_DROPLET
# ============================================

set -e  # Para se qualquer comando falhar

DROPLET_IP=$1
REMOTE_DIR="/app/atos2"

if [ -z "$DROPLET_IP" ]; then
  echo "❌ Informe o IP do Droplet: ./deploy-digitalocean.sh SEU_IP"
  exit 1
fi

echo "🚀 Iniciando deploy para $DROPLET_IP..."

# ─── FASE 1: Enviar arquivos ───────────────────────────────────
echo ""
echo "📦 Enviando código para o servidor..."

# Criar diretório no servidor
ssh root@$DROPLET_IP "mkdir -p $REMOTE_DIR"

# Usar rsync para envio eficiente (exclui node_modules, dist, .git)
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '.git' \
  --exclude '*.zip' \
  --exclude 'uploads' \
  --exclude 'atos2-antigravity' \
  --exclude 'frontend' \
  . root@$DROPLET_IP:$REMOTE_DIR/

echo "✅ Arquivos enviados!"

# ─── FASE 2: Enviar .env de produção ──────────────────────────
echo ""
echo "🔐 Enviando arquivo de configuração..."
scp .env.production root@$DROPLET_IP:$REMOTE_DIR/.env
echo "✅ .env enviado!"

# ─── FASE 3: Executar docker compose no servidor ─────────────
echo ""
echo "🐳 Iniciando containers Docker..."
ssh root@$DROPLET_IP "
  cd $REMOTE_DIR
  
  # Instalar Docker se não estiver instalado
  if ! command -v docker &> /dev/null; then
    echo 'Instalando Docker...'
    curl -fsSL https://get.docker.com | sh
  fi
  
  # Subir containers
  docker compose down --remove-orphans 2>/dev/null || true
  docker compose build --no-cache
  docker compose up -d
  
  echo 'Aplicando Migrações no Banco de Dados (PostgreSQL)...'
  sleep 5
  docker exec atos2-db psql -U postgres -d atos2 -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS person_type VARCHAR(2) DEFAULT 'PF', ADD COLUMN IF NOT EXISTS cpf VARCHAR(14), ADD COLUMN IF NOT EXISTS cep VARCHAR(10) DEFAULT '00000000', ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'FREE', ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMP, ADD COLUMN IF NOT EXISTS block_non_contacts BOOLEAN DEFAULT FALSE;" || true
  
  echo ''
  echo '📊 Status dos containers:'
  docker compose ps
"

echo ""
echo "✅ Deploy concluído!"
echo ""
echo "🌐 Backend disponível em: http://$DROPLET_IP:3001"
echo "🔍 Verifique: curl http://$DROPLET_IP:3001/api/health"
echo ""
echo "📱 Atualize o app mobile:"
echo "   atos2-antigravity/services/api.ts → baseURL: 'http://$DROPLET_IP:3001/api'"
