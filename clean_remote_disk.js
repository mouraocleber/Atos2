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
  console.log('SSH connection established! Starting disk cleanup...');
  
  const cmd = [
    'echo "=== DISK SPACE BEFORE ==="',
    'df -h',
    'echo "=== DOCKER IMAGES/CONTAINERS BEFORE ==="',
    'docker system df',
    'echo "=== RUNNING DOCKER PRUNE ==="',
    'docker system prune -a --volumes -f',
    'echo "=== DISK SPACE AFTER ==="',
    'df -h'
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
