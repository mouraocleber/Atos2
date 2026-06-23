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
    'echo "=== Buscando todos os arquivos .env no servidor ==="',
    'find / -name ".env" -not -path "*/node_modules/*" -not -path "*/proc/*" -not -path "*/sys/*" 2>/dev/null | while read file; do echo "Arquivo: $file"; grep "MP_ACCESS_TOKEN" "$file" || echo "Sem MP_ACCESS_TOKEN"; echo ""; done',
    'echo "=== FIM ==="'
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
