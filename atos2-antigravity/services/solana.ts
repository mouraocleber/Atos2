import * as Linking from 'expo-linking';
import { SOLANA_CONFIG } from '../constants/fees';

export interface SolanaPayParams {
  recipient?: string;
  amountUsdc?: number;
  amountSol?: number;
  currency?: 'USDC' | 'SOL';
  reference?: string;
  label?: string;
  message?: string;
  memo?: string;
}

export interface SolanaPaymentResult {
  success: boolean;
  pending?: boolean;
  txHash: string;
  confirmedAt: string;
  amount: number;
  currency: 'USDC' | 'SOL';
  recipient: string;
  errorMessage?: string;
}

export interface LiveMarketRates {
  usdBrl: number;
  eurBrl: number;
  gbpBrl: number;
  solUsd: number;
  updatedAt: number;
}

const DEFAULT_RATES: LiveMarketRates = {
  usdBrl: 5.75,
  eurBrl: 6.15,
  gbpBrl: 7.25,
  solUsd: 165.0,
  updatedAt: 0,
};

let cachedRates: LiveMarketRates = { ...DEFAULT_RATES };

/**
 * Busca cotações em tempo real (USD/BRL, EUR/BRL, GBP/BRL e SOL/USD) com cache de 5 minutos e fallback seguro.
 */
export const fetchLiveMarketRates = async (): Promise<LiveMarketRates> => {
  const now = Date.now();
  if (cachedRates.updatedAt > 0 && now - cachedRates.updatedAt < 5 * 60 * 1000) {
    return cachedRates;
  }

  const nextRates = { ...cachedRates };

  try {
    const fxResp = await fetch('https://open.er-api.com/v6/latest/BRL');
    if (fxResp.ok) {
      const fxData = await fxResp.json();
      if (fxData?.rates) {
        if (fxData.rates.USD > 0) nextRates.usdBrl = parseFloat((1 / fxData.rates.USD).toFixed(4));
        if (fxData.rates.EUR > 0) nextRates.eurBrl = parseFloat((1 / fxData.rates.EUR).toFixed(4));
        if (fxData.rates.GBP > 0) nextRates.gbpBrl = parseFloat((1 / fxData.rates.GBP).toFixed(4));
      }
    }
  } catch (e) {
    console.warn('[Solana/FX] Fallback de câmbio fiat:', e);
  }

  try {
    const solResp = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT');
    if (solResp.ok) {
      const solData = await solResp.json();
      const parsed = parseFloat(solData?.price);
      if (parsed > 0) nextRates.solUsd = parsed;
    }
  } catch (e) {
    console.warn('[Solana/FX] Fallback de cotação SOL/USD:', e);
  }

  nextRates.updatedAt = now;
  cachedRates = nextRates;
  return cachedRates;
};

// Alfabeto Base58 padrão da Solana (para chaves de referência válidas de 32 bytes)
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function encodeBase58(bytes: Uint8Array): string {
  const digits = [0];
  for (let i = 0; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let str = '';
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
    str += BASE58_ALPHABET[0];
  }
  for (let i = digits.length - 1; i >= 0; i--) {
    str += BASE58_ALPHABET[digits[i]];
  }
  return str;
}

/**
 * Gera uma chave pública Base58 aleatória de 32 bytes compatível com o parâmetro `reference` do protocolo Solana Pay.
 * Carteiras como Phantom e Solflare anexam essa chave na transação on-chain, permitindo localizar e confirmar o pagamento real na Mainnet.
 */
export const generateSolanaReferenceKey = (): string => {
  const bytes = new Uint8Array(32);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 32; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  // Garante byte inicial não-zero para comprimento consistente de 43-44 chars Base58
  if (bytes[0] === 0) bytes[0] = 1;
  return encodeBase58(bytes);
};

/**
 * Converte valor de BRL para USDC (baseado na cotação do dólar)
 */
export const convertBrlToUsdc = (amountBrl: number, usdRate: number = cachedRates.usdBrl): number => {
  if (!amountBrl || amountBrl <= 0 || !usdRate || usdRate <= 0) return 0;
  return parseFloat((amountBrl / usdRate).toFixed(2));
};

/**
 * Converte valor de BRL para SOL (baseado na cotação SOL em USD e dólar comercial)
 */
export const convertBrlToSol = (
  amountBrl: number,
  solPriceUsd: number = cachedRates.solUsd,
  usdRate: number = cachedRates.usdBrl
): number => {
  const usdc = convertBrlToUsdc(amountBrl, usdRate);
  if (!solPriceUsd || solPriceUsd <= 0) return 0;
  return parseFloat((usdc / solPriceUsd).toFixed(4));
};

