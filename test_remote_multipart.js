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
  
  const nodeScript = `
const http = require('http');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'xyY2PgRtJTsDuZQRt4NpeusZMrpvtUU9gyXTk3Lfnn3MSm3u';
const userId = '2f9c89c0-e1c6-4cd5-a754-2b7fe2f600a5';
const email = 'mourao.cleber@gmail.com';

const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '1h' });

const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
const bodyParts = [
  '--' + boundary,
  'Content-Disposition: form-data; name="name"',
  '',
  'Produto Teste Multipart',
  '--' + boundary,
  'Content-Disposition: form-data; name="price"',
  '',
  '29.99',
  '--' + boundary,
  'Content-Disposition: form-data; name="description"',
  '',
  'Descrição do produto multipart',
  '--' + boundary,
  'Content-Disposition: form-data; name="category"',
  '',
  'Roupas',
  '--' + boundary,
  'Content-Disposition: form-data; name="image"; filename="test.jpg"',
  'Content-Type: image/jpeg',
  '',
  'fake-binary-data-of-image',
  '--' + boundary + '--',
  ''
];

const postData = bodyParts.join('\\r\\n');

const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/products',
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data; boundary=' + boundary,
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
      conn.end();
    });
  });
}).connect(config);
