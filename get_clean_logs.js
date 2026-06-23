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
  console.log('SSH connection established! Fetching filtered logs...');
  
  // View the last 5000 lines of the backend container logs excluding the scheduled query spam
  conn.exec("docker logs atos2-backend --tail 5000 2>&1 | grep -E -v 'SCHEDULED|Query executada' | tail -n 150", (err, stream) => {
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
      console.log(`\nSSH command exited with code ${code}`);
      conn.end();
    });
  });
}).connect(config);