/**
 * Gera a URL padronizada do protocolo Solana Pay
 * - Padrão: USDC (inclui spl-token oficial da Mainnet)
 * - Se currency === 'SOL': transferência nativa de SOL
 */
export const generateSolanaPayUri = (params: SolanaPayParams): string => {
  const recipient = params.recipient || SOLANA_CONFIG.WALLET_ADDRESS;
  const searchParams = new URLSearchParams();
  const currency = params.currency || 'USDC';

  if (currency === 'SOL') {
    const amount = params.amountSol !== undefined ? params.amountSol : (params.amountUsdc ? params.amountUsdc / cachedRates.solUsd : 0.01);
    searchParams.append('amount', amount.toFixed(4));
  } else {
    const amount = params.amountUsdc !== undefined ? params.amountUsdc : 1.0;
    searchParams.append('amount', amount.toFixed(2));
    searchParams.append('spl-token', SOLANA_CONFIG.USDC_MINT);
  }

  searchParams.append('label', params.label || 'AtoS2 Checkout');

  if (params.message) {
    searchParams.append('message', params.message);
  }

  if (params.reference) {
    searchParams.append('reference', params.reference);
  }

  if (params.memo) {
    searchParams.append('memo', params.memo);
  }

  return `solana:${recipient}?${searchParams.toString()}`;
};

/**
 * Tenta abrir o deep link diretamente em carteiras Solana instaladas no dispositivo (Phantom, Solflare, etc.)
 */
export const openSolanaWalletApp = async (solanaUri: string): Promise<boolean> => {
  try {
    const supported = await Linking.canOpenURL(solanaUri);
    if (supported) {
      await Linking.openURL(solanaUri);
      return true;
    }
    await Linking.openURL(solanaUri);
    return true;
  } catch (err) {
    console.warn('[Solana] Não foi possível abrir o app da carteira diretamente:', err);
    return false;
  }
};

/**
 * Verificação REAL na Blockchain Solana Mainnet via JSON-RPC (`getSignaturesForAddress`).
 * Procura uma transação confirmada/finalizada sem erros vinculada à chave `reference` única desta cobrança.
 */
export const checkSolanaTransactionStatus = async (
  referenceKey: string,
  amount: number,
  currency: 'USDC' | 'SOL' = 'USDC'
): Promise<SolanaPaymentResult> => {
  const endpoints = SOLANA_CONFIG.RPC_ENDPOINTS || [
    'https://solana-rpc.publicnode.com',
    'https://api.mainnet-beta.solana.com',
  ];

  let lastRpcError = '';

  for (const rpcUrl of endpoints) {
    try {
      const resp = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getSignaturesForAddress',
          params: [
            referenceKey,
            {
              limit: 5,
              commitment: 'confirmed',
            },
          ],
        }),
      });

      if (!resp.ok) {
        lastRpcError = `RPC HTTP ${resp.status}`;
        continue;
      }

      const json = await resp.json();
      if (json?.error) {
        lastRpcError = json.error.message || 'Erro RPC Solana';
        continue;
      }

      const signatures: any[] = Array.isArray(json?.result) ? json.result : [];
      const confirmedTx = signatures.find(
        (sig) => sig && !sig.err && (sig.confirmationStatus === 'confirmed' || sig.confirmationStatus === 'finalized')
      );

      if (confirmedTx && confirmedTx.signature) {
        return {
          success: true,
          pending: false,
          txHash: confirmedTx.signature,
          confirmedAt: confirmedTx.blockTime
            ? new Date(confirmedTx.blockTime * 1000).toISOString()
            : new Date().toISOString(),
          amount,
          currency,
          recipient: SOLANA_CONFIG.WALLET_ADDRESS,
        };
      }

      // RPC respondeu com sucesso, mas transação ainda não apareceu na blockchain
      return {
        success: false,
        pending: true,
        txHash: '',
        confirmedAt: '',
        amount,
        currency,
        recipient: SOLANA_CONFIG.WALLET_ADDRESS,
        errorMessage: 'Pagamento ainda não detectado na Solana Mainnet. Aguarde alguns segundos após aprovar na sua carteira e toque em verificar novamente.',
      };
    } catch (err: any) {
      lastRpcError = err?.message || 'Falha de rede ao consultar Solana RPC';
      console.warn(`[Solana RPC] Erro em ${rpcUrl}:`, lastRpcError);
    }
  }

  return {
    success: false,
    pending: true,
    txHash: '',
    confirmedAt: '',
    amount,
    currency,
    recipient: SOLANA_CONFIG.WALLET_ADDRESS,
    errorMessage: `Não foi possível consultar a rede Solana no momento (${lastRpcError || 'timeout'}). Tente novamente.`,
  };
};
