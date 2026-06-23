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
  
  // We will run a node one-liner script inside the atos2-backend docker container to perform the API call to create a product.
  // Note: we can use the http module built into Node.js so we don't have to install any dependencies.
  const nodeScript = `
const http = require('http');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'xyY2PgRtJTsDuZQRt4NpeusZMrpvtUU9gyXTk3Lfnn3MSm3u';
const userId = '2f9c89c0-e1c6-4cd5-a754-2b7fe2f600a5';
const email = 'mourao.cleber@gmail.com';

const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '1h' });

const postData = JSON.stringify({
  name: 'Produto Teste Vitrine Prod',
  price: '19.99',
  description: 'Descrição do produto teste vitrine em produção',
  category: 'Testes',
});

const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/products',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'Authorization': 'Bearer ' + token
  }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('BODY:', data);
  });
});

req.on('error', (e) => {
  console.error('Problem with request:', e.message);
});

req.write(postData);
req.end();
  `;

  // Escape nodeScript for bash double quotes
  const escapedScript = nodeScript.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/`/g, '\\`').replace(/\$/g, '\\$');

  const cmd = `docker exec atos2-backend node -e "${escapedScript}"`;

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
      console.log(`SSH command exited with code ${code}`);
      conn.end();
    });
  });
}).connect(config);
