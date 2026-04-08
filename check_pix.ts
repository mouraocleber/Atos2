import { mercadoPagoService } from './src/services/mercadoPagoService';

async function verifyResponse() {
  const amount = 10;
  const payerEmail = 'mourao.cleber@gmail.com';
  const referenceId = 'test_' + Date.now();
  const payerName = 'Cleber Mourão';
  const payerCpf = '12345678909';

  const pixData = await mercadoPagoService.createPixPayment(amount, payerEmail, referenceId, payerName, payerCpf);
  
  console.log('Does qr_code exist?', !!pixData.qr_code);
  console.log('QR Code string preview:', pixData.qr_code?.substring(0, 15));
  console.log('Full structure keys:', Object.keys(pixData));
  
  process.exit(0);
}
verifyResponse();
