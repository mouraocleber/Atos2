import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function testProductionPix() {
  console.log('=== TESTE DE PIX DE PRODUÇÃO ===\n');

  const token = (process.env.MP_ACCESS_TOKEN || '').trim();
  if (!token) {
    console.error('❌ Erro: MP_ACCESS_TOKEN não está definido no arquivo .env!');
    process.exit(1);
  }

  console.log('Chave MP_ACCESS_TOKEN carregada.');
  console.log('Prefixo:', token.substring(0, 10) + '...');
  
  const isSandbox = token.startsWith('TEST-');
  console.log('Modo detectado:', isSandbox ? '🧪 SANDBOX (Teste)' : '⚡ PRODUÇÃO (Real)');

  // DADOS DO PAGADOR (Substitua por dados válidos reais se estiver em modo Produção)
  const payerEmail = process.env.MP_TEST_PAYER_EMAIL || 'mourao.cleber@gmail.com';
  // CPF/CNPJ real para produção (sem pontos ou traço)
  const payerCpf = (process.env.MP_TEST_PAYER_CPF || '85805254620').replace(/\D/g, ''); 

  console.log('\nDados do pagador para a requisição:');
  console.log('  E-mail:', payerEmail);
  console.log('  CPF/CNPJ (apenas dígitos):', payerCpf);

  const paymentData = {
    transaction_amount: 1.00, // R$ 1,00 para teste de produção
    description: 'Teste PIX Produção - Atos2 Wallet',
    payment_method_id: 'pix',
    payer: {
      email: payerEmail,
      first_name: 'Cleber',
      last_name: 'Mourao',
      identification: {
        type: payerCpf.length > 11 ? 'CNPJ' : 'CPF',
        number: payerCpf
      }
    },
    external_reference: 'prod_test_' + Date.now()
  };

  try {
    console.log('\nEnviando requisição para o Mercado Pago...');
    const response = await axios.post('https://api.mercadopago.com/v1/payments', paymentData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': 'prod_test_key_' + Date.now()
      }
    });

    console.log('\n✅ SUCESSO AO GERAR PIX!');
    console.log('ID do Pagamento:', response.data.id);
    console.log('Status do Pagamento:', response.data.status);
    
    const qrCode = response.data.point_of_interaction?.transaction_data?.qr_code;
    const ticketUrl = response.data.point_of_interaction?.transaction_data?.ticket_url;

    if (qrCode) {
      console.log('\n--- CÓDIGO PIX COPIA E COLA ---');
      console.log(qrCode);
      console.log('-------------------------------\n');
    }
    
    if (ticketUrl) {
      console.log('Link para visualizar Pix (Ticket):', ticketUrl);
    }

  } catch (error: any) {
    console.error('\n❌ ERRO AO GERAR PIX:');
    if (error.response) {
      console.error('Status HTTP:', error.response.status);
      console.error('Detalhes do Erro:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Mensagem:', error.message);
    }
  }
}

testProductionPix();
