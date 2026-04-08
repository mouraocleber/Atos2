import { query } from './src/config/database';

async function checkDb() {
  try {
    const res = await query('SELECT id, email, nickname, name FROM users LIMIT 5;');
    console.log('Users in DB:');
    console.table(res.rows);
  } catch (e) {
    console.error('Error querying DB:', e);
  } finally {
    process.exit();
  }
}

checkDb();
