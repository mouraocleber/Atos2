import { query } from './src/config/database';

async function createCurrencyTables() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS currency_rates (
          currency VARCHAR(3) PRIMARY KEY,
          rate DECIMAL(15, 6) NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS global_currency (
          id SERIAL PRIMARY KEY,
          name VARCHAR(50) NOT NULL,
          symbol VARCHAR(5) NOT NULL,
          value DECIMAL(15, 6) NOT NULL,
          usd DECIMAL(15, 6) NOT NULL,
          eur DECIMAL(15, 6) NOT NULL,
          jpy DECIMAL(15, 6) NOT NULL,
          cny DECIMAL(15, 6) NOT NULL,
          brl DECIMAL(15, 6) NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          next_update TIMESTAMP NOT NULL
      );

      INSERT INTO currency_rates (currency, rate, updated_at) VALUES 
      ('BRL', 5.00, CURRENT_TIMESTAMP),
      ('USD', 1.00, CURRENT_TIMESTAMP),
      ('EUR', 0.92, CURRENT_TIMESTAMP),
      ('JPY', 150.00, CURRENT_TIMESTAMP),
      ('CNY', 7.20, CURRENT_TIMESTAMP)
      ON CONFLICT (currency) DO UPDATE SET rate = EXCLUDED.rate;
    `);

    console.log("Moeda Global tables created and populated!");
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

createCurrencyTables();
