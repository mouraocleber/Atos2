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

function runCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`\n--- Running: ${command} ---`);
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      
      stream.on('data', (data) => {
        process.stdout.write(data.toString());
      });
      
      stream.stderr.on('data', (data) => {
        process.stderr.write(data.toString());
      });
      
      stream.on('close', (code, signal) => {
        console.log(`\nExit code: ${code}`);
        resolve(code);
      });
    });
  });
}

conn.on('ready', async () => {
  console.log('SSH connection established!');
  try {
    await runCommand('pwd');
    await runCommand('ls -la /app/atos2');
    await runCommand('docker --version');
    await runCommand('docker compose version');
    await runCommand('cd /app/atos2 && docker compose down --remove-orphans');
    await runCommand('cd /app/atos2 && docker compose build --no-cache');
    await runCommand('cd /app/atos2 && docker compose up -d');
    await runCommand('docker ps -a');
  } catch (err) {
    console.error('Error during execution:', err);
  } finally {
    conn.end();
  }
}).connect(config);
