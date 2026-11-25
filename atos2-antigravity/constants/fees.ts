export const ATOS2_FEES = {
  PIX_WITHDRAWAL: 1.99, // R$ (Saque/Envio PIX externo)
  PIX_DEPOSIT: 0, // Depósito de saldo
  USDC_DEPOSIT: 0, // Depósito Global
  INTERNAL_TRANSFER: 0, // Transferência entre usuários da Atos2 (0%)
  CRYPTO_CONVERSION_SPREAD: 0.02, // 2% de spread para converter BRL <-> USDC
  PHYSICAL_CARD_ISSUE: 39.90, // R$ custo de emissão/frete do cartão físico

  // Taxas do Comerciante (AtoS2 Take Rate descontado do estabelecimento):
  MERCHANT_FEE_PIX: 0.0199,   // PIX: 1.99% do comerciante (custo MP 0.99% -> lucro ~1.0%)
  MERCHANT_FEE_SOLANA: 0.02,  // Solana Pay (USDC): 2.0% do comerciante
  MERCHANT_FEE_CARD: 0.025,   // Cartão Internacional (Stripe): 2.5% do comerciante
  MERCHANT_FEE_P2P: 0.0,      // P2P: 0% (taxa zero)

  // Taxas do Turista / Cliente (Payer Surcharge):
  TOURIST_FEE_PIX: 0.0,       // PIX: 0% taxa extra para o turista
  TOURIST_FEE_SOLANA: 0.02,   // Solana Pay (USDC): +2.0% acrescentado do turista
  TOURIST_FEE_CARD: 0.059,    // Cartão Internacional (Stripe): +5.9% taxa de processamento internacional
  TOURIST_FEE_P2P: 0.0,       // P2P: 0% taxa extra

  CHECKOUT_PLATFORM_FEE: 0.02, // Compatibilidade retroativa
};

export const SOLANA_CONFIG = {
  // Carteira mestre oficial da Atos2 na rede Solana
  WALLET_ADDRESS: '26i1C86h7NHd3C6U1Mbpiuroo8NR3sjzmEtFrrX4WiBi',
  // Endereço oficial do contrato do token USDC na rede Solana (Mainnet SPL Token)
  USDC_MINT: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  NETWORK_LABEL: 'Solana Mainnet',
  ESTIMATED_CONFIRMATION_SECS: 1.5,
  RPC_ENDPOINTS: [
    'https://solana-rpc.publicnode.com',
    'https://api.mainnet-beta.solana.com',
  ],
};
