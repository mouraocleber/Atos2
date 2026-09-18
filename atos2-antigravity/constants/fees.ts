export const ATOS2_FEES = {
  PIX_WITHDRAWAL: 1.99, // R$ (Saque/Envio PIX externo)
  PIX_DEPOSIT: 0, // Depósito de saldo
  USDC_DEPOSIT: 0, // Depósito Global
  INTERNAL_TRANSFER: 0, // Transferência entre usuários da Atos2
  CRYPTO_CONVERSION_SPREAD: 0.02, // 2% de spread para converter BRL <-> USDC
  PHYSICAL_CARD_ISSUE: 39.90, // R$ custo de emissão/frete do cartão físico
  CHECKOUT_PLATFORM_FEE: 0.02, // 2% taxa da Atos2 sobre checkout comercial (Pix, Cartão, Solana)
};

export const SOLANA_CONFIG = {
  // Carteira mestre oficial da Atos2 na rede Solana
  WALLET_ADDRESS: 'Atos2MstR64R1yWzXmN8pT3q7X2K9mU6jQ93aK25f8jY',
  // Endereço oficial do contrato do token USDC na rede Solana (Mainnet SPL Token)
  USDC_MINT: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  NETWORK_LABEL: 'Solana Mainnet',
  ESTIMATED_CONFIRMATION_SECS: 1.5,
};
