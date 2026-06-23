const { Client } = require('ssh2');

const config = {
  host: '142.93.59.54',
  port: 22,
  username: 'root',
  password: 'fElicid@de137L',
  readyTimeout: 30000,
};

const conn = new Client();

conn.on('error', (err) => {
  console.error('SSH Connection Error:', err);
  process.exit(1);
});

conn.on('ready', () => {
  console.log('SSH connection established!');
  
  const cmd = [
    'echo "=== /app/atos2/.env (Servidor) ==="',
    'grep MP_ACCESS_TOKEN /app/atos2/.env || echo "Não encontrado no arquivo"',
    'echo ""',
    'echo "=== Container atos2-backend env ==="',
    'docker exec atos2-backend env | grep MP_ACCESS_TOKEN || echo "Não encontrado no container"',
    'echo ""',
    'echo "=== Reiniciando o container para recarregar se necessário ==="',
    'cd /app/atos2 && docker compose up -d --force-recreate backend',
    'sleep 3',
    'echo ""',
    'echo "=== Novo Container env ==="',
    'docker exec atos2-backend env | grep MP_ACCESS_TOKEN'
  ].join(' && ');

  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('Error running exec:', err);
      conn.end();
      process.exit(1);
    }
    
    stream.on('data', (data) => {
      process.stdout.write(data.toString());
    });
    
    stream.stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
    
    stream.on('close', (code, signal) => {
      conn.end();
    });
  });
}).connect(config);
