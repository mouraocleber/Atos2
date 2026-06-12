const { Client } = require('ssh2');

const config = {
  host: '142.93.59.54',
  port: 22,
  username: 'root',
  password: 'fElicid@de137L',
};

const conn = new Client();

conn.on('ready', () => {
  conn.exec('docker logs atos2-backend 2>&1 | grep -i -E "Audio|Whisper|transcribe|fail|error"', (err, stream) => {
    if (err) throw err;
    stream.on('data', (data) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    }).on('close', () => {
      conn.end();
    });
  });
}).connect(config);
