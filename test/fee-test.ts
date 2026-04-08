import walletService from '../src/services/walletService';

async function run() {
  console.log('Testing fee calculations...');
  const amounts = [500.55, 2000.10, 10000.99];
  for (const amt of amounts) {
    const fee = walletService.calculateFee(amt, false);
    const totalAmount = amt + fee;
    console.log(`Amount: ${amt}, Fee: ${fee}, Total: ${totalAmount}`);
  }
  process.exit(0);
}
run();
