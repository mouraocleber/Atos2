import * as Linking from 'expo-linking';
import { SOLANA_CONFIG } from '../constants/fees';

export interface SolanaPayParams {
  recipient?: string;
  amountUsdc: number;
  reference?: string;
  label?: string;
  message?: string;
  memo?: string;
}

export interface SolanaPaymentResult {
  success: boolean;
  txHash: string;
  confirmedAt: string;
  amountUsdc: number;
  recipient: string;
}

/**
 * Converte valor de BRL para USDC (baseado na cotação do dólar)
 */
export const convertBrlToUsdc = (amountBrl: number, usdRate: number = 5.60): number => {
  if (!amountBrl || amountBrl <= 0 || !usdRate || usdRate <= 0) return 0;
  // Arredonda para 2 casas decimais no padrão USDC
  return parseFloat((amountBrl / usdRate).toFixed(2));
};

/**
 * Converte valor de BRL para SOL (baseado na cotação SOL em USD e dólar comercial)
 */
export const convertBrlToSol = (amountBrl: number, solPriceUsd: number = 150, usdRate: number = 5.60): number => {
  const usdc = convertBrlToUsdc(amountBrl, usdRate);
  if (!solPriceUsd || solPriceUsd <= 0) return 0;
  return parseFloat((usdc / solPriceUsd).toFixed(4));
};

/**
 * Gera a URL padronizada do protocolo Solana Pay
 * Exemplo: solana:Atos2MstR64R1yWzXmN8pT3q7X2K9mU6jQ93aK25f8jY?amount=20.40&spl-token=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&label=Atos2%20Checkout&message=Mesa%2001
 */
export const generateSolanaPayUri = (params: SolanaPayParams): string => {
  const recipient = params.recipient || SOLANA_CONFIG.WALLET_ADDRESS;
  const searchParams = new URLSearchParams();

  searchParams.append('amount', params.amountUsdc.toFixed(2));
  searchParams.append('spl-token', SOLANA_CONFIG.USDC_MINT);

  if (params.label) {
    searchParams.append('label', params.label);
  } else {
    searchParams.append('label', 'AtoS2 Checkout');
  }

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
    // Tenta abrir mesmo assim, ou retorna false para fallback de cópia
    await Linking.openURL(solanaUri);
    return true;
  } catch (err) {
    console.warn('[Solana] Não foi possível abrir o app da carteira diretamente:', err);
    return false;
  }
};

/**
 * Simulação / Verificação de liquidação na rede Solana
 */
export const checkSolanaTransactionStatus = async (
  referenceId: string,
  amountUsdc: number
): Promise<SolanaPaymentResult> => {
  // Simulação de confirmação em 1.5s na Solana Mainnet
  return new Promise((resolve) => {
    setTimeout(() => {
      const randomHex = Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      
      resolve({
        success: true,
        txHash: `${randomHex.substring(0, 16)}...${randomHex.substring(48)}`,
        confirmedAt: new Date().toISOString(),
        amountUsdc,
        recipient: SOLANA_CONFIG.WALLET_ADDRESS,
      });
    }, 1500);
  });
};
