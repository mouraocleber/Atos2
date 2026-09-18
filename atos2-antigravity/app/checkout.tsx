import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { useAuth } from '../contexts/AuthContext';
import { ATOS2_FEES, SOLANA_CONFIG } from '../constants/fees';
import {
  convertBrlToUsdc,
  convertBrlToSol,
  generateSolanaPayUri,
  openSolanaWalletApp,
  checkSolanaTransactionStatus,
} from '../services/solana';
import { createBinanceBuyOrder } from '../services/binance';

type PaymentMethodType = 'pix' | 'card_binance' | 'solana' | 'internal_p2p';
type SupportedCurrency = 'BRL' | 'USD' | 'EUR' | 'GBP';

const CURRENCY_RATES: Record<SupportedCurrency, { symbol: string; rateFromBrl: number; label: string }> = {
  BRL: { symbol: 'R$', rateFromBrl: 1.0, label: 'Real (BRL)' },
  USD: { symbol: '$', rateFromBrl: 1 / 5.60, label: 'Dólar (USD)' },
  EUR: { symbol: '€', rateFromBrl: 1 / 6.10, label: 'Euro (EUR)' },
  GBP: { symbol: '£', rateFromBrl: 1 / 7.15, label: 'Libra (GBP)' },
};

export default function CheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, setLinkAccess } = useAuth();

  useEffect(() => {
    setLinkAccess(true);
  }, []);

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

  // Cálculos financeiros
  const tipAmountBrl = (baseAmountBrl * selectedTip) / 100;
  const subtotalWithTipBrl = baseAmountBrl + tipAmountBrl;

  // Regra da Taxa da Plataforma Atos2:
  // Pix, Cartão/Binance e Solana = 2% de taxa
  // Transferência entre usuários Atos2 P2P = 0% de taxa
  const platformFeeRate = selectedMethod === 'internal_p2p' ? 0.0 : ATOS2_FEES.CHECKOUT_PLATFORM_FEE;
  const platformFeeBrl = subtotalWithTipBrl * platformFeeRate;
  const totalFinalBrl = subtotalWithTipBrl + platformFeeBrl;

  // Conversões
  const currInfo = CURRENCY_RATES[selectedCurrency];
  const convertedTotal = (totalFinalBrl * currInfo.rateFromBrl).toFixed(2);
  const convertedSubtotal = (baseAmountBrl * currInfo.rateFromBrl).toFixed(2);
  const convertedFee = (platformFeeBrl * currInfo.rateFromBrl).toFixed(2);

  // Valores Solana USDC e SOL
  const totalUsdc = convertBrlToUsdc(totalFinalBrl, 5.60);
  const totalSol = convertBrlToSol(totalFinalBrl, 150, 5.60);

  // Geração de chaves e links
  const simulatedPixCode = `00020126580014br.gov.bcb.pix0136atos2-checkout-${table}-${Date.now()}520400005303986540${totalFinalBrl.toFixed(2)}5802BR5925ATOS2 MEIOS DE PAGAMENTO6009SAO PAULO62070503***6304`;
  const solanaUri = generateSolanaPayUri({
    amountUsdc: totalUsdc,
    label: `AtoS2 - ${merchant}`,
    message: `Conta Mesa/Ref ${table}`,
    reference: `atos2_${Date.now()}`,
  });

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
        const solResult = await checkSolanaTransactionStatus(`ref_${table}`, totalUsdc);
        setReceiptData({
          methodName: 'Solana Pay (USDC)',
          txHash: solResult.txHash,
          fee: platformFeeBrl,
          totalBrl: totalFinalBrl,
          totalConverted: `${totalUsdc.toFixed(2)} USDC`,
          merchant,
          table,
          date: new Date().toLocaleString(),
        });
        setIsProcessing(false);
        setPaymentModalVisible(false);
        setIsPaid(true);
        return;
      } catch (e) {
        console.warn('Erro ao verificar Solana:', e);
      }
    }

    if (selectedMethod === 'card_binance') {
      try {
        // Tenta gerar pedido real no backend ou abre deep link
        const buyOrder = await createBinanceBuyOrder(totalFinalBrl, 'USDC').catch(() => null);
        if (buyOrder?.data?.payUrl) {
          Linking.openURL(buyOrder.data.payUrl);
        }
      } catch (e) {
        console.warn('Binance link fallback:', e);
      }
    }

    // Simulação de confirmação instantânea
    setTimeout(() => {
      let methodName = 'PIX Instantâneo';
      if (selectedMethod === 'card_binance') methodName = 'Cartão / Carteira Digital (Binance Pay)';
      if (selectedMethod === 'solana') methodName = 'Solana Pay (USDC)';
      if (selectedMethod === 'internal_p2p') methodName = 'Transferência Direta Atos2 (Taxa Zero)';

      setReceiptData({
        methodName,
        txHash: `ATOS2-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        fee: platformFeeBrl,
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
                <Text style={styles.receiptLabel}>Taxa Atos2 ({selectedMethod === 'internal_p2p' ? '0%' : '2%'}):</Text>
                <Text style={[styles.receiptVal, { color: selectedMethod === 'internal_p2p' ? '#4ADE80' : '#F59E0B' }]}>
                  {selectedMethod === 'internal_p2p' ? 'GRÁTIS (R$ 0,00)' : `+ R$ ${receiptData.fee.toFixed(2)}`}
                </Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabelBold}>Total Pago:</Text>
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
            {selectedMethod !== 'internal_p2p' ? (
              <Text style={styles.feeNotice}>
                Inclui taxa Atos2 de 2% (+ R$ {platformFeeBrl.toFixed(2)})
              </Text>
            ) : (
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
                <Text style={styles.tagFee}>Taxa 2%</Text>
              </View>
              <Text style={styles.methodSub}>QR Code Dinâmico + Copia e Cola para o restaurante</Text>
            </View>
          </View>
          <View style={[styles.radio, selectedMethod === 'pix' && styles.radioActive]} />
        </TouchableOpacity>

        {/* 2. Cartão & Carteiras Digitais via Binance */}
        <TouchableOpacity
          style={[styles.methodCard, selectedMethod === 'card_binance' && styles.methodCardActive]}
          onPress={() => setSelectedMethod('card_binance')}
        >
          <View style={styles.methodLeft}>
            <View style={[styles.methodIconBadge, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
              <Ionicons name="card-outline" size={24} color="#38BDF8" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.methodTitleRow}>
                <Text style={styles.methodTitle}>2. Cartão / Carteira Digital</Text>
                <Text style={styles.tagFee}>Taxa 2%</Text>
              </View>
              <Text style={styles.methodSub}>Apple Pay, Google Pay ou Cartão via Binance Pay</Text>
            </View>
          </View>
          <View style={[styles.radio, selectedMethod === 'card_binance' && styles.radioActive]} />
        </TouchableOpacity>

        {/* 3. Solana Pay */}
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
                <Text style={styles.methodTitle}>3. Solana Pay (USDC / SOL)</Text>
                <Text style={styles.tagFee}>Taxa 2%</Text>
              </View>
              <Text style={styles.methodSub}>Pix Cripto Global • Liquidação em 1s na rede Solana</Text>
            </View>
          </View>
          <View style={[styles.radio, selectedMethod === 'solana' && styles.radioActive]} />
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
                {selectedMethod === 'card_binance' && 'Cartão & Carteira Digital'}
                {selectedMethod === 'solana' && 'Pagamento via Solana Pay'}
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
                  R$ {totalFinalBrl.toFixed(2)} BRL • Taxa Atos2: {selectedMethod === 'internal_p2p' ? '0%' : '2% (R$ ' + platformFeeBrl.toFixed(2) + ')'}
                </Text>
              </View>

              {/* 1. CONTEÚDO DO PIX */}
              {selectedMethod === 'pix' && (
                <View style={styles.methodDetailContainer}>
                  <Text style={styles.methodInstruction}>
                    Escaneie o QR Code abaixo no app do seu banco ou copie a chave Pix:
                  </Text>
                  <View style={styles.qrCodeWrapper}>
                    <QRCode value={simulatedPixCode} size={180} color="#0F172A" />
                  </View>
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={() => handleCopy(simulatedPixCode)}
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

              {/* 2. CONTEÚDO DO CARTÃO / BINANCE */}
              {selectedMethod === 'card_binance' && (
                <View style={styles.methodDetailContainer}>
                  <Text style={styles.methodInstruction}>
                    Você será direcionado para o checkout seguro da Binance Pay com suporte a Apple Pay, Google Pay e Cartão de Crédito Internacional.
                  </Text>
                  <View style={styles.binanceBadgeBox}>
                    <Ionicons name="logo-apple" size={28} color="#FFF" />
                    <Ionicons name="logo-google" size={28} color="#FFF" />
                    <Ionicons name="card" size={28} color="#F59E0B" />
                  </View>
                  <Text style={styles.binanceNote}>
                    A taxa de 2% da plataforma já está embutida na cotação calculada.
                  </Text>
                </View>
              )}

              {/* 3. CONTEÚDO DA SOLANA */}
              {selectedMethod === 'solana' && (
                <View style={styles.methodDetailContainer}>
                  <Text style={styles.methodInstruction}>
                    Pague instantaneamente via Solana Pay usando qualquer carteira Solana (Phantom, Solflare, etc.):
                  </Text>

                  <View style={styles.solanaAmountBadge}>
                    <Text style={styles.solanaAmountText}>
                      {totalUsdc.toFixed(2)} USDC (~ {totalSol.toFixed(4)} SOL)
                    </Text>
                    <Text style={styles.solanaNetText}>Rede: {SOLANA_CONFIG.NETWORK_LABEL}</Text>
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
                        Abrir Carteira
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.solanaWalletDisplay}>
                    Endereço Oficial: {SOLANA_CONFIG.WALLET_ADDRESS.substring(0, 8)}...
                    {SOLANA_CONFIG.WALLET_ADDRESS.substring(SOLANA_CONFIG.WALLET_ADDRESS.length - 8)}
                  </Text>
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
                      {selectedMethod === 'card_binance' && 'Prosseguir para Binance Pay'}
                      {selectedMethod === 'solana' && 'Confirmar Pagamento Solana'}
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
});
