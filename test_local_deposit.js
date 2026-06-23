const axios = require('axios');
const jwt = require('jsonwebtoken');
const { Client } = require('pg');

const dbConfig = {
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'admin',
  database: 'app_mensagens_cash',
};

const JWT_SECRET = 'xyY2PgRtJTsDuZQRt4NpeusZMrpvtUU9gyXTk3Lfnn3MSm3u';

async function run() {
  const client = new Client(dbConfig);
  await client.connect();
  console.log('Connected to PG');

  // Let's create or update a user to be PRO
  const userRes = await client.query(`
    INSERT INTO users (email, phone, nickname, name, person_type, cpf, cep, password_hash, is_active, is_searchable, plan)
    VALUES ('prouser@example.com', '888888888', 'prouser', 'Pro User', 'PF', '88888888888', '01001000', 'hash', true, true, 'PRO')
    ON CONFLICT (email) DO UPDATE SET plan = 'PRO', is_active = true
    RETURNING id, email, plan;
  `);

  const user = userRes.rows[0];
  console.log('User:', user);

  // Generate JWT token
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
  console.log('Token generated successfully');

  try {
    const response = await axios.post('http://localhost:3001/api/payments/deposit/pix', {
      amount: 50.00,
      currency: 'BRL'
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('Deposit success response:', response.data);
  } catch (error) {
    console.error('Deposit error response:', error.response ? error.response.data : error.message);
  }

  await client.end();
}

run();
