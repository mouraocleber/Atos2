import { mercadoPagoService } from './src/services/mercadoPagoService';

async function testPix() {
  try {
    const amount = 10;
    const payerEmail = 'test@example.com';
    const referenceId = 'test_' + Date.now();
    const payerName = 'John Doe Silva';
    const payerCpf = '12345678909';

    console.log('Token Loaded string:', !!process.env.MP_ACCESS_TOKEN);
    console.log('Testing PIX generation...');
    const pixData = await mercadoPagoService.createPixPayment(amount, payerEmail, referenceId, payerName, payerCpf);
    
    console.log('Success!', pixData);
    process.exit(0);
  } catch(e: any) {
    console.error('Error generating PIX:');
    console.error(e.message || e);
    // If it's a mercadopago error, it might have response info
    if (e.cause) console.error('Cause:', e.cause);
    if (e.response) console.error('Response data:', e.response?.data || e.response);
    
    process.exit(1);
  }
}
testPix();
