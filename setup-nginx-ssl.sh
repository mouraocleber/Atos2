#!/bin/bash
# ============================================
# setup-nginx-ssl.sh
# Automatiza a instalação do Nginx, configuração do Proxy Reverso
# e geração de certificado SSL Let's Encrypt para o Atos2.
# ============================================

set -e

echo "⚙️ Atualizando pacotes e instalando Nginx e Certbot..."
apt-get update
apt-get install -y nginx certbot python3-certbot-nginx

echo "⚙️ Criando arquivo de configuração do Nginx..."
cat << 'EOF' > /etc/nginx/sites-available/atos2
server {
    listen 80;
    server_name atos2.online www.atos2.online api.atos2.online;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

echo "⚙️ Habilitando o site e desativando o default..."
ln -sf /etc/nginx/sites-available/atos2 /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

echo "⚙️ Testando sintaxe do Nginx..."
nginx -t

echo "⚙️ Reiniciando Nginx..."
systemctl restart nginx
systemctl enable nginx

echo "✅ Nginx configurado com sucesso como Proxy Reverso na porta 80!"
echo ""
echo "🚀 Tentando solicitar Certificado SSL com Certbot..."
echo "Nota: Isso requer que o DNS já tenha propagado para o IP 142.93.59.54."
echo ""

if certbot --nginx -d atos2.online -d www.atos2.online -d api.atos2.online --non-interactive --agree-tos --email suporte@atos2.online; then
    echo "🎉 SSL configurado com sucesso para atos2.online, www.atos2.online e api.atos2.online!"
    echo "Nginx recarregado com HTTPS ativo."
else
    echo "⚠️ O Certbot falhou (provavelmente porque o DNS ainda não propagou para este servidor)."
    echo "Tudo bem! O Nginx já está rodando em HTTP (porta 80)."
    echo "Assim que a propagação do DNS terminar na Hostinger, você pode gerar o SSL rodando este comando no servidor:"
    echo "  certbot --nginx -d atos2.online -d www.atos2.online -d api.atos2.online"
fi
