import currencyService from '../src/services/currencyService';

async function run() {
  console.log('Testing currencyService...');
  try {
    const quote = await currencyService.updateGlobalCurrency();
    console.log('Successfully updated global currency:', quote);
    process.exit(0);
  } catch (err) {
    console.error('Error in currencyService test:', err);
    process.exit(1);
  }
}
run();
