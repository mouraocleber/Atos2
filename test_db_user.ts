import { query } from './src/config/database';

async function verifyAll() {
  const adminRes = await query(`SELECT * FROM users WHERE nickname ILIKE '%cleber%'`);
  for (const user of adminRes.rows) {
    console.log(`User: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`CPF: ${user.cpf}`);
    console.log(`CPF digits length: ${user.cpf?.replace(/\\D/g, '').length}`);
    console.log('---');
  }
  process.exit(0);
}
verifyAll();
