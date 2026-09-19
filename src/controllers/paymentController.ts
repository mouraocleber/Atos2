import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { mercadoPagoService } from '../services/mercadoPagoService';
import { binanceService } from '../services/binanceService';
import { stripeService } from '../services/stripeService';
import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export class PaymentController {
  /**
   * Endpoint Privado: Gera uma cobrança/depósito PIX
   */
  async generatePixDeposit(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { amount, currency } = req.body;
      console.log(`[PaymentController] Initing PIX request for User: ${userId}, Amount: ${amount}, Currency: ${currency}`);

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Insira um valor maior que 0 para depósito.' });
      }

      // Isolar Mercado Pago exclusivamente ao uso local (BRL)
      if (currency && currency.toUpperCase() !== 'BRL') {
        return res.status(400).json({ error: 'Mercado Pago é restrito apenas a depósitos em BRL (Pix).' });
      }

      // Buscar email e identificação do user para o construtor do MP
      const userRes = await query('SELECT email, name, cpf, plan FROM users WHERE id = $1', [userId]);
      if (userRes.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
      const { email: payerEmail, name: payerName, cpf: payerCpf, plan } = userRes.rows[0];

      if (plan !== 'PRO' && plan !== 'BUSINESS') {
        return res.status(403).json({ error: 'A geração de cobranças/depósitos PIX é restrita aos planos PRO ou Business.' });
      }

      // Criar a transação PRELIMINAR (Aguardando Pagamento) na Carteira do Atos2
      const depositId = uuidv4();

      await query(
        `INSERT INTO transactions (
          id, to_user_id, type, amount, currency, status, description, reference
        ) VALUES ($1, $2, 'DEPOSIT', $3, 'BRL', 'PENDING', 'Recarga de Saldo Pix - Mercado Pago', $4)`,
        [depositId, userId, amount, depositId]
      );

      // Gera efetivamente a cobrança
      const pixData = await mercadoPagoService.createPixPayment(amount, payerEmail, depositId, payerName, payerCpf);

      console.log(`[PaymentController] PIX Generated successfully! ID: ${pixData.id}`);
      return res.status(200).json({
        success: true,
        data: {
          transactionId: depositId,
          pix: pixData
        }
      });
    } catch (error: any) {
      console.error('[PaymentController] Falha no depósito:', error);
      return res.status(500).json({ error: error.message || 'Erro interno ao gerar pagamento PIX.' });
    }
  }

  /**
   * Endpoint Público: Webhook para receber confirmações do Mercado Pago
   */
  async mercadoPagoWebhook(req: any, res: Response) {
    try {
      if (req.query.topic === 'payment' || req.query.type === 'payment' || req.body?.type === 'payment') {
        const paymentId = req.query.id || req.body?.data?.id;

        if (paymentId) {
          const securePaymentData = await mercadoPagoService.getPaymentStatus(paymentId);
          
          if (securePaymentData.status === 'approved' && securePaymentData.external_reference) {
            const depositId = securePaymentData.external_reference;

            const dbCheck = await query('SELECT * FROM transactions WHERE id = $1 AND status = $2', [depositId, 'PENDING']);
            
            if (dbCheck.rows.length > 0) {
              const deposit = dbCheck.rows[0];
              const userId = deposit.to_user_id;
              const amount = parseFloat(deposit.amount);

              const client = await (require('../config/database').getClient)();
              try {
                await client.query('BEGIN');
                
                await client.query("UPDATE transactions SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [depositId]);
                await client.query("UPDATE wallets SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND currency = 'BRL'", [amount, userId]);
                
                await client.query('COMMIT');
                console.log(`[Webhook Atos2] Saldo de R$ ${amount} creditado com SUCESSO na carteira do user: ${userId}`);
              } catch (e) {
                await client.query('ROLLBACK');
                throw e;
              } finally {
                client.release();
              }
            }
          }
        }
      }

      res.status(200).send('Webhook Processado');
    } catch (error) {
      console.error('[PaymentController Webhook Error]:', error);
      res.status(500).send('Erro no Webhook');
    }
  }

  /**
   * Endpoint Público/Privado: Cria uma sessão de Checkout Stripe para Cartão, Apple Pay e Google Pay
   */
  async createStripeCheckoutSession(req: any, res: Response) {
    try {
      const { amount, currency, table, merchantName, merchantId, customerEmail, successUrl, cancelUrl } = req.body;
      const parsedAmount = parseFloat(String(amount || '0'));

      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ success: false, error: 'Valor em BRL/USD deve ser maior que zero.' });
      }

      const session = await stripeService.createCheckoutSession({
        amount: parsedAmount,
        currency: currency || 'brl',
        table: table || '01',
        merchantName: merchantName || 'Estabelecimento Parceiro',
        merchantId,
        customerEmail,
        successUrl,
        cancelUrl,
      });

      return res.status(200).json({
        success: true,
        data: session,
      });
    } catch (error: any) {
      console.error('[PaymentController] Erro ao criar Stripe Checkout Session:', error?.message);
      return res.status(500).json({ success: false, error: error?.message || 'Falha ao gerar checkout com cartão.' });
    }
  }

  /**
   * Endpoint Público: Webhook oficial da Stripe para confirmação e liquidação automática
   */
  async stripeWebhook(req: any, res: Response) {
    try {
      const signature = (req.headers['stripe-signature'] as string) || '';
      const rawBody = req.rawBody || req.body;

      const result = await stripeService.processWebhookEvent(rawBody, signature);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error('[PaymentController Stripe Webhook Error]:', error?.message);
      return res.status(400).send(`Webhook Error: ${error?.message}`);
    }
  }

  /**
   * Endpoint Privado: Realiza um pagamento PIX externo (débito de saldo BRL)
   */
  async payPixExternal(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { pixKey, amount } = req.body;

      if (!pixKey || !pixKey.trim()) {
        return res.status(400).json({ error: 'Chave PIX inválida ou ausente.' });
      }

      const parsedAmount = parseFloat(String(amount));
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: 'Informe um valor válido maior que R$ 0,00.' });
      }

      const walletRes = await query(
        'SELECT id, balance FROM wallets WHERE user_id = $1 AND currency = $2',
        [userId, 'BRL']
      );

      if (walletRes.rows.length === 0) {
        return res.status(404).json({ error: 'Carteira BRL não encontrada para o usuário.' });
      }

      const wallet = walletRes.rows[0];
      const balance = parseFloat(wallet.balance);

      if (balance < parsedAmount) {
        return res.status(400).json({ error: 'Saldo insuficiente para realizar o pagamento.' });
      }

      const client = await (require('../config/database').getClient)();
      try {
        await client.query('BEGIN');

        await client.query(
          'UPDATE wallets SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [parsedAmount, wallet.id]
        );

        const transactionId = uuidv4();
        const description = `Pagamento PIX externo para: ${pixKey}`;
        await client.query(
          `INSERT INTO transactions (
            id, from_user_id, to_user_id, type, amount, currency, status, description, reference
          ) VALUES ($1, $2, NULL, 'PAYMENT', $3, 'BRL', 'COMPLETED', $4, $5)`,
          [transactionId, userId, -parsedAmount, description, pixKey]
        );

        console.log(`[PaymentController] Realizando transferência real via Mercado Pago PIX Payout para chave: ${pixKey}`);
        await mercadoPagoService.sendExternalPix(parsedAmount, pixKey, transactionId);

        await client.query('COMMIT');

        console.log(`[PaymentController] PIX pago de R$ ${parsedAmount} debitado com sucesso do user: ${userId}`);

        return res.status(200).json({
          success: true,
          message: 'PIX enviado com sucesso.',
          transactionId
        });
      } catch (e: any) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('[PaymentController] Falha no pagamento PIX externo:', error);
      return res.status(500).json({ error: error.message || 'Erro interno ao processar pagamento PIX.' });
    }
  }

  /**
   * Endpoint Público/Privado: Cotação em tempo real BRL -> Cripto via Binance
   */
  async getBinanceQuote(req: any, res: Response) {
    try {
      const asset = String(req.query.asset || 'USDC');
      const amountBrl = parseFloat(String(req.query.amountBrl || '100'));

      if (isNaN(amountBrl) || amountBrl <= 0) {
        return res.status(400).json({ success: false, error: 'Valor inválido em BRL' });
      }

      const quote = await binanceService.getQuote(asset, amountBrl);
      return res.status(200).json({
        success: true,
        data: quote
      });
    } catch (error: any) {
      console.error('[PaymentController] Erro em getBinanceQuote:', error?.message);
      return res.status(500).json({ success: false, error: error?.message || 'Falha ao consultar cotação na Binance' });
    }
  }

  /**
   * Endpoint Privado: Gera ordem de depósito via Binance
   */
  async createBinanceDeposit(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const amount = parseFloat(String(req.body.amount || '0'));
      const asset = String(req.body.cryptoAsset || req.body.asset || 'USDC');

      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ success: false, error: 'Valor em BRL deve ser maior que zero' });
      }

      const order = await binanceService.createBuyOrder(userId, amount, asset);
      return res.status(200).json({
        success: true,
        data: order
      });
    } catch (error: any) {
      console.error('[PaymentController] Erro em createBinanceDeposit:', error?.message);
      return res.status(500).json({ success: false, error: error?.message || 'Falha ao gerar depósito na Binance' });
    }
  }

  /**
   * Endpoint Privado: Verifica status da ordem na Binance
   */
  async checkBinanceOrderStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const orderId = String(req.params.orderId);

      if (!orderId) {
        return res.status(400).json({ success: false, error: 'ID do pedido obrigatório' });
      }

      const result = await binanceService.checkOrderStatus(orderId, userId);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('[PaymentController] Erro em checkBinanceOrderStatus:', error?.message);
      return res.status(500).json({ success: false, error: error?.message || 'Falha ao checar status da ordem' });
    }
  }

}

export const paymentController = new PaymentController();
