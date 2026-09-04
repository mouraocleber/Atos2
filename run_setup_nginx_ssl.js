const { Client } = require('ssh2');
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
  console.log('SSH connection established!');
  
  conn.sftp((err, sftp) => {
    if (err) {
      console.error('SFTP initialization failed:', err);
      conn.end();
      process.exit(1);
    }
    
    console.log('Uploading setup-nginx-ssl.sh via SFTP...');
    const localFile = path.resolve(__dirname, 'setup-nginx-ssl.sh');
    const remoteFile = '/app/atos2/setup-nginx-ssl.sh';
    
    sftp.fastPut(localFile, remoteFile, {}, (err) => {
      if (err) {
        console.error('Error uploading setup-nginx-ssl.sh:', err);
        conn.end();
        process.exit(1);
      }
      console.log('Uploaded setup-nginx-ssl.sh successfully!');
      
      console.log('Running setup-nginx-ssl.sh on remote server...');
      
      const cmd = [
        'chmod +x /app/atos2/setup-nginx-ssl.sh',
        'bash /app/atos2/setup-nginx-ssl.sh'
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
          console.log(`\nSSH commands exited with code ${code}`);
          conn.end();
          if (code === 0) {
            console.log('🚀 Nginx and SSL setup script finished successfully!');
          } else {
            console.error('❌ Script failed on the remote server.');
            process.exit(code);
          }
        });
      });
    });
  });
}).connect(config);
