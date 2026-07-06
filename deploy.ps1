Write-Host "1/3 Zippando os arquivos do backend (src, package.json, docker-compose.yml, Dockerfile, tsconfig.json)..."
Compress-Archive -Path "src", "package.json", "package-lock.json", "docker-compose.yml", "Dockerfile", "tsconfig.json", "landing-page" -DestinationPath deploy.zip -Force

Write-Host "2/3 Criando o diretório remoto e enviando os arquivos para a DigitalOcean (142.93.59.54)..."
ssh -o StrictHostKeyChecking=no root@142.93.59.54 "mkdir -p /app/atos2"
scp -o StrictHostKeyChecking=no deploy.zip root@142.93.59.54:/app/atos2/
scp -o StrictHostKeyChecking=no .env.production root@142.93.59.54:/app/atos2/.env

Write-Host "3/3 Aplicando as atualizações no servidor (descompactando e iniciando os containers)..."
ssh -o StrictHostKeyChecking=no root@142.93.59.54 "cd /app/atos2 && (if ! command -v unzip >/dev/null 2>&1; then echo 'Instalando unzip...'; apt-get update && apt-get install -y unzip; fi) && (unzip -o deploy.zip || true) && (if ! command -v docker >/dev/null 2>&1; then echo 'Instalando Docker...'; curl -fsSL https://get.docker.com | sh; fi) && docker compose down --remove-orphans && docker compose build && docker compose up -d"

Write-Host "4/4 Aplicando Migrações no Banco de Dados (PostgreSQL)..."
ssh -o StrictHostKeyChecking=no root@142.93.59.54 "sleep 5 && docker exec atos2-db psql -U postgres -d atos2 -c 'ALTER TABLE users ADD COLUMN IF NOT EXISTS person_type VARCHAR(2) DEFAULT ''PF'', ADD COLUMN IF NOT EXISTS cpf VARCHAR(14), ADD COLUMN IF NOT EXISTS cep VARCHAR(10) DEFAULT ''00000000'', ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT ''FREE'', ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMP, ADD COLUMN IF NOT EXISTS block_non_contacts BOOLEAN DEFAULT FALSE;' || true"

Write-Host "✅ Deploy concluído com sucesso!"
