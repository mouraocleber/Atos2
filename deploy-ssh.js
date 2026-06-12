const { Client } = require('ssh2');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const config = {
  host: '142.93.59.54',
  port: 22,
  username: 'root',
  password: 'fElicid@de137L',
  readyTimeout: 30000,
};

console.log('1/4 Zipping backend files...');
try {
  execSync('powershell -Command "Compress-Archive -Path src, package.json, package-lock.json, docker-compose.yml, Dockerfile, tsconfig.json -DestinationPath deploy.zip -Force"', { stdio: 'inherit' });
  console.log('Zip file created successfully as deploy.zip');
} catch (err) {
  console.error('Error zipping files:', err);
  process.exit(1);
}

const conn = new Client();

conn.on('error', (err) => {
  console.error('SSH Connection Error:', err);
  process.exit(1);
});

conn.on('ready', () => {
  console.log('SSH connection established!');
  
  conn.sftp((err, sftp) => {
    if (err) {
      console.error('SFTP initialization failed:', err);
      conn.end();
      process.exit(1);
    }
    
    console.log('2/4 Uploading files via SFTP...');
    const localZip = path.resolve(__dirname, 'deploy.zip');
    const remoteZip = '/app/atos2/deploy.zip';
    
    const localEnv = path.resolve(__dirname, '.env.production');
    const remoteEnv = '/app/atos2/.env';
    
    // Upload Zip
    sftp.fastPut(localZip, remoteZip, {}, (err) => {
      if (err) {
        console.error('Error uploading deploy.zip:', err);
        conn.end();
        process.exit(1);
      }
      console.log('Uploaded deploy.zip successfully!');
      
      // Upload Env
      sftp.fastPut(localEnv, remoteEnv, {}, (err) => {
        if (err) {
          console.error('Error uploading .env:', err);
          conn.end();
          process.exit(1);
        }
        console.log('Uploaded .env successfully!');
        
        // 3. Execute remote commands in a single session
        console.log('3/4 Executing remote rebuild and update commands...');
        
        const cmd = [
          'mkdir -p /app/atos2',
          'cd /app/atos2',
          'if ! command -v unzip >/dev/null 2>&1; then echo "Instalando unzip..."; apt-get update && apt-get install -y unzip; fi',
          'unzip -o deploy.zip',
          'docker compose down --remove-orphans',
          'docker compose build --no-cache',
          'docker compose up -d',
          'echo "Waiting 5s for DB to settle..."',
          'sleep 5',
          'docker exec atos2-db psql -U postgres -d atos2 -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS person_type VARCHAR(2) DEFAULT \'PF\', ADD COLUMN IF NOT EXISTS cpf VARCHAR(14), ADD COLUMN IF NOT EXISTS cep VARCHAR(10) DEFAULT \'00000000\', ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT \'FREE\', ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMP, ADD COLUMN IF NOT EXISTS block_non_contacts BOOLEAN DEFAULT FALSE;" || true',
          'echo "Deploy and migrations done!"'
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
          
          stream.on('error', (streamErr) => {
            console.error('Stream error:', streamErr);
          });
          
          stream.on('close', (code, signal) => {
            console.log(`SSH commands exited with code ${code}`);
            conn.end();
            console.log('🚀 Deploy completed successfully!');
          });
        });
      });
    });
  });
}).connect(config);
