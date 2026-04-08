import { query } from './src/config/database';

async function updateBalance() {
  try {
    const res = await query(`UPDATE wallets SET balance = balance + 1000 WHERE user_id IN (SELECT id FROM users WHERE nickname ILIKE '%cleber%' OR name ILIKE '%cleber%') RETURNING id, balance`);
    console.log('Update result wallets:', res.rows);
    if (res.rows.length === 0) {
      console.log('No wallet found, returning users instead.');
      const usr = await query(`SELECT id, name, nickname FROM users WHERE nickname ILIKE '%cleber%' OR name ILIKE '%cleber%'`);
      console.table(usr.rows);
      if (usr.rows.length > 0) {
        await query(`INSERT INTO wallets (id, user_id, currency, balance) VALUES (gen_random_uuid(), $1, 'BRL', 1000)`, [usr.rows[0].id]);
        console.log('Created wallet and added 1000 BRL to', usr.rows[0].nickname);
      }
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

updateBalance();
