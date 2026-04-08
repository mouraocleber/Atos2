import 'dotenv/config';

async function testPix() {
  console.log('=== DIAGNÓSTICO PIX ===\n');

  // 1. Checar token
  const rawToken = process.env.MP_ACCESS_TOKEN || '';
  console.log('[1] Token no .env:');
  console.log('  Prefixo:', rawToken.substring(0, 10) + '...');
  console.log('  Comprimento:', rawToken.length);
  console.log('  Formato OK?', rawToken.startsWith('TEST-') ? '✅ SIM (TEST-)' : '❌ NÃO - token de teste deve começar com TEST-');

  // 2. Testar regex do CPF
  const cpfRaw = '123.456.789-09';
  const cleaned = cpfRaw.replace(/\D/g, '');
  console.log('\n[2] Limpeza de CPF:');
  console.log('  Entrada:', cpfRaw);
  console.log('  Saída:', cleaned);
  console.log('  Correto?', cleaned === '12345678909' ? '✅ SIM' : '❌ NÃO');

  // 3. Testar chamada real à API
  console.log('\n[3] Testando chamada ao Mercado Pago...');
  try {
    const { MercadoPagoConfig, Payment } = require('mercadopago');
    const token = rawToken.replace('APP_USR-TEST-', 'TEST-').trim();
    const client = new MercadoPagoConfig({ accessToken: token, options: { timeout: 15000 } });
    const payment = new Payment(client);

    const result = await payment.create({
      body: {
        transaction_amount: 10,
        description: 'Teste diagnóstico PIX',
        payment_method_id: 'pix',
        payer: {
          email: process.env.MP_TEST_PAYER_EMAIL || 'test_user@testuser.com', // Usuário de teste oficial do MP
          first_name: 'Test',
          last_name: 'User',
          identification: { type: 'CPF', number: '12345678909' },
        },
      },
      requestOptions: { idempotencyKey: 'test-diag-' + Date.now() }
    });

    console.log('  ✅ SUCESSO!');
    console.log('  Status:', result.status);
    console.log('  QR Code gerado?', !!result.point_of_interaction?.transaction_data?.qr_code);
    if (result.point_of_interaction?.transaction_data?.qr_code) {
      console.log('  QR Code preview:', result.point_of_interaction.transaction_data.qr_code.substring(0, 30) + '...');
    }
  } catch (err: any) {
    console.log('  ❌ FALHA!');
    console.log('  Mensagem:', err.message);
    if (err.cause) console.log('  Causa:', JSON.stringify(err.cause, null, 2));
  }
}

testPix().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
