import { query } from './src/config/database';
import { mercadoPagoService } from './src/services/mercadoPagoService';

async function patchCPFs() {
  const cleberTargetEmail = 'mourao.cleber@gmail.com';
  const cleberTargetName = 'Cleber Mourao';
  const amandaTargetEmail = 'amandinha.mourao@gmail.com'; // or whatever it is, let's query first
  
  const cleberCpf = '85805254620';
  const amandaCpf = '09920931713';
  
  try {
    // 1. Clear anyone else that might have these CPFs
    await query("UPDATE users SET cpf = '00000000001' WHERE cpf = $1 AND email != $2", [cleberCpf, cleberTargetEmail]);
    await query("UPDATE users SET cpf = '00000000002' WHERE cpf = $1 AND email != $2", [amandaCpf, amandaTargetEmail]);
    
    // 2. Set to Cleber Mourão
    await query("UPDATE users SET cpf = $1 WHERE email = $2", [cleberCpf, cleberTargetEmail]);
    console.log('Cleber CPF patched successfully.');

    // 3. Set to Amandinha (find her email first because it might be different)
    const amandaReq = await query("SELECT email, name FROM users WHERE nickname ILIKE '%amanda%' OR nickname ILIKE '%amandinha%' LIMIT 1");
    if (amandaReq.rows.length > 0) {
      const actualAmandaEmail = amandaReq.rows[0].email;
      const actualAmandaName = amandaReq.rows[0].name;
      await query("UPDATE users SET cpf = $1 WHERE email = $2", [amandaCpf, actualAmandaEmail]);
      console.log('Amanda CPF patched successfully:', actualAmandaEmail);

      // Testing PIX for Amanda
      console.log('Testing PIX creation with Amanda data...');
      try {
        const pixA = await mercadoPagoService.createPixPayment(10, actualAmandaEmail, 'test_a_' + Date.now(), actualAmandaName, amandaCpf);
        console.log('Amanda PIX Success! qr_code exists:', !!pixA.qr_code);
      } catch (e:any) {
        console.error('Amanda MercadoPago API Error:', e.cause || e.message);
      }
    }

    // 4. Testing PIX for Cleber
    console.log('Testing PIX creation with Cleber data...');
    try {
      const pixC = await mercadoPagoService.createPixPayment(10, cleberTargetEmail, 'test_c_' + Date.now(), cleberTargetName, cleberCpf);
      console.log('Cleber PIX Success! qr_code exists:', !!pixC.qr_code);
    } catch (e:any) {
      console.error('Cleber MercadoPago API Error:', e.message);
      if (e.cause) console.error(JSON.stringify(e.cause, null, 2));
    }
  } catch (e) {
    console.error('Database patch error:', e);
  }
  process.exit(0);
}
patchCPFs();
