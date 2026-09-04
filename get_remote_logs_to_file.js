const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

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
  console.log('SSH connection established! Fetching 3000 lines of logs...');
  
  conn.exec('docker logs atos2-backend --tail 3000', (err, stream) => {
    if (err) {
      console.error('Error running exec:', err);
      conn.end();
      process.exit(1);
    }
    
    const writeStream = fs.createWriteStream(path.join(__dirname, 'backend_logs.txt'));
    
    stream.on('data', (data) => {
      writeStream.write(data);
    });
    
    stream.stderr.on('data', (data) => {
      writeStream.write(data);
    });
    
    stream.on('close', (code, signal) => {
      console.log(`Logs saved to backend_logs.txt. SSH command exited with code ${code}`);
      writeStream.end();
      conn.end();
    });
  });
}).connect(config);
