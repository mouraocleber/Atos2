import { query } from './src/config/database';
import currencyService from './src/services/currencyService';

async function fixCurrencies() {
  try {
    // Populate base rates
    await query(`
      INSERT INTO currency_rates (currency, rate, updated_at) VALUES 
      ('BRL', 5.00, CURRENT_TIMESTAMP),
      ('USD', 1.00, CURRENT_TIMESTAMP),
      ('EUR', 0.92, CURRENT_TIMESTAMP),
      ('JPY', 150.00, CURRENT_TIMESTAMP),
      ('CNY', 7.20, CURRENT_TIMESTAMP)
      ON CONFLICT DO NOTHING;
    `);

    try {
      // Force initialization of Global currency
      const globalCurr = await currencyService.updateGlobalCurrency();
      console.log('Global Currency initialized: ', globalCurr.value);
    } catch (e) {
      console.error('Error updating global currency:', e);
    }

    console.log('Currencies fixed!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixCurrencies();
