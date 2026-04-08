import { query } from './src/config/database';
import { mercadoPagoService } from './src/services/mercadoPagoService';

async function updateAndTestPix() {
  const cleberCpf = '85805254620';
  const amandaCpf = '09920931713';
  
  // 1. Update CPFs
  console.log('Updating DB CPFs...');
  await query("UPDATE users SET cpf = $1 WHERE nickname ILIKE '%cleber%' OR email ILIKE '%cleber%'", [cleberCpf]);
  await query("UPDATE users SET cpf = $1 WHERE nickname ILIKE '%amanda%' OR email ILIKE '%amanda%'", [amandaCpf]);
  
  console.log('CPFs updated!');

  // 2. Test PIX with Cleber's data
  console.log('Testing PIX creation with Cleber data...');
  try {
    const pixData = await mercadoPagoService.createPixPayment(
      10, 
      'mourao.cleber@gmail.com', 
      'test_' + Date.now(), 
      'Cleber Mourao', 
      cleberCpf
    );
    console.log('Success!', pixData.status);
    console.log('Does qr_code exist?', !!pixData.qr_code);
  } catch (e: any) {
    console.error('Cleber PIX Failed:', e.message || e);
  }

  // 3. Test PIX with Amanda's data
  console.log('Testing PIX creation with Amanda data...');
  try {
    const pixData = await mercadoPagoService.createPixPayment(
      10, 
      'amandinha@gmail.com', 
      'test_' + Date.now(), 
      'Amandinha', 
      amandaCpf
    );
    console.log('Success!', pixData.status);
    console.log('Does qr_code exist?', !!pixData.qr_code);
  } catch (e: any) {
    console.error('Amanda PIX Failed:', e.message || e);
  }

  process.exit(0);
}
updateAndTestPix();
