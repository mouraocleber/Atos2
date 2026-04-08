import { query } from './src/config/database';
import { mercadoPagoService } from './src/services/mercadoPagoService';

async function finalFix() {
  const cleberCpf = '85805254620';
  const cleberEmail = 'mourao.cleber@gmail.com';
  const amandaCpf = '09920931713';
  const amandaEmail = 'Amandinha@atos2.com';
  const amandaName = 'Amandinha';

  // The ghost Cleber@atos2.com has the real CPF, swap it to a placeholder
  await query("UPDATE users SET cpf = '11111111111' WHERE email = 'Cleber@atos2.com' AND cpf = $1", [cleberCpf]);
  console.log('Ghost Cleber CPF freed');

  // Now give the real Cleber Mourão his correct CPF
  await query("UPDATE users SET cpf = $1 WHERE email = $2", [cleberCpf, cleberEmail]);
  console.log('Cleber Mourão CPF set to', cleberCpf);

  // Verify Amanda already has correct CPF
  const amanda = await query("SELECT cpf FROM users WHERE email = $1", [amandaEmail]);
  console.log('Amanda current CPF:', amanda.rows[0]?.cpf, '(expected:', amandaCpf + ')');

  // Test PIX for Cleber
  console.log('\nTesting PIX for Cleber Mourão...');
  try {
    const pix = await mercadoPagoService.createPixPayment(10, cleberEmail, 'test_c_' + Date.now(), 'Cleber Mourao', cleberCpf);
    console.log('✅ SUCCESS! qr_code exists:', !!pix.qr_code, ' | status:', pix.status);
  } catch(e: any) {
    console.error('❌ FAILED:', e.message);
  }

  // Test PIX for Amandinha
  console.log('\nTesting PIX for Amandinha...');
  try {
    const pix = await mercadoPagoService.createPixPayment(10, amandaEmail, 'test_a_' + Date.now(), amandaName, amandaCpf);
    console.log('✅ SUCCESS! qr_code exists:', !!pix.qr_code, ' | status:', pix.status);
  } catch(e: any) {
    console.error('❌ FAILED:', e.message);
  }

  process.exit(0);
}
finalFix();
