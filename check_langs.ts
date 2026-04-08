import { query } from './src/config/database';

async function run() {
  try {
    const users = await query(`SELECT nickname, name, preferred_language FROM users WHERE nickname ILIKE '%amanda%' OR nickname ILIKE '%cleber%'`);
    console.table(users.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
