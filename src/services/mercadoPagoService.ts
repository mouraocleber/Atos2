import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

export class MercadoPagoService {
  private getToken(): string {
    let token = (process.env.MP_ACCESS_TOKEN || process.env.ACCESS_TOKEN_MP || '').trim();

    // Corrige token mal-formado: APP_USR-TEST- → TEST-
    if (token.startsWith('APP_USR-TEST-')) {
      token = token.replace('APP_USR-TEST-', 'TEST-');
    }
    // Corrige token mal-formado: APP_USR- sozinho
    if (token.startsWith('APP_USR-') && !token.startsWith('APP_USR-')) {
      token = token.replace('APP_USR-', '');
    }

    if (!token) throw new Error('Chave de API do Mercado Pago (MP_ACCESS_TOKEN) não configurada no .env');
    console.log('[MercadoPago] Token carregado. Prefixo:', token.substring(0, 10) + '...');
    return token;
  }



  /**
   * Cria uma intenção de pagamento PIX e retorna os dados de Copia e Cola
   * @param amount Valor da transação em BRL
   * @param payerEmail Email do pagador (usado como referência)
   * @param referenceId ID interno do nosso banco de dados da transação/recarga pendente
   * @param payerName Nome completo do pagador
   * @param payerCpf CPF ou CNPJ do pagador
   */
  async createPixPayment(amount: number, payerEmail: string, referenceId: string, payerName: string, payerCpf: string) {
    const token = (process.env.MP_ACCESS_TOKEN || process.env.ACCESS_TOKEN_MP || '').trim();
    if (!token) {
      throw new Error('Chave de API do Mercado Pago (MP_ACCESS_TOKEN) não configurada no .env');
    }

    try {
      const names = payerName.trim().split(' ');
      const firstName = names[0];
      const lastName = names.length > 1 ? names.slice(1).join(' ') : 'Usuario';
      
      const documentNumber = payerCpf.replace(/\D/g, ''); // Apenas números (regex corrigida)
      
      // Em modo de teste, priorizamos o e-mail e CPF do pagador se fornecidos, caso contrário
      // recorremos aos valores de teste configurados ou padrões.
      const isTestMode = this.getToken().startsWith('TEST-');
      const finalEmail = payerEmail || (isTestMode ? (process.env.MP_TEST_PAYER_EMAIL || 'test_user_atos2@testuser.com') : '');
      const finalCpf = documentNumber || (isTestMode ? (process.env.MP_TEST_PAYER_CPF || '12345678909') : '');

      if (isTestMode) {
        console.log('[MercadoPago] 🧪 MODO SANDBOX — usando credenciais de teste para o pagador.');
      }

      const body = {
        transaction_amount: amount,
        description: 'Recarga de Saldo Atos2 Wallet',
        payment_method_id: 'pix',
        payer: {
          email: finalEmail,
          first_name: firstName,
          last_name: lastName,
          identification: {
            type: finalCpf.length > 11 ? 'CNPJ' : 'CPF',
            number: finalCpf
          }
        },
        external_reference: referenceId, // ID que cruza o Mercado Pago com o Atos2
      };

      console.log('[MercadoPago] Payload body:', JSON.stringify(body, null, 2));

      const response = await axios.post('https://api.mercadopago.com/v1/payments', body, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': referenceId
        },
        timeout: 15000
      });

      const result = response.data;

      return {
        id: result.id,  // ID gerado dentro do próprio Mercado Pago
        status: result.status,
        qr_code: result.point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64,
        ticket_url: result.point_of_interaction?.transaction_data?.ticket_url,
      };

    } catch (error: any) {
      console.error('[MercadoPago] Erro detalhado ao gerar PIX:', {
        message: error.message,
        cause: error.cause,
        status: error.status,
        apiResponse: error.response?.data
      });
      
      let friendlyError = 'Falha ao processar provedor de pagamentos. Verifique o Access Token ou os Serviços PIX.';
      const mpMessage = typeof error.message === 'string' ? error.message.toLowerCase() : '';
      
      if (mpMessage.includes('valid email')) {
        friendlyError = 'O email cadastrado nesta conta é inválido para transações financeiras.';
      } else if (mpMessage.includes('identification number')) {
        friendlyError = 'O CPF/CNPJ cadastrado é inválido ou fictício. O Mercado Pago exige documentos reais ou CPFs de teste válidos.';
      } else if (mpMessage.includes('internal_error')) {
        friendlyError = 'O Mercado Pago Sandbox está com instabilidade momentânea ou o Token é incompatível com esta operação. Tente novamente em instantes.';
      }

      throw new Error(friendlyError);
    }
  }

  /**
   * Consulta o status de um pagamento usando o ID gerado pelo Mercado Pago
   */
  async getPaymentStatus(paymentId: number | string) {
    const token = (process.env.MP_ACCESS_TOKEN || process.env.ACCESS_TOKEN_MP || '').trim();
    if (!token) return { status: 'unknown' };

    try {
      const response = await axios.get(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 15000
      });
      const result = response.data;
      return {
        status: result.status,
        external_reference: result.external_reference
      };
    } catch (error) {
      console.error('[MercadoPago] Erro ao buscar pagamento:', error);
      throw error;
    }
  }

  /**
   * Envia uma transferência PIX externa (Payout)
   */
  async sendExternalPix(amount: number, targetKey: string, referenceId: string) {
    const token = this.getToken();

    const body = {
      external_reference: referenceId,
      description: `Pagamento PIX externo para: ${targetKey}`,
      transactions: [
        {
          external_id: referenceId,
          amount: amount,
          currency_id: 'BRL',
          recipient_id: targetKey
        }
      ]
    };

    console.log('[MercadoPago Payout] Enviando Payout via API:', JSON.stringify(body, null, 2));

    try {
      const response = await axios.post('https://api.mercadopago.com/v1/payouts', body, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': referenceId,
          'X-Enforce-Signature': 'false'
        }
      });

      console.log('[MercadoPago Payout] Resposta da API:', response.status, response.data);
      return response.data;
    } catch (error: any) {
      console.error('[MercadoPago Payout] Erro retornado pela API:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });

      let errorMessage = 'Erro ao processar transferência externa com o Mercado Pago.';
      if (error.response?.data?.message) {
        errorMessage += ` Detalhes: ${error.response.data.message}`;
      } else if (error.message) {
        errorMessage += ` Detalhes: ${error.message}`;
      }
      throw new Error(errorMessage);
    }
  }
}

export const mercadoPagoService = new MercadoPagoService();

