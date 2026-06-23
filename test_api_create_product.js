const { Client } = require('pg');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin',
  database: process.env.DB_NAME || 'app_mensagens_cash',
};

const JWT_SECRET = process.env.JWT_SECRET || 'xyY2PgRtJTsDuZQRt4NpeusZMrpvtUU9gyXTk3Lfnn3MSm3u';

async function run() {
  const client = new Client(dbConfig);
  await client.connect();
  console.log('Connected to PG');

  // Let's create or update a user to be BUSINESS/PRO
  const userRes = await client.query(`
    INSERT INTO users (email, phone, nickname, name, person_type, cpf, cep, password_hash, is_active, is_searchable, plan)
    VALUES ('vitrineuser@example.com', '999999999', 'vituser', 'Vitrine User', 'PF', '99999999999', '01001000', 'hash', true, true, 'BUSINESS')
    ON CONFLICT (email) DO UPDATE SET plan = 'BUSINESS', is_active = true
    RETURNING id, email, plan;
  `);

  const user = userRes.rows[0];
  console.log('User:', user);

  // Generate JWT token
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
  console.log('Token generated successfully');

  // Send a POST request to create a product (without file upload first)
  try {
    const response = await axios.post('http://localhost:3001/api/products', {
      name: 'Produto Teste Vitrine',
      price: '19.99',
      description: 'Descrição do produto teste vitrine',
      category: 'Testes',
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('Product created without file:', response.data);
  } catch (error) {
    console.error('Error creating product without file:', error.response ? error.response.data : error.message);
  }

  // Let's also check with a simulated file upload if possible, or just look at req.file handling
  // Wait, let's query the database to see if the product was actually created and what its stock/quantity is.
  const prodRes = await client.query('SELECT * FROM products WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [user.id]);
  console.log('Last product in DB:', prodRes.rows[0]);

  await client.end();
}

run().catch(console.error);
