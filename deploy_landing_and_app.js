const { Client } = require('ssh2');

const config = {
  host: '142.93.59.54',
  port: 22,
  username: 'root',
  password: 'fElicid@de137L',
  readyTimeout: 15000,
};

const conn = new Client();

function runExec(cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = '';
      stream.on('data', d => { out += d; process.stdout.write(d); });
      stream.stderr.on('data', d => { out += d; process.stderr.write(d); });
      stream.on('close', code => {
        if (code !== 0) return reject(new Error('Command failed: ' + cmd + ' with code ' + code));
        resolve(out);
      });
    });
  });
}

function uploadFile(sftp, local, remote) {
  return new Promise((resolve, reject) => {
    sftp.fastPut(local, remote, (err) => {
      if (err) return reject(err);
      console.log('Upload concluido: ' + remote);
      resolve();
    });
  });
}

conn.on('ready', async () => {
  try {
    console.log('SSH conectado. 1. Garantindo backup do app.html...');
    await runExec('cp -n /var/www/atos2-web/index.html /var/www/atos2-web/app.html || true');

    console.log('2. Abrindo canal SFTP...');
    const sftp = await new Promise((res, rej) => conn.sftp((e, s) => e ? rej(e) : res(s)));

    await uploadFile(sftp, 'c:/Users/Usuario/projetos/Atos2/landing-page/index.html', '/var/www/atos2-web/index.html');
    await uploadFile(sftp, 'c:/Users/Usuario/projetos/Atos2/landing-page/styles.css', '/var/www/atos2-web/styles.css');
    await uploadFile(sftp, 'c:/Users/Usuario/projetos/Atos2/landing-page/script.js', '/var/www/atos2-web/script.js');

    console.log('3. Atualizando Nginx com rota da Landing Page e Web App...');
    const nginxConf = `cat << 'EOF' > /etc/nginx/sites-available/atos2
# ==========================================
# 1. API BACKEND (api.atos2.online)
# ==========================================
server {
    server_name api.atos2.online;

    location / {
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '$http_origin' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE, PATCH' always;
            add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, Accept, Accept-Language, Origin, X-Requested-With' always;
            add_header 'Access-Control-Allow-Credentials' 'true' always;
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }

        add_header 'Access-Control-Allow-Origin' '$http_origin' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        proxy_hide_header Access-Control-Allow-Origin;

        proxy_set_header Origin "";
        proxy_set_header X-Forwarded-For "";

        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/api.atos2.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.atos2.online/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

# ==========================================
# 2. SITE WEB (atos2.online e www.atos2.online)
# ==========================================
server {
    server_name atos2.online www.atos2.online;
    root /var/www/atos2-web;
    index index.html;

    # Pagina inicial (Landing Page oficial)
    location = / {
        try_files /index.html =404;
    }

    # Apresentacoes e pitches
    location ~* ^/(pitch|pitch_en|video)(\.html)?$ {
        try_files $uri $uri.html /pitch.html =404;
    }

    # Arquivos estaticos
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|pdf|woff|woff2|ttf|eot|mp4|webm|json)$ {
        try_files $uri =404;
    }

    # Rotas do Web App SPA (Connect, Login, Cadastro, Checkout, Chat, Tabs, etc.)
    # Todas as rotas de navegacao da SPA sao servidas pelo app.html
    location / {
        try_files $uri $uri/ /app.html;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/api.atos2.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.atos2.online/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = www.atos2.online) {
        return 301 https://$host$request_uri;
    }
    if ($host = atos2.online) {
        return 301 https://$host$request_uri;
    }
    if ($host = api.atos2.online) {
        return 301 https://$host$request_uri;
    }

    listen 80;
    server_name api.atos2.online atos2.online www.atos2.online;
    return 404;
}
EOF
nginx -t && systemctl reload nginx
`;
    await runExec(nginxConf);
    console.log('SUCESSO TOTAL! Landing page e Nginx implantados!');
  } catch (err) {
    console.error('Erro no deploy:', err);
  } finally {
    conn.end();
  }
}).connect(config);
