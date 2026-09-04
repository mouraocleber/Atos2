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
    'echo "=== DOCKER PS -A ==="',
    'docker ps -a',
    'echo "=== DOCKER COMPOSE PS -A ==="',
    'cd /app/atos2 && docker compose ps -a',
    'echo "=== DOCKER COMPOSE LOGS ==="',
    'cd /app/atos2 && docker compose logs --tail 50'
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
      console.log(`SSH commands exited with code ${code}`);
      conn.end();
    });
  });
}).connect(config);
