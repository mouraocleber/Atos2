import { query } from './src/config/database';

async function recalculateBalance() {
  try {
    const amandaRes = await query(`SELECT id, nickname FROM users WHERE nickname ILIKE '%amanda%' OR nickname ILIKE '%amandinha%'`);
    if (amandaRes.rows.length === 0) return process.exit(0);
    const amandaId = amandaRes.rows[0].id;

    // Credits (deposits to wallet, transfers received)
    const creditsRes = await query(`
      SELECT SUM(amount) as total 
      FROM transactions 
      WHERE to_user_id = $1 AND status = 'COMPLETED'
    `, [amandaId]);
    
    // Self/API additions
    const deposits = await query(`
      SELECT SUM(amount) as total 
      FROM transactions 
      WHERE from_user_id = $1 AND type = 'DEPOSIT' AND status = 'COMPLETED'
    `, [amandaId]);

    // Debits (transfers sent, withdraws, payments)
    const debitsRes = await query(`
      SELECT SUM(amount) as total 
      FROM transactions 
      WHERE from_user_id = $1 AND type IN ('TRANSFER', 'PAYMENT', 'WITHDRAW') AND status = 'COMPLETED'
    `, [amandaId]);

    const totalCredits = parseFloat(creditsRes.rows[0].total || '0') + parseFloat(deposits.rows[0].total || '0');
    const totalDebits = parseFloat(debitsRes.rows[0].total || '0');
    const exactBalance = totalCredits - totalDebits;

    console.log(`Reconciling Amanda's balance: Credits(${totalCredits}) - Debits(${totalDebits}) = ${exactBalance}`);

    await query(`
      UPDATE wallets SET balance = $1 WHERE user_id = $2 AND currency = 'BRL';
    `, [exactBalance, amandaId]);

    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
recalculateBalance();
