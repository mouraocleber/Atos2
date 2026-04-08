import { query } from './src/config/database';

async function fixTransfers() {
  try {
    const amandaRes = await query(`SELECT id, nickname FROM users WHERE nickname ILIKE '%amanda%' OR nickname ILIKE '%amandinha%'`);
    if (amandaRes.rows.length === 0) {
      console.log('Amandinha not found');
      return process.exit(0);
    }
    const amandaId = amandaRes.rows[0].id;
    console.log('Found Amanda:', amandaRes.rows[0].nickname, amandaId);

    // Get transfers to her
    const txRes = await query(`
      SELECT SUM(amount) as total_received 
      FROM transactions 
      WHERE to_user_id = $1 AND type = 'TRANSFER' AND status = 'COMPLETED'
    `, [amandaId]);

    const missingAmount = parseFloat(txRes.rows[0].total_received || '0');
    console.log('Missing amount to credit:', missingAmount);

    // Upsert her wallet
    await query(`
      INSERT INTO wallets (user_id, currency, balance)
      VALUES ($1, 'BRL', $2)
      ON CONFLICT (user_id) 
      DO UPDATE SET balance = wallets.balance + EXCLUDED.balance, updated_at = CURRENT_TIMESTAMP;
    `, [amandaId, missingAmount]);

    console.log('Amanda credited with missing BRL:', missingAmount);
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
fixTransfers();
