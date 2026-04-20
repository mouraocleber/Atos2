import { query } from './src/config/database';

async function addStripeColumn() {
  try {
    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(255) NULL;
    `);
    console.log("Column stripe_account_id added successfully!");
    process.exit(0);
  } catch (e) {
    console.error("Error adding column:", e);
    process.exit(1);
  }
}

addStripeColumn();
