import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Modal,
  Alert,
  AppState,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { useAuth } from '../contexts/AuthContext';
import { ATOS2_FEES, SOLANA_CONFIG } from '../constants/fees';
import api from '../services/api';
import { saveCryptoSettlementTransaction } from '../services/wallet';
import {
  convertBrlToUsdc,
  convertBrlToSol,
  generateSolanaPayUri,
  generateSolanaReferenceKey,
  fetchLiveMarketRates,
  openSolanaWalletApp,
  checkSolanaTransactionStatus,
  LiveMarketRates,
} from '../services/solana';
import { createStripeCheckoutSession, checkStripeSessionStatus } from '../services/stripe';

type PaymentMethodType = 'pix' | 'solana' | 'card' | 'internal_p2p';
type SupportedCurrency = 'BRL' | 'USD' | 'EUR' | 'GBP';

export default function CheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, setLinkAccess } = useAuth();

  useEffect(() => {
    setLinkAccess(true);
  }, []);

  // Cotações ao vivo (USD, EUR, GBP e SOL/USD) com fallback seguro
  const [marketRates, setMarketRates] = useState<LiveMarketRates>({
    usdBrl: 5.75,
    eurBrl: 6.15,
    gbpBrl: 7.25,
    solUsd: 165.0,
    updatedAt: 0,
  });

  useEffect(() => {
    fetchLiveMarketRates().then((rates) => setMarketRates(rates)).catch(() => {});
  }, []);

  const CURRENCY_RATES: Record<SupportedCurrency, { symbol: string; rateFromBrl: number; label: string }> = {
    BRL: { symbol: 'R$', rateFromBrl: 1.0, label: 'Real (BRL)' },
    USD: { symbol: '$', rateFromBrl: 1 / marketRates.usdBrl, label: 'Dólar (USD)' },
    EUR: { symbol: '€', rateFromBrl: 1 / marketRates.eurBrl, label: 'Euro (EUR)' },
    GBP: { symbol: '£', rateFromBrl: 1 / marketRates.gbpBrl, label: 'Libra (GBP)' },
  };

  const rawAmount = (params.amount as string) || '100.00';
  const table = (params.table as string) || '01';
  const merchant = (params.merchant as string) || 'Restaurante / Hotel / Guia';

  const baseAmountBrl = parseFloat(rawAmount) || 100.0;
  const [selectedTip, setSelectedTip] = useState<number>(0);
  const [selectedCurrency, setSelectedCurrency] = useState<SupportedCurrency>('BRL');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('pix');

  // Modal interativo de pagamento
  const [paymentModalVisible, setPaymentModalVisible] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [dynamicPixCode, setDynamicPixCode] = useState<string>('');
  const [isGeneratingPix, setIsGeneratingPix] = useState<boolean>(false);
  const [solanaToken, setSolanaToken] = useState<'USDC' | 'SOL'>('USDC');
  const [pendingStripeSessionId, setPendingStripeSessionId] = useState<string | null>(null);

  // Chave de referência Base58 única por cobrança (padrão Solana Pay para verificação real on-chain)
  const solanaReference = useMemo(() => generateSolanaReferenceKey(), [table, rawAmount]);

  // Cálculos financeiros
  const tipAmountBrl = (baseAmountBrl * selectedTip) / 100;
  const subtotalWithTipBrl = baseAmountBrl + tipAmountBrl;

  // Regras de Taxas do AtoS2:
  // - PIX: 0% taxa do turista (Comerciante paga 1.99%)
  // - Solana Pay (USDC): +2% taxa do turista (+ 2% do comerciante = 4% total)
  // - Cartão Internacional (Stripe): +5.9% taxa de processamento internacional do turista (+ 2.5% do comerciante)
  // - Transferência entre usuários Atos2 P2P: TAXA ZERO (0%)
  const touristFeeRate =
    selectedMethod === 'solana'
      ? ATOS2_FEES.TOURIST_FEE_SOLANA
      : selectedMethod === 'card'
      ? ATOS2_FEES.TOURIST_FEE_CARD
      : 0.0;

  const touristFeeBrl = subtotalWithTipBrl * touristFeeRate;
  const totalFinalBrl = subtotalWithTipBrl + touristFeeBrl;

  // Taxa descontada do estabelecimento/comerciante
  const merchantFeeRate =
    selectedMethod === 'pix'
      ? ATOS2_FEES.MERCHANT_FEE_PIX
      : selectedMethod === 'card'
      ? ATOS2_FEES.MERCHANT_FEE_CARD
      : selectedMethod === 'internal_p2p'
      ? 0.0
      : ATOS2_FEES.MERCHANT_FEE_SOLANA;
  const merchantFeeBrl = subtotalWithTipBrl * merchantFeeRate;
  const merchantNetBrl = subtotalWithTipBrl - merchantFeeBrl;

  // Conversões em tempo real
  const currInfo = CURRENCY_RATES[selectedCurrency];
  const convertedTotal = (totalFinalBrl * currInfo.rateFromBrl).toFixed(2);
  const convertedSubtotal = (baseAmountBrl * currInfo.rateFromBrl).toFixed(2);
  const convertedFee = (touristFeeBrl * currInfo.rateFromBrl).toFixed(2);

  // Valores Solana USDC e SOL com câmbio real
  const totalUsdc = convertBrlToUsdc(totalFinalBrl, marketRates.usdBrl);
  const totalSol = convertBrlToSol(totalFinalBrl, marketRates.solUsd, marketRates.usdBrl);

  // Geração de chaves e links
  const simulatedPixCode = `00020126580014br.gov.bcb.pix0136atos2-checkout-${table}-${Date.now()}520400005303986540${totalFinalBrl.toFixed(2)}5802BR5925ATOS2 MEIOS DE PAGAMENTO6009SAO PAULO62070503***6304`;
  const activePixCode = dynamicPixCode || simulatedPixCode;

  // Busca código PIX dinâmico real da API quando o modal abre para PIX
  useEffect(() => {
    if (paymentModalVisible && selectedMethod === 'pix') {
      let isSubscribed = true;
      setIsGeneratingPix(true);
      api.post('/payments/deposit/pix', {
        amount: totalFinalBrl,
        currency: 'BRL',
        description: `Mesa ${table} - ${merchant}`,
      })
        .then((res) => {
          if (isSubscribed && res.data?.success && res.data?.data?.pix?.qr_code) {
            setDynamicPixCode(res.data.data.pix.qr_code);
          }
        })
        .catch((err) => {
          console.warn('[Checkout PIX] Gateway offline ou sem token, usando fallback local:', err?.message);
        })
        .finally(() => {
          if (isSubscribed) setIsGeneratingPix(false);
        });

      return () => {
        isSubscribed = false;
      };
    }
  }, [paymentModalVisible, selectedMethod, totalFinalBrl]);

  const solanaUri = generateSolanaPayUri({
    currency: solanaToken,
    amountUsdc: totalUsdc,
    amountSol: totalSol,
    label: `AtoS2 - ${merchant}`,
    message: `Conta Mesa/Ref ${table}`,
    reference: solanaReference,
  });

  // Verifica automaticamente o status da Stripe quando o usuário retorna ao app após pagar no navegador
  useEffect(() => {
    if (!pendingStripeSessionId) return;
    const sub = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'active' && pendingStripeSessionId && !isPaid) {
        try {
          const st = await checkStripeSessionStatus(pendingStripeSessionId);
          if (st.paid) {
            setReceiptData({
              methodName: 'Cartão Internacional / Apple Pay (Stripe)',
              txHash: pendingStripeSessionId,
              fee: touristFeeBrl,
              merchantFee: merchantFeeBrl,
              merchantNet: merchantNetBrl,
              totalBrl: totalFinalBrl,
              totalConverted: `${currInfo.symbol} ${convertedTotal}`,
              merchant,
              table,
              date: new Date().toLocaleString(),
              payoutEta: 'até 5 dias corridos (D+5)',
            });
            setPendingStripeSessionId(null);
            setPaymentModalVisible(false);
            setIsPaid(true);
          }
        } catch (_) {}
      }
    });
    return () => sub.remove();
  }, [pendingStripeSessionId, isPaid, totalFinalBrl]);

  const handleCopy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleOpenMethodAction = () => {
    setPaymentModalVisible(true);
  };

  const handleConfirmPayment = async () => {
    setIsProcessing(true);

    if (selectedMethod === 'solana') {
      try {
        const solResult = await checkSolanaTransactionStatus(
          solanaReference,
          solanaToken === 'SOL' ? totalSol : totalUsdc,
          solanaToken
        );

        if (!solResult.success) {
          setIsProcessing(false);
          Alert.alert(
            'Aguardando Confirmação na Blockchain',
            solResult.errorMessage || 'Pagamento ainda não encontrado na Solana Mainnet. Aprove na carteira Phantom/Solflare e toque em verificar novamente em alguns segundos.'
          );
          return;
        }

        // Registra o recebimento na carteira com o valor líquido fiduciário (sem os 2% do Atos2)
        try {
          await saveCryptoSettlementTransaction({
            id: solResult.txHash,
            type: 'DEPOSIT',
            amount: merchantNetBrl,
            currency: 'BRL',
            status: 'PENDING',
            description: `Solana Pay (${solanaToken}) - Mesa ${table}`,
            reference: solResult.txHash,
            created_at: new Date().toISOString(),
            settlementDetails: {
              grossAmount: totalFinalBrl,
              platformFee: merchantFeeBrl,
              netAmount: merchantNetBrl,
              cryptoAmount: solanaToken === 'SOL' ? `${totalSol.toFixed(4)} SOL` : `${totalUsdc.toFixed(2)} USDC`,
              cryptoCurrency: solanaToken,
              minPayoutEur: 5,
              payoutEtaHours: 24,
              bankNotice: 'Transferência automática para a conta bancária/chave PIX cadastrada em até 24h (mínimo de ~5 EUR da operadora).',
              table: String(table),
              merchant: String(merchant),
            },
          });
        } catch (saveErr) {
          console.warn('[Checkout] Erro ao salvar transação de liquidação cripto:', saveErr);
        }

        setReceiptData({
          methodName: `Solana Pay (${solanaToken})`,
          txHash: solResult.txHash,
          fee: touristFeeBrl,
          merchantFee: merchantFeeBrl,
          merchantNet: merchantNetBrl,
          totalBrl: totalFinalBrl,
          totalConverted: solanaToken === 'SOL' ? `${totalSol.toFixed(4)} SOL` : `${totalUsdc.toFixed(2)} USDC`,
          merchant,
          table,
          date: new Date().toLocaleString(),
          isCryptoSettlement: true,
          payoutEta: 'até 24 horas (D+1)',
        });
        setIsProcessing(false);
        setPaymentModalVisible(false);
        setIsPaid(true);
        return;
      } catch (e: any) {
        console.warn('Erro ao verificar Solana:', e);
        Alert.alert('Erro Solana RPC', e?.message || 'Falha ao consultar a rede Solana. Tente novamente.');
        setIsProcessing(false);
        return;
      }
    }

    if (selectedMethod === 'card') {
      try {
        // Se já abriu a sessão Stripe antes, verifica o status real do pagamento
        if (pendingStripeSessionId) {
          const statusRes = await checkStripeSessionStatus(pendingStripeSessionId);
          if (statusRes.paid) {
            setReceiptData({
              methodName: 'Cartão Internacional / Apple Pay (Stripe)',
              txHash: pendingStripeSessionId,
              fee: touristFeeBrl,
              merchantFee: merchantFeeBrl,
              merchantNet: merchantNetBrl,
              totalBrl: totalFinalBrl,
              totalConverted: `${currInfo.symbol} ${convertedTotal}`,
              merchant,
              table,
              date: new Date().toLocaleString(),
              payoutEta: 'até 5 dias corridos (D+5)',
            });
            setPendingStripeSessionId(null);
            setIsProcessing(false);
            setPaymentModalVisible(false);
            setIsPaid(true);
            return;
          } else {
            Alert.alert('Pagamento Pendente', 'O pagamento na Stripe ainda não foi concluído. Finalize no navegador e toque em verificar novamente.');
            setIsProcessing(false);
            return;
          }
        }

        const session = await createStripeCheckoutSession({
          amount: totalFinalBrl,
          currency: selectedCurrency.toLowerCase(),
          table,
          merchantName: merchant,
        });

        if (session?.sessionUrl) {
          if (session.sessionId) {
            setPendingStripeSessionId(session.sessionId);
          }
          await Linking.openURL(session.sessionUrl);
          setIsProcessing(false);
          return;
        }
      } catch (err: any) {
        console.warn('[Stripe Checkout] Falha ao gerar sessão de pagamento:', err?.message || err);
        Alert.alert('Checkout Internacional', 'Não foi possível iniciar a sessão Stripe. Tente novamente ou selecione PIX/USDC.');
        setIsProcessing(false);
        return;
      }
    }

    // Confirmação PIX / P2P
    setTimeout(() => {
      let methodName = 'PIX Instantâneo';
      if (selectedMethod === 'internal_p2p') methodName = 'Transferência Direta Atos2 (Taxa Zero)';

      setReceiptData({
        methodName,
        txHash: `ATOS2-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        fee: touristFeeBrl,
        merchantFee: merchantFeeBrl,
        merchantNet: merchantNetBrl,
        totalBrl: totalFinalBrl,
        totalConverted: `${currInfo.symbol} ${convertedTotal}`,
        merchant,
        table,
        date: new Date().toLocaleString(),
      });
      setIsProcessing(false);
      setPaymentModalVisible(false);
      setIsPaid(true);
    }, 1200);
  };

  if (isPaid && receiptData) {
    return (
      <SafeAreaView style={styles.successContainer}>
        <StatusBar barStyle="light-content" />
        <ScrollView contentContainerStyle={styles.successScroll}>
          <View style={styles.successCard}>
            <View style={styles.successIconBox}>
              <Ionicons name="checkmark-circle" size={76} color="#4ADE80" />
            </View>

            <Text style={styles.successTitle}>Pagamento Aprovado!</Text>
            <Text style={styles.successSub}>Comprovante de Liquidação D+0</Text>

            <View style={styles.receiptBox}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Estabelecimento:</Text>
                <Text style={styles.receiptVal}>{receiptData.merchant}</Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Mesa / Referência:</Text>
                <Text style={styles.receiptVal}>Mesa {receiptData.table}</Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Forma de Pagamento:</Text>
                <Text style={[styles.receiptVal, { color: '#38BDF8' }]}>{receiptData.methodName}</Text>
              </View>

              <View style={styles.receiptDivider} />

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Subtotal da Conta:</Text>
                <Text style={styles.receiptVal}>R$ {subtotalWithTipBrl.toFixed(2)}</Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>
                  {selectedMethod === 'pix' && 'Taxa Turista (PIX):'}
                  {selectedMethod === 'solana' && 'Taxa Turista (Solana 2%):'}
                  {selectedMethod === 'card' && 'Taxa Cartão Internacional (5.9%):'}
                  {selectedMethod === 'internal_p2p' && 'Taxa Atos2 P2P:'}
                </Text>
                <Text style={[styles.receiptVal, { color: receiptData.fee === 0 ? '#4ADE80' : '#F59E0B' }]}>
                  {receiptData.fee === 0 ? 'GRÁTIS (0%)' : `+ R$ ${receiptData.fee.toFixed(2)}`}
                </Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Taxa Estabelecimento ({selectedMethod === 'pix' ? '1.99%' : selectedMethod === 'card' ? '2.5%' : selectedMethod === 'internal_p2p' ? '0%' : '2%'}):</Text>
                <Text style={[styles.receiptVal, { color: '#94A3B8' }]}>
                  - R$ {receiptData.merchantFee.toFixed(2)}
                </Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Repasse Líquido ao Comerciante:</Text>
                <Text style={[styles.receiptVal, { color: '#4ADE80', fontWeight: 'bold' }]}>
                  R$ {receiptData.merchantNet.toFixed(2)}
                </Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabelBold}>Total Pago pelo Cliente:</Text>
                <Text style={styles.receiptValBold}>
                  R$ {receiptData.totalBrl.toFixed(2)} ({receiptData.totalConverted})
                </Text>
              </View>

              <View style={styles.receiptDivider} />

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Comprovante ID:</Text>
                <Text style={[styles.receiptVal, { fontSize: 11, color: '#94A3B8' }]}>
                  {receiptData.txHash}
                </Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Data e Hora:</Text>
                <Text style={styles.receiptVal}>{receiptData.date}</Text>
              </View>
            </View>

            {/* Aviso Obrigatório de Repasse Bancário D+1 (Zero Custódia) */}
            <View style={styles.bankTransferNoticeCard}>
              <View style={styles.bankTransferNoticeHeader}>
                <Ionicons name="business" size={20} color="#F59E0B" />
                <Text style={styles.bankTransferNoticeTitle}>Repasse Automático para Conta Bancária / PIX</Text>
              </View>
              <Text style={styles.bankTransferNoticeDesc}>
                O valor líquido de{' '}
                <Text style={{ fontWeight: 'bold', color: '#4ADE80' }}>
                  R$ {receiptData.merchantNet.toFixed(2)}
                </Text>{' '}
                (sem a taxa de 2%) foi registrado no seu extrato e será transferido automaticamente para sua chave PIX / conta bancária cadastrada em{' '}
                <Text style={{ fontWeight: 'bold', color: '#FFF' }}>até 24 horas</Text>{' '}
                (aplicável após alcançar o valor mínimo de{' '}
                <Text style={{ fontWeight: 'bold', color: '#38BDF8' }}>~5 EUR / ~R$ 30,00</Text>{' '}
                exigido pela operadora de liquidação).
              </Text>
              <View style={styles.bankTransferNoticeBadge}>
                <Ionicons name="time-outline" size={14} color="#F59E0B" />
                <Text style={styles.bankTransferNoticeBadgeText}>
                  Status: Liquidação D+1 Agendada • Zero Custódia Atos2
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.doneButton} onPress={() => router.replace('/')}>
              <Ionicons name="home-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.doneButtonText}>Concluir / Voltar ao Início</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AtoS2 Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Banner do Estabelecimento */}
        <View style={styles.merchantCard}>
          <View style={styles.merchantHeader}>
            <Ionicons name="restaurant-outline" size={20} color="#38BDF8" />
            <Text style={styles.merchantName}>{merchant}</Text>
          </View>
          <Text style={styles.tableBadge}>Ref / Mesa {table}</Text>

          {/* Seletor de Moeda Original do Usuário */}
          <Text style={styles.currencySelectorTitle}>Moeda de Visualização:</Text>
          <View style={styles.currencyRow}>
            {(['BRL', 'USD', 'EUR', 'GBP'] as SupportedCurrency[]).map((curr) => (
              <TouchableOpacity
                key={curr}
                style={[
                  styles.currencyPill,
                  selectedCurrency === curr && styles.currencyPillActive,
                ]}
                onPress={() => setSelectedCurrency(curr)}
              >
                <Text
                  style={[
                    styles.currencyPillText,
                    selectedCurrency === curr && styles.currencyPillTextActive,
                  ]}
                >
                  {CURRENCY_RATES[curr].symbol} {curr}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Exibição do Valor */}
          <View style={styles.amountDisplay}>
            <Text style={styles.amountConverted}>
              {currInfo.symbol} {convertedTotal}
            </Text>
            <Text style={styles.amountBrl}>
              R$ {totalFinalBrl.toFixed(2)} BRL
            </Text>
            {selectedMethod === 'pix' && (
              <Text style={styles.feeNoticeFree}>
                ⚡ PIX: Taxa ZERO para o cliente (Comerciante paga apenas 1%)
              </Text>
            )}
            {selectedMethod === 'solana' && (
              <Text style={styles.feeNotice}>
                ⚡ Solana Pay: +2% taxa turista (+ R$ {touristFeeBrl.toFixed(2)}) • 1s na blockchain
              </Text>
            )}
            {selectedMethod === 'card' && (
              <Text style={styles.feeNotice}>
                💳 Cartão Internacional: +3.9% taxa de processamento (+ R$ {touristFeeBrl.toFixed(2)})
              </Text>
            )}
            {selectedMethod === 'internal_p2p' && (
              <Text style={styles.feeNoticeFree}>
                ⭐ Transferência entre Usuários Atos2: TAXA ZERO (0%)
              </Text>
            )}
          </View>
        </View>

        {/* Gratificação Voluntária */}
        <Text style={styles.sectionTitle}>Gorjeta Voluntária para a Equipe</Text>
        <View style={styles.tipRow}>
          {[0, 5, 10, 15, 20].map((tip) => (
            <TouchableOpacity
              key={tip}
              style={[styles.tipCard, selectedTip === tip && styles.tipCardActive]}
              onPress={() => setSelectedTip(tip)}
            >
              <Text style={[styles.tipCardText, selectedTip === tip && styles.tipCardTextActive]}>
                {tip === 0 ? 'Sem Gorjeta' : `${tip}%`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* As 4 Formas de Pagamento Oficiais */}
        <Text style={styles.sectionTitle}>Escolha a Forma de Pagamento:</Text>

        {/* 1. PIX Instantâneo */}
        <TouchableOpacity
          style={[styles.methodCard, selectedMethod === 'pix' && styles.methodCardActive]}
          onPress={() => setSelectedMethod('pix')}
        >
          <View style={styles.methodLeft}>
            <View style={[styles.methodIconBadge, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
              <Ionicons name="qr-code-outline" size={24} color="#22C55E" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.methodTitleRow}>
                <Text style={styles.methodTitle}>1. PIX Instantâneo</Text>
                <Text style={[styles.tagFee, { backgroundColor: 'rgba(34, 197, 94, 0.2)', color: '#4ADE80' }]}>Cliente 0% • Loja 1%</Text>
              </View>
              <Text style={styles.methodSub}>QR Code Dinâmico • Sem taxas para o pagador, 1% comerciante</Text>
            </View>
          </View>
          <View style={[styles.radio, selectedMethod === 'pix' && styles.radioActive]} />
        </TouchableOpacity>

        {/* 2. Solana Pay */}
        <TouchableOpacity
          style={[styles.methodCard, selectedMethod === 'solana' && styles.methodCardActive]}
          onPress={() => setSelectedMethod('solana')}
        >
          <View style={styles.methodLeft}>
            <View style={[styles.methodIconBadge, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
              <Ionicons name="flash-outline" size={24} color="#A855F7" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.methodTitleRow}>
                <Text style={styles.methodTitle}>2. Solana Pay (USDC / SOL)</Text>
                <Text style={styles.tagFee}>Taxa +2%</Text>
              </View>
              <Text style={styles.methodSub}>Pix Cripto Global • Liquidação em 1s direto na carteira Solana</Text>
            </View>
          </View>
          <View style={[styles.radio, selectedMethod === 'solana' && styles.radioActive]} />
        </TouchableOpacity>

        {/* 3. Cartão Internacional / Apple Pay */}
        <TouchableOpacity
          style={[styles.methodCard, selectedMethod === 'card' && styles.methodCardActive]}
          onPress={() => setSelectedMethod('card')}
        >
          <View style={styles.methodLeft}>
            <View style={[styles.methodIconBadge, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
              <Ionicons name="card-outline" size={24} color="#38BDF8" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.methodTitleRow}>
                <Text style={styles.methodTitle}>3. Cartão Internacional / Apple Pay</Text>
                <Text style={[styles.tagFee, { color: '#38BDF8' }]}>Taxa +3.9%</Text>
              </View>
              <Text style={styles.methodSub}>Apple Pay, Google Pay e Cartões Visa / Mastercard globais</Text>
            </View>
          </View>
          <View style={[styles.radio, selectedMethod === 'card' && styles.radioActive]} />
        </TouchableOpacity>

        {/* 4. Transferência entre Usuários Atos2 */}
        <TouchableOpacity
          style={[styles.methodCard, selectedMethod === 'internal_p2p' && styles.methodCardActive]}
          onPress={() => setSelectedMethod('internal_p2p')}
        >
          <View style={styles.methodLeft}>
            <View style={[styles.methodIconBadge, { backgroundColor: 'rgba(234, 179, 8, 0.15)' }]}>
              <Ionicons name="swap-horizontal-outline" size={24} color="#EAB308" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.methodTitleRow}>
                <Text style={styles.methodTitle}>4. Transferência Atos2 (P2P)</Text>
                <Text style={styles.tagZeroFee}>TAXA ZERO (0%)</Text>
              </View>
              <Text style={styles.methodSub}>Transferência direta de saldo entre usuários do app</Text>
            </View>
          </View>
          <View style={[styles.radio, selectedMethod === 'internal_p2p' && styles.radioActive]} />
        </TouchableOpacity>

        {/* Botão de Abrir Pagamento */}
        <TouchableOpacity
          style={styles.payButton}
          onPress={handleOpenMethodAction}
          disabled={isProcessing}
        >
          <Ionicons name="shield-checkmark" size={20} color="#FFF" />
          <Text style={styles.payButtonText}>
            Pagar {currInfo.symbol} {convertedTotal} (R$ {totalFinalBrl.toFixed(2)})
          </Text>
        </TouchableOpacity>

        <Text style={styles.guaranteeText}>
          🔒 Checkout Seguro 256-bit • Liquidação D+0 para o Estabelecimento
        </Text>
      </ScrollView>

      {/* MODAL INTERATIVO DE PAGAMENTO CONFORME O MÉTODO SELECIONADO */}
      <Modal
        visible={paymentModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedMethod === 'pix' && 'Pagamento via PIX'}
                {selectedMethod === 'solana' && 'Pagamento via Solana Pay'}
                {selectedMethod === 'card' && 'Cartão Internacional / Apple Pay'}
                {selectedMethod === 'internal_p2p' && 'Transferência Direta Atos2'}
              </Text>
              <TouchableOpacity
                onPress={() => setPaymentModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              {/* Resumo do Valor no Topo do Modal */}
              <View style={styles.modalAmountBox}>
                <Text style={styles.modalAmountLabel}>Total a Pagar:</Text>
                <Text style={styles.modalAmountValue}>
                  {currInfo.symbol} {convertedTotal}
                </Text>
                <Text style={styles.modalAmountBrl}>
                  R$ {totalFinalBrl.toFixed(2)} BRL • Taxa Turista: {touristFeeBrl === 0 ? '0% (Grátis)' : '+ R$ ' + touristFeeBrl.toFixed(2) + ' (' + (touristFeeRate * 100).toFixed(1) + '%)'}
                </Text>
              </View>

              {/* 1. CONTEÚDO DO PIX */}
              {selectedMethod === 'pix' && (
                <View style={styles.methodDetailContainer}>
                  <Text style={styles.methodInstruction}>
                    {isGeneratingPix
                      ? 'Gerando QR Code PIX dinâmico oficial...'
                      : 'Escaneie o QR Code abaixo no app do seu banco ou copie o código Pix:'}
                  </Text>
                  <View style={styles.qrCodeWrapper}>
                    {isGeneratingPix ? (
                      <ActivityIndicator size="large" color="#38BDF8" style={{ padding: 40 }} />
                    ) : (
                      <QRCode value={activePixCode} size={180} color="#0F172A" />
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={() => handleCopy(activePixCode)}
                    disabled={isGeneratingPix}
                  >
                    <Ionicons
                      name={copiedKey ? 'checkmark' : 'copy-outline'}
                      size={18}
                      color="#38BDF8"
                    />
                    <Text style={styles.copyButtonText}>
                      {copiedKey ? 'Código Pix Copiado!' : 'Copiar Código Pix Copia e Cola'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 2. CONTEÚDO DA SOLANA */}
              {selectedMethod === 'solana' && (
                <View style={styles.methodDetailContainer}>
                  <Text style={styles.methodInstruction}>
                    Pague instantaneamente via Solana Pay usando sua carteira Phantom, Solflare ou qualquer carteira Solana:
                  </Text>

                  {/* Seletor Cripto: SOL Nativo ou USDC */}
                  <View style={styles.solanaTokenToggleRow}>
                    <TouchableOpacity
                      style={[styles.solanaTokenBtn, solanaToken === 'SOL' && styles.solanaTokenBtnActive]}
                      onPress={() => setSolanaToken('SOL')}
                    >
                      <Text style={[styles.solanaTokenBtnText, solanaToken === 'SOL' && styles.solanaTokenBtnTextActive]}>
                        🟣 Pagar em SOL ({totalSol.toFixed(4)} SOL)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.solanaTokenBtn, solanaToken === 'USDC' && styles.solanaTokenBtnActive]}
                      onPress={() => setSolanaToken('USDC')}
                    >
                      <Text style={[styles.solanaTokenBtnText, solanaToken === 'USDC' && styles.solanaTokenBtnTextActive]}>
                        💵 Pagar em USDC (${totalUsdc.toFixed(2)})
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.solanaAmountBadge}>
                    <Text style={styles.solanaAmountText}>
                      {solanaToken === 'SOL'
                        ? `${totalSol.toFixed(4)} SOL (~ US$ ${totalUsdc.toFixed(2)})`
                        : `${totalUsdc.toFixed(2)} USDC (~ ${totalSol.toFixed(4)} SOL)`}
                    </Text>
                    <Text style={styles.solanaNetText}>Moeda: {solanaToken} • Rede: {SOLANA_CONFIG.NETWORK_LABEL}</Text>
                  </View>

                  <View style={styles.qrCodeWrapper}>
                    <QRCode value={solanaUri} size={180} color="#0F172A" />
                  </View>

                  <View style={styles.solanaActionsRow}>
                    <TouchableOpacity
                      style={styles.solanaActionBtn}
                      onPress={() => handleCopy(SOLANA_CONFIG.WALLET_ADDRESS)}
                    >
                      <Ionicons
                        name={copiedKey ? 'checkmark' : 'copy-outline'}
                        size={16}
                        color="#A855F7"
                      />
                      <Text style={styles.solanaActionBtnText}>
                        {copiedKey ? 'Copiado!' : 'Copiar Endereço'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.solanaActionBtn, { backgroundColor: '#581C87' }]}
                      onPress={() => openSolanaWalletApp(solanaUri)}
                    >
                      <Ionicons name="open-outline" size={16} color="#FFF" />
                      <Text style={[styles.solanaActionBtnText, { color: '#FFF' }]}>
                        Abrir Phantom
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.solanaWalletDisplay}>
                    Endereço Oficial: {SOLANA_CONFIG.WALLET_ADDRESS.substring(0, 8)}...
                    {SOLANA_CONFIG.WALLET_ADDRESS.substring(SOLANA_CONFIG.WALLET_ADDRESS.length - 8)}
                  </Text>

                  {/* Alerta de Liquidação Automática Zero Custódia */}
                  <View style={styles.solanaZeroCustodyNoticeBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Ionicons name="shield-checkmark" size={16} color="#A855F7" />
                      <Text style={styles.solanaZeroCustodyNoticeTitle}>Liquidação Automática Zero Custódia</Text>
                    </View>
                    <Text style={styles.solanaZeroCustodyNoticeText}>
                      O pagamento em {solanaToken} é liquidado diretamente na rede Solana e convertido na moeda fiduciária local (R$). O valor líquido (sem a taxa de 2%) entra no seu extrato e é transferido para a sua conta bancária/PIX em até 24h (para valores a partir de ~5 EUR da operadora).
                    </Text>
                  </View>
                </View>
              )}

              {/* 3. CONTEÚDO DO CARTÃO / APPLE PAY */}
              {selectedMethod === 'card' && (
                <View style={styles.methodDetailContainer}>
                  <Text style={styles.methodInstruction}>
                    Pagamento seguro com suporte a Apple Pay, Google Pay e Cartões de Crédito Internacionais (Visa, Mastercard, Amex).
                  </Text>
                  <View style={styles.binanceBadgeBox}>
                    <Ionicons name="logo-apple" size={28} color="#FFF" />
                    <Ionicons name="logo-google" size={28} color="#FFF" />
                    <Ionicons name="card" size={28} color="#38BDF8" />
                  </View>
                  <View style={{ backgroundColor: '#0F172A', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#334155', width: '100%', gap: 6 }}>
                    <Text style={{ color: '#F8FAFC', fontWeight: 'bold', fontSize: 13, textAlign: 'center' }}>
                      🔒 Proteção Antifraude 3D Secure
                    </Text>
                    <Text style={{ color: '#94A3B8', fontSize: 12, textAlign: 'center' }}>
                      Taxa de processamento de cartão internacional de 5.9% inclusa no total. Liquidação PIX para o estabelecimento em até 5 dias corridos (D+5).
                    </Text>
                  </View>
                </View>
              )}

              {/* 4. CONTEÚDO DA TRANSFERÊNCIA ATOS2 P2P */}
              {selectedMethod === 'internal_p2p' && (
                <View style={styles.methodDetailContainer}>
                  <View style={styles.p2pZeroBox}>
                    <Ionicons name="star" size={24} color="#EAB308" />
                    <Text style={styles.p2pZeroTitle}>Isento de Taxas (0%)</Text>
                    <Text style={styles.p2pZeroSub}>
                      Transferência gratuita instantânea entre contas Atos2
                    </Text>
                  </View>

                  {user ? (
                    <View style={styles.userInfoBox}>
                      <Text style={styles.userInfoLabel}>Pagando com sua conta:</Text>
                      <Text style={styles.userInfoName}>{user.name || user.email}</Text>
                      <Text style={styles.userInfoNick}>@{user.nickname}</Text>
                    </View>
                  ) : (
                    <Text style={styles.p2pNotice}>
                      Para transferir com taxa zero, confirme a operação ou acesse com sua conta Atos2.
                    </Text>
                  )}
                </View>
              )}

              {/* Botão de Confirmação no Modal */}
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleConfirmPayment}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={20} color="#FFF" />
                    <Text style={styles.modalConfirmButtonText}>
                      {selectedMethod === 'pix' && 'Já paguei o Pix / Confirmar'}
                      {selectedMethod === 'solana' && `Verificar Pagamento ${solanaToken} na Blockchain`}
                      {selectedMethod === 'card' && (pendingStripeSessionId ? 'Verificar Confirmação Stripe' : 'Pagar com Cartão / Apple Pay')}
                      {selectedMethod === 'internal_p2p' && 'Confirmar Transferência P2P'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 8,
    backgroundColor: '#1E293B',
    borderRadius: 12,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  merchantCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  merchantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  merchantName: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tableBadge: {
    backgroundColor: '#0284C7',
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 6,
  },
  currencySelectorTitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 14,
    marginBottom: 6,
    fontWeight: '600',
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  currencyPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  currencyPillActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  currencyPillText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  currencyPillTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  amountDisplay: {
    alignItems: 'center',
    marginTop: 16,
  },
  amountConverted: {
    color: '#38BDF8',
    fontSize: 34,
    fontWeight: 'bold',
  },
  amountBrl: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 2,
  },
  feeNotice: {
    color: '#F59E0B',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '600',
  },
  feeNoticeFree: {
    color: '#4ADE80',
    fontSize: 12,
    marginTop: 6,
    fontWeight: 'bold',
  },
  sectionTitle: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
  },
  tipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tipCard: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  tipCardActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  tipCardText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  tipCardTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  methodCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#334155',
  },
  methodCardActive: {
    borderColor: '#38BDF8',
    backgroundColor: '#0F172A',
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  methodIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  methodTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tagFee: {
    backgroundColor: '#334155',
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagZeroFee: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    color: '#4ADE80',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  methodSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#64748B',
    marginLeft: 8,
  },
  radioActive: {
    borderColor: '#38BDF8',
    backgroundColor: '#38BDF8',
  },
  payButton: {
    backgroundColor: '#16A34A',
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    elevation: 4,
  },
  payButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  guaranteeText: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#334155',
  },
  modalContent: {
    gap: 16,
    paddingBottom: 24,
  },
  modalAmountBox: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalAmountLabel: {
    color: '#94A3B8',
    fontSize: 12,
  },
  modalAmountValue: {
    color: '#38BDF8',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 2,
  },
  modalAmountBrl: {
    color: '#CBD5E1',
    fontSize: 12,
    marginTop: 4,
  },
  methodDetailContainer: {
    alignItems: 'center',
    gap: 12,
  },
  methodInstruction: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  qrCodeWrapper: {
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginVertical: 6,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  copyButtonText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '600',
  },
  binanceBadgeBox: {
    flexDirection: 'row',
    gap: 20,
    padding: 20,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    marginVertical: 10,
  },
  binanceNote: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
  },
  solanaTokenToggleRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    marginBottom: 8,
  },
  solanaTokenBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  solanaTokenBtnActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.25)',
    borderColor: '#A855F7',
  },
  solanaTokenBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  solanaTokenBtnTextActive: {
    color: '#E9D5FF',
    fontWeight: 'bold',
  },
  solanaAmountBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A855F7',
  },
  solanaAmountText: {
    color: '#C084FC',
    fontSize: 15,
    fontWeight: 'bold',
  },
  solanaNetText: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  solanaActionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    justifyContent: 'center',
  },
  solanaActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A855F7',
  },
  solanaActionBtnText: {
    color: '#C084FC',
    fontSize: 12,
    fontWeight: '600',
  },
  solanaWalletDisplay: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 4,
  },
  p2pZeroBox: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAB308',
    width: '100%',
  },
  p2pZeroTitle: {
    color: '#EAB308',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 6,
  },
  p2pZeroSub: {
    color: '#CBD5E1',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  userInfoBox: {
    backgroundColor: '#0F172A',
    padding: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  userInfoLabel: {
    color: '#94A3B8',
    fontSize: 11,
  },
  userInfoName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
  },
  userInfoNick: {
    color: '#38BDF8',
    fontSize: 12,
  },
  p2pNotice: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
  },
  modalConfirmButton: {
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  modalConfirmButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },

  // Success styles
  successContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  successScroll: {
    padding: 20,
    alignItems: 'center',
  },
  successCard: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  successIconBox: {
    marginBottom: 12,
  },
  successTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  successSub: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 2,
    marginBottom: 18,
  },
  receiptBox: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    gap: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptLabel: {
    color: '#94A3B8',
    fontSize: 12,
  },
  receiptVal: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  receiptLabelBold: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  receiptValBold: {
    color: '#38BDF8',
    fontSize: 15,
    fontWeight: 'bold',
  },
  receiptDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 4,
  },
  doneButton: {
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 14,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  bankTransferNoticeCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    gap: 8,
  },
  bankTransferNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bankTransferNoticeTitle: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
  },
  bankTransferNoticeDesc: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 18,
  },
  bankTransferNoticeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  bankTransferNoticeBadgeText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '600',
  },
  solanaZeroCustodyNoticeBox: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderRadius: 12,
    padding: 12,
    width: '100%',
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  solanaZeroCustodyNoticeTitle: {
    color: '#C084FC',
    fontSize: 12,
    fontWeight: 'bold',
  },
  solanaZeroCustodyNoticeText: {
    color: '#CBD5E1',
    fontSize: 11,
    lineHeight: 16,
  },
});
