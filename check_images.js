const { Client } = require('ssh2');

const config = {
  host: '142.93.59.54',
  port: 22,
  username: 'root',
  password: 'fElicid@de137L',
};

const conn = new Client();

conn.on('ready', () => {
  console.log('SSH connection established!');
  const cmd = `docker logs atos2-backend --tail 250`;
  
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    
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
