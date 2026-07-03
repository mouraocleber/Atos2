import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, Modal, TextInput, ActivityIndicator, RefreshControl, KeyboardAvoidingView, Platform, ScrollView, Dimensions
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useStripe } from '@stripe/stripe-react-native';
import { useFocusEffect } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useBiometric } from '../../contexts/BiometricContext';
import { useOnboarding } from '../../contexts/OnboardingContext';
import CoachMark from '../../components/CoachMark';
import { getBalance, getTransactionHistory, createTransaction, WalletBalanceResponse } from '../../services/wallet';
import api, { SERVER_URL } from '../../services/api';
import CachedImage from '../../components/CachedImage';
import TapToPayModal from '../../components/TapToPayModal';
import { ATOS2_FEES } from '../../constants/fees';
import * as Linking from 'expo-linking';
import { getBinanceQuote, createBinanceBuyOrder } from '../../services/binance';

interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'PAYMENT' | 'REFUND';
  amount: number;
  description: string;
  created_at: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'CANCELLED';
  currency: string;
}

const typeLabels: Record<string, { icon: any; label: string; color: string }> = {
  DEPOSIT: { icon: 'arrow-down', label: 'Depósito', color: Colors.success },
  WITHDRAW: { icon: 'arrow-up', label: 'Saque', color: Colors.error },
  TRANSFER: { icon: 'refresh-cw', label: 'Transferência', color: Colors.info },
  PAYMENT: { icon: 'credit-card', label: 'Pagamento', color: Colors.warning },
  REFUND: { icon: 'rotate-ccw', label: 'Reembolso', color: Colors.success },
};

export default function WalletScreen() {
  const { user } = useAuth();
  const { isBiometricEnabled, authenticate } = useBiometric();
  const { isCoachDone, markCoachDone } = useOnboarding();
  const [coachVisible, setCoachVisible] = useState(false);

  // Refs para os alvos do tutorial
  const balanceCardRef = useRef<View>(null);
  const depositBtnRef = useRef<View>(null);
  const transferBtnRef = useRef<View>(null);
  const historyListRef = useRef<View>(null);

  // ─── TODOS os hooks ANTES de qualquer return condicional (regra dos React Hooks) ───
  const [walletUnlocked, setWalletUnlocked] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [showUnlockPassword, setShowUnlockPassword] = useState(false);

  // Wallet data states
  const [balanceData, setBalanceData] = useState<WalletBalanceResponse | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // PIX QR Code (Depositar = receber por PIX)
  const [pixQrVisible, setPixQrVisible] = useState(false);
  const [pixKeyType, setPixKeyType] = useState<'phone' | 'email' | 'cpf'>('email');
  const [depositTab, setDepositTab] = useState<'deposit' | 'receive'>('deposit');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);
  const [generatedPixCode, setGeneratedPixCode] = useState('');
  const [depositStep, setDepositStep] = useState<'input' | 'qr'>('input');

  // Cobrar (Stripe POS maquininha)
  const [chargeModalVisible, setChargeModalVisible] = useState(false);
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeLoading, setChargeLoading] = useState(false);

  // QR Code Scanner (Ler QR = pagar PIX externo)
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerVisible, setScannerVisible] = useState(false);
  const [pixPayTarget, setPixPayTarget] = useState('');  // chave PIX escaneada
  const [pixPayAmount, setPixPayAmount] = useState('');
  const [pixPayModalVisible, setPixPayModalVisible] = useState(false);
  const [pixPayLoading, setPixPayLoading] = useState(false);
  const [tapToPayVisible, setTapToPayVisible] = useState(false);
  const [tapToPayAmountCents, setTapToPayAmountCents] = useState(0);

  // Transfer State
  const [modalVisible, setModalVisible] = useState(false);
  const [txTarget, setTxTarget] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txPassword, setTxPassword] = useState('');
  const [txLoading, setTxLoading] = useState(false);
  const [recipientInfo, setRecipientInfo] = useState<{ name: string; nickname: string; profileImage?: string } | null>(null);
  const [fetchingRecipient, setFetchingRecipient] = useState(false);

  // Receipt State
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Binance State
  const [binanceModalVisible, setBinanceModalVisible] = useState(false);
  const [binanceAsset, setBinanceAsset] = useState('USDC');
  const [binanceAmount, setBinanceAmount] = useState('');
  const [binanceLoading, setBinanceLoading] = useState(false);
  const [binanceQuote, setBinanceQuote] = useState<any>(null);
  const [binanceOrder, setBinanceOrder] = useState<any>(null);
  const [binanceStep, setBinanceStep] = useState<'input' | 'checkout'>('input');
  const [fetchingQuote, setFetchingQuote] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      if (walletUnlocked && !isCoachDone('wallet')) {
        const t = setTimeout(() => setCoachVisible(true), 500);
        return () => clearTimeout(t);
      }
    }, [walletUnlocked, isCoachDone])
  );

  useEffect(() => {
    // Reset da trava sempre que a tela é (re)montada
    setWalletUnlocked(false);
    setShowUnlockPassword(false);
    setUnlockPassword('');
  }, []);

  useEffect(() => {
    if (walletUnlocked) loadData();
  }, [walletUnlocked]);

  useEffect(() => {
    if (!txTarget || txTarget.trim().length !== 36) {
      setRecipientInfo(null);
      return;
    }

    const fetchRecipient = async () => {
      setFetchingRecipient(true);
      try {
        const { data } = await api.get(`/users/${txTarget.trim()}`);
        if (data && data.success && data.data) {
          setRecipientInfo(data.data);
        } else {
          setRecipientInfo(null);
        }
      } catch (err) {
        console.warn('Erro ao buscar destinatário:', err);
        setRecipientInfo(null);
      } finally {
        setFetchingRecipient(false);
      }
    };

    fetchRecipient();
  }, [txTarget]);

  useEffect(() => {
    const amountNum = parseFloat(binanceAmount.replace(',', '.'));
    if (!binanceAmount || isNaN(amountNum) || amountNum <= 0) {
      setBinanceQuote(null);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setFetchingQuote(true);
      try {
        const q = await getBinanceQuote(binanceAsset, amountNum);
        setBinanceQuote(q);
      } catch (err) {
        console.warn('Erro ao carregar cotação:', err);
      } finally {
        setFetchingQuote(false);
      }
    }, 600);

    return () => clearTimeout(delayDebounce);
  }, [binanceAmount, binanceAsset]);

  const handleGenerateBinanceOrder = async () => {
    const parsedAmount = parseFloat(binanceAmount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return Alert.alert('Atenção', 'Informe um valor válido maior que R$ 0,00.');
    }
    setBinanceLoading(true);
    try {
      const response = await createBinanceBuyOrder(parsedAmount, binanceAsset);
      if (response && response.success && response.data) {
        setBinanceOrder(response.data);
        setBinanceStep('checkout');
      } else {
        throw new Error('Resposta inválida do servidor.');
      }
    } catch (e: any) {
      console.error(e);
      Alert.alert('Erro', e?.response?.data?.error || 'Não foi possível gerar o pedido de compra na Binance.');
    } finally {
      setBinanceLoading(false);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────────

  async function handleWalletBiometric() {
    setUnlockLoading(true);
    const success = await authenticate('Autentique-se para acessar sua Carteira Atos2');
    setUnlockLoading(false);
    if (success) {
      setWalletUnlocked(true);
    } else {
      setShowUnlockPassword(true);
    }
  }

  async function handleWalletPasswordUnlock() {
    if (!unlockPassword.trim()) {
      return Alert.alert('Atenção', 'Digite sua senha para continuar.');
    }
    setUnlockLoading(true);
    try {
      await api.post('/auth/verify-password', { password: unlockPassword });
      setWalletUnlocked(true);
    } catch {
      Alert.alert('Senha incorreta', 'Verifique sua senha e tente novamente.');
    } finally {
      setUnlockLoading(false);
    }
  }

  // ─── Tela de bloqueio da carteira ────────────────────────────────────────
  if (!walletUnlocked) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: Spacing.xl }]}
      >
        <View style={styles.walletLockWrapper}>
          <View style={styles.walletLockIcon}>
            <Feather name="credit-card" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.walletLockTitle}>Carteira Protegida</Text>
          <Text style={styles.walletLockSubtitle}>
            Confirme sua identidade para acessar sua carteira e realizar transações.
          </Text>

          {isBiometricEnabled && !showUnlockPassword && (
            <TouchableOpacity
              style={styles.walletLockBtn}
              onPress={handleWalletBiometric}
              disabled={unlockLoading}
            >
              {unlockLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="shield" size={20} color="#fff" />
                  <Text style={styles.walletLockBtnText}>Usar Biometria</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {(showUnlockPassword || !isBiometricEnabled) && (
            <View style={{ width: '100%', marginTop: Spacing.md }}>
              <TextInput
                style={styles.inputModal}
                placeholder="🔒 Sua senha"
                placeholderTextColor={Colors.light.textMuted}
                secureTextEntry
                value={unlockPassword}
                onChangeText={setUnlockPassword}
                onSubmitEditing={handleWalletPasswordUnlock}
                autoFocus
              />
              <TouchableOpacity
                style={styles.walletLockBtn}
                onPress={handleWalletPasswordUnlock}
                disabled={unlockLoading}
              >
                {unlockLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.walletLockBtnText}>Desbloquear Carteira</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {isBiometricEnabled && !showUnlockPassword && (
            <TouchableOpacity
              style={{ marginTop: Spacing.lg }}
              onPress={() => setShowUnlockPassword(true)}
            >
              <Text style={{ color: Colors.primary, fontWeight: '600', fontSize: FontSize.sm }}>
                Usar senha em vez disso
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    );
  }
  // ─────────────────────────────────────────────────────────────────────────

  const loadData = async () => {
    try {
      const [bal, hist] = await Promise.all([getBalance(), getTransactionHistory()]);
      setBalanceData(bal);
      setTransactions(Array.isArray(hist) ? hist : (hist as any).data || []);
    } catch (e: any) {
      console.error(e);
      Alert.alert('Erro', e?.response?.data?.error || 'Não foi possível carregar a carteira');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  // Cobrar via Stripe Tap to Pay
  const handleChargeStripe = async () => {
    if (!chargeAmount || parseFloat(chargeAmount.replace(',', '.')) <= 0) {
      return Alert.alert('Atenção', 'Informe um valor válido.');
    }

    const amountCents = Math.round(parseFloat(chargeAmount.replace(',', '.')) * 100);
    setTapToPayAmountCents(amountCents);
    setChargeModalVisible(false);
    setTapToPayVisible(true);
  };

  // Pagar PIX externo (fora do Atos2) após escanear QR
  const handlePixPayExternal = async () => {
    if (!pixPayTarget.trim()) return Alert.alert('Atenção', 'Chave PIX inválida.');
    if (!pixPayAmount || parseFloat(pixPayAmount.replace(',', '.')) <= 0) {
      return Alert.alert('Atenção', 'Informe um valor válido.');
    }
    setPixPayLoading(true);
    try {
      await api.post('/pix/pay', {
        pixKey: pixPayTarget,
        amount: parseFloat(pixPayAmount.replace(',', '.')),
      });
      Alert.alert('PIX Enviado! 🎉', `Pagamento de ${pixPayAmount} enviado para ${pixPayTarget}`);
      setPixPayModalVisible(false);
      setPixPayTarget('');
      setPixPayAmount('');
      loadData();
    } catch (e: any) {
      Alert.alert('Erro PIX', e?.response?.data?.message || 'Não foi possível processar o PIX agora.');
    } finally {
      setPixPayLoading(false);
    }
  };

  const handleGenerateDepositPix = async () => {
    const parsedAmount = parseFloat(depositAmount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return Alert.alert('Atenção', 'Informe um valor válido maior que R$ 0,00.');
    }
    setDepositLoading(true);
    try {
      const response = await api.post('/payments/deposit/pix', {
        amount: parsedAmount,
        currency: 'BRL'
      });
      if (response.data && response.data.success && response.data.data.pix) {
        setGeneratedPixCode(response.data.data.pix.qr_code);
        setDepositStep('qr');
      } else {
        throw new Error('Resposta inválida do servidor.');
      }
    } catch (e: any) {
      console.error(e);
      Alert.alert('Erro', e?.response?.data?.error || 'Não foi possível gerar a cobrança de depósito via PIX.');
    } finally {
      setDepositLoading(false);
    }
  };

  const openScanner = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        return Alert.alert('Atenção', 'Você precisa permitir a câmera para ler QR Codes.');
      }
    }
    setScannerVisible(true);
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    setScannerVisible(false);
    if (data.startsWith('atos2://pay?targetId=')) {
      // QR interno Atos2 → transferir entre usuários
      const targetId = data.split('targetId=')[1].split('&')[0];
      if (targetId) {
        setTxTarget(targetId);
        setModalVisible(true);
      }
    } else {
      // QR externo → pagar PIX (chave pix, copia e cola, etc)
      setPixPayTarget(data);
      setPixPayAmount('');
      setPixPayModalVisible(true);
    }
  };

  const handleTransaction = async () => {
    if (!txAmount || !txPassword) return Alert.alert('Atenção', 'Valor e senha são obrigatórios.');

    if (txTarget && txTarget.trim()) {
      if (!recipientInfo) {
        return Alert.alert('Atenção', 'Você precisa confirmar o destinatário com foto e nome antes de prosseguir.');
      }
    }

    setTxLoading(true);
    try {
      await createTransaction({
        toUserId: txTarget || undefined,
        type: txTarget ? 'TRANSFER' : 'PAYMENT',
        amount: parseFloat(txAmount.replace(',', '.')),
        currency: balanceData?.local?.currency, // Pay in LOCAL currency as requested
        description: 'Transação via App',
        password: txPassword
      });

      Alert.alert('Sucesso', 'Transação efetuada em Moeda Local!');
      setModalVisible(false);
      setTxAmount(''); setTxTarget(''); setTxPassword('');
      loadData();
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.error || 'Movimentação recusada');
    } finally {
      setTxLoading(false);
    }
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const info = typeLabels[item.type];
    return (
      <TouchableOpacity style={styles.transactionItem} onPress={() => setSelectedTx(item)}>
        <View style={[styles.transactionIcon, { backgroundColor: info.color + '20' }]}>
          <Feather name={info.icon} size={20} color={info.color} />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDesc}>{item.description || 'Transferência'}</Text>
          <Text style={styles.transactionDate}>
            {info.label} • {new Date(item.created_at).toLocaleDateString('pt-BR')}
          </Text>
        </View>
        <Text style={[styles.transactionAmount, { color: item.amount >= 0 ? Colors.success : Colors.error }]}>
          {item.amount >= 0 ? '+' : ''}{item.currency} {formatCurrency(Math.abs(item.amount))}
        </Text>
      </TouchableOpacity>
    );
  };

  const formatCurrency = (value: any, decimals: number = 2) => {
    if (value == null) return '0,00';
    const num = Number(value);
    if (isNaN(num)) return '0,00';
    return num.toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  return (
    <View style={styles.container}>
      {/* Carrossel de Saldos Multi-moedas */}
      <View style={{ marginBottom: Spacing.xl }}>
        {loading ? (
          <View style={[styles.balanceCardSlider, { justifyContent: 'center' }]}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            snapToInterval={Dimensions.get('window').width - Spacing.lg * 2 + 16}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 8, gap: 16 }}
            style={{ marginHorizontal: -Spacing.lg }} // Para o scroll vazar pelas bordas da tela
          >
            {/* Card 1: Saldo BRL (Local) */}
            <View ref={balanceCardRef} style={styles.balanceCardSlider}>
              <View style={styles.balanceHeaderRow}>
                <Text style={styles.balanceLabel}>Saldo Local</Text>
                <View style={styles.currencyBadge}><Text style={styles.currencyBadgeText}>🇧🇷 BRL</Text></View>
              </View>
              <Text style={styles.balanceValue}>
                {balanceData?.local?.currency} {formatCurrency(balanceData?.local?.balance)}
              </Text>
              <Text style={styles.balanceCurrency}>
                Disponível para saque e pagamentos em Reais
              </Text>
            </View>

            {/* Card 2: Saldo Original / G */}
            <View style={styles.balanceCardSlider}>
              <View style={styles.balanceHeaderRow}>
                <Text style={styles.balanceLabel}>Atos2 Tokens</Text>
                <View style={styles.currencyBadge}><Text style={styles.currencyBadgeText}>💎 G</Text></View>
              </View>
              <Text style={styles.balanceValue}>
                G {formatCurrency(balanceData?.global?.balance, 4)}
              </Text>
              <Text style={styles.balanceCurrency}>
                Original: {balanceData?.original?.currency} {formatCurrency(balanceData?.original?.balance)}
              </Text>
            </View>

            {/* Card 3: Saldo Global USDC (Mock) */}
            <View style={[styles.balanceCardSlider, { backgroundColor: '#1A1C29' }]}>
              <View style={styles.balanceHeaderRow}>
                <Text style={[styles.balanceLabel, { color: '#8892B0' }]}>Dólar Digital (Global)</Text>
                <View style={[styles.currencyBadge, { backgroundColor: '#2B4A8E' }]}><Text style={[styles.currencyBadgeText, { color: '#fff' }]}>🇺🇸 USDC</Text></View>
              </View>
              <Text style={[styles.balanceValue, { color: '#fff' }]}>
                $ 0.00
              </Text>
              <TouchableOpacity style={styles.btnSmallGhost}>
                <Text style={styles.btnSmallGhostText}>+ Ativar Conta Global</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )})
      </View>
        {/* Grid de Ações Rápidas (5x1) */}
        <View style={styles.actionGridContainer}>
          <TouchableOpacity
            ref={depositBtnRef}
            style={styles.actionGridItem}
            onPress={() => {
              setDepositAmount('');
              setGeneratedPixCode('');
              setDepositStep('input');
              setDepositTab('deposit');
              setPixQrVisible(true);
            }}
          >
            <View style={styles.actionGridIcon}><Feather name="plus" size={24} color={Colors.primary} /></View>
            <Text style={styles.actionGridText}>Depositar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionGridItem}
            onPress={() => {
              setBinanceAmount('');
              setBinanceQuote(null);
              setBinanceOrder(null);
              setBinanceStep('input');
              setBinanceAsset('USDT');
              setBinanceModalVisible(true);
            }}
          >
            <View style={styles.actionGridIcon}><Feather name="trending-up" size={24} color={Colors.primary} /></View>
            <Text style={styles.actionGridText}>Comprar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionGridItem}
            onPress={() => Alert.alert('Em Breve', 'A conversão BRL ↔ USDC estará disponível em breve.')}
          >
            <View style={styles.actionGridIcon}><Feather name="refresh-cw" size={24} color={Colors.primary} /></View>
            <Text style={styles.actionGridText}>Converter</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionGridItem}
            onPress={() => {
              (historyListRef.current as any)?.scrollIntoView?.() || Alert.alert('Extrato', 'Deslize para baixo para ver seu histórico.');
            }}
          >
            <View style={styles.actionGridIcon}><Feather name="list" size={24} color={Colors.primary} /></View>
            <Text style={styles.actionGridText}>Extrato</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionGridItem}
            onPress={() => setPixPayModalVisible(true)}
          >
            <View style={styles.actionGridIcon}><Feather name="send" size={24} color={Colors.primary} /></View>
            <Text style={styles.actionGridText}>Enviar</Text>
          </TouchableOpacity>
        </View>

        {/* Meu Cartão Atos2 Widget */}
        <View style={styles.cardWidgetContainer}>
          <View style={styles.cardWidgetHeader}>
            <Text style={styles.cardWidgetTitle}>Meu Cartão Atos2</Text>
            <Feather name="more-horizontal" size={20} color={Colors.light.textMuted} />
          </View>
          <View style={styles.cardWidgetBody}>
            <View style={styles.virtualCardGraphic}>
              <View style={styles.virtualCardChip} />
              <View style={styles.virtualCardNetwork}><Text style={{ color: '#fff', fontWeight: '900', fontStyle: 'italic', fontSize: 16 }}>VISA</Text></View>
              <Text style={styles.virtualCardNumber}>•••• •••• •••• 4092</Text>
            </View>
            <View style={styles.cardWidgetActions}>
              <TouchableOpacity style={styles.cardActionBtn} onPress={() => Alert.alert('Apple Pay', 'Em breve: Integração nativa de tokenização.')}>
                <Feather name="smartphone" size={18} color={Colors.primary} />
                <Text style={styles.cardActionBtnText}>Carteira Apple/Google</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cardActionBtn}>
                <Feather name="eye" size={18} color={Colors.primary} />
                <Text style={styles.cardActionBtnText}>Cartão Virtual</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

      {/* Transactions */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Histórico</Text>
      </View>

      <View ref={historyListRef} style={{ flex: 1 }}>
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
        />
      </View>

      {/* Modal 1: Depositar via PIX — exibe QR Code e chave PIX do usuário */}
      <Modal visible={pixQrVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { alignItems: 'center' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Feather name="download" size={20} color={Colors.success} />
              <Text style={styles.modalTitle}>Depositar / Receber via PIX</Text>
            </View>

            {/* Abas: Depositar e Receber P2P */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16, borderBottomWidth: 1, borderColor: '#eee', paddingBottom: 8, width: '100%' }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 8, borderBottomWidth: depositTab === 'deposit' ? 2 : 0, borderColor: Colors.success }}
                onPress={() => setDepositTab('deposit')}
              >
                <Text style={{ textAlign: 'center', fontWeight: 'bold', color: depositTab === 'deposit' ? Colors.success : '#888' }}>
                  Depositar via Pix
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 8, borderBottomWidth: depositTab === 'receive' ? 2 : 0, borderColor: Colors.success }}
                onPress={() => setDepositTab('receive')}
              >
                <Text style={{ textAlign: 'center', fontWeight: 'bold', color: depositTab === 'receive' ? Colors.success : '#888' }}>
                  Receber P2P
                </Text>
              </TouchableOpacity>
            </View>

            {depositTab === 'deposit' ? (
              <>
                {depositStep === 'input' ? (
                  <View style={{ width: '100%', alignItems: 'center' }}>
                    <Text style={styles.modalSubtitle}>Informe o valor que deseja depositar para gerar o PIX.</Text>
                    <TextInput
                      style={[styles.inputModal, { fontSize: 24, fontWeight: '700', textAlign: 'center', marginVertical: 12 }]}
                      placeholder="R$ 0,00"
                      placeholderTextColor={Colors.light.textMuted}
                      keyboardType="numeric"
                      value={depositAmount}
                      onChangeText={setDepositAmount}
                      autoFocus
                    />
                    <TouchableOpacity
                      style={[styles.modalBtnSubmit, { backgroundColor: Colors.success, width: '100%', paddingVertical: 14, borderRadius: 10, marginTop: 8, alignItems: 'center', justifyContent: 'center' }]}
                      onPress={handleGenerateDepositPix}
                      disabled={depositLoading}
                    >
                      {depositLoading ? <ActivityIndicator color="#fff" /> : (
                        <Text style={styles.modalBtnSubmitText}>Gerar Pix de Depósito</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ width: '100%', alignItems: 'center' }}>
                    <Text style={styles.modalSubtitle}>Efetue o pagamento do PIX abaixo para adicionar saldo à sua carteira.</Text>
                    <View style={{ padding: 20, backgroundColor: '#fff', borderRadius: 12, marginBottom: 16 }}>
                      {generatedPixCode ? (
                        <QRCode
                          value={generatedPixCode}
                          size={190}
                        />
                      ) : <ActivityIndicator color={Colors.primary} />}
                    </View>
                    <TouchableOpacity
                      style={{
                        backgroundColor: Colors.success + '10', borderRadius: 10, padding: 12, width: '100%',
                        borderWidth: 1, borderColor: Colors.success + '40', alignItems: 'center', marginBottom: 16
                      }}
                      onPress={() => {
                        if (generatedPixCode) { Clipboard.setStringAsync(generatedPixCode); Alert.alert('Copiado!', 'Código PIX copiado.'); }
                      }}
                    >
                      <Text numberOfLines={1} ellipsizeMode="middle" style={{ color: Colors.success, fontWeight: '700', fontSize: 13, width: '90%', textAlign: 'center' }}>
                        {generatedPixCode}
                      </Text>
                      <Text style={{ color: Colors.light.textMuted, fontSize: 11, marginTop: 4 }}>📋 Toque para copiar o código copia e cola</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalBtnCancel, { width: '100%', marginBottom: 8 }]}
                      onPress={() => setDepositStep('input')}
                    >
                      <Text style={[styles.modalBtnText, { textAlign: 'center' }]}>Voltar</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              <>
                <Text style={styles.modalSubtitle}>Mostre o QR Code abaixo ou compartilhe sua chave PIX para receber pagamentos.</Text>

                {/* Seletor de tipo de chave PIX */}
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                  {(['email', 'phone', 'cpf'] as const).map(k => (
                    <TouchableOpacity
                      key={k}
                      style={[{
                        paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
                        borderColor: pixKeyType === k ? Colors.success : Colors.light.border,
                        backgroundColor: pixKeyType === k ? Colors.success + '15' : 'transparent'
                      }]}
                      onPress={() => setPixKeyType(k)}
                    >
                      <Text style={{ color: pixKeyType === k ? Colors.success : Colors.light.textMuted, fontSize: 12, fontWeight: '600' }}>
                        {k === 'email' ? 'E-mail' : k === 'phone' ? 'Telefone' : 'CPF/CNPJ'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* QR Code */}
                <View style={{ padding: 20, backgroundColor: '#fff', borderRadius: 12, marginBottom: 16 }}>
                  {user?.id ? (
                    <QRCode
                      value={pixKeyType === 'email' ? (user?.email || user?.id) :
                        pixKeyType === 'phone' ? (user?.phone || user?.id) : (user?.id)}
                      size={190}
                    />
                  ) : <ActivityIndicator color={Colors.primary} />}
                </View>

                {/* Chave copiavel */}
                <TouchableOpacity
                  style={{
                    backgroundColor: Colors.success + '10', borderRadius: 10, padding: 12, width: '100%',
                    borderWidth: 1, borderColor: Colors.success + '40', alignItems: 'center', marginBottom: 16
                  }}
                  onPress={() => {
                    const key = pixKeyType === 'email' ? user?.email : pixKeyType === 'phone' ? user?.phone : user?.id;
                    if (key) { Clipboard.setStringAsync(key); Alert.alert('Copiado!', 'Chave PIX copiada.'); }
                  }}
                >
                  <Text style={{ color: Colors.success, fontWeight: '700', fontSize: 13 }}>
                    {pixKeyType === 'email' ? user?.email : pixKeyType === 'phone' ? user?.phone : user?.id}
                  </Text>
                  <Text style={{ color: Colors.light.textMuted, fontSize: 11, marginTop: 4 }}>📋 Toque para copiar a chave</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity style={[styles.modalBtnCancel, { width: '100%' }]} onPress={() => setPixQrVisible(false)}>
              <Text style={[styles.modalBtnText, { textAlign: 'center' }]}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Binance: Comprar Cripto */}
      <Modal visible={binanceModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, justifyContent: 'center' }}>
              <Feather name="trending-up" size={20} color={Colors.primary} />
              <Text style={styles.modalTitle}>Comprar com Binance</Text>
            </View>

            {binanceStep === 'input' ? (
              <View style={{ width: '100%' }}>
                <Text style={{ color: Colors.light.textSecondary, fontSize: 13, marginBottom: 8, fontWeight: '600' }}>Criptoativo a Comprar</Text>
                <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                  <View
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 8,
                      borderWidth: 1.5,
                      borderColor: Colors.primary,
                      backgroundColor: Colors.primary + '10',
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 8
                    }}
                  >
                    <Text style={{ color: Colors.primary, fontWeight: '800', fontSize: 14 }}>
                      🇺🇸 USDC (USD Coin)
                    </Text>
                  </View>
                </View>

                <Text style={{ color: Colors.light.textSecondary, fontSize: 13, marginBottom: 8, fontWeight: '600' }}>Valor a Comprar (BRL)</Text>
                <TextInput
                  style={[styles.inputModal, { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 8 }]}
                  placeholder="R$ 0,00"
                  placeholderTextColor={Colors.light.textMuted}
                  keyboardType="numeric"
                  value={binanceAmount}
                  onChangeText={setBinanceAmount}
                  autoFocus
                />

                {/* Quote Display Area */}
                <View style={{ minHeight: 64, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                  {fetchingQuote ? (
                    <ActivityIndicator color={Colors.primary} size="small" />
                  ) : binanceQuote ? (
                    <View style={{ backgroundColor: Colors.light.surfaceLight, padding: 10, borderRadius: 8, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: Colors.light.border }}>
                      <Text style={{ fontSize: 12, color: Colors.light.textSecondary }}>
                        Estimativa de Recebimento:
                      </Text>
                      <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.success, marginTop: 2 }}>
                        {binanceQuote.estimatedCrypto.toFixed(binanceAsset === 'USDT' || binanceAsset === 'USDC' ? 2 : 6)} {binanceAsset}
                      </Text>
                      <Text style={{ fontSize: 11, color: Colors.light.textMuted, marginTop: 4 }}>
                        Taxa: 1 {binanceAsset} ≈ R$ {formatCurrency(binanceQuote.rate, 2)}
                      </Text>
                    </View>
                  ) : (
                    <Text style={{ color: Colors.light.textMuted, fontSize: 12, textAlign: 'center' }}>
                      Digite o valor para ver a estimativa da cotação.
                    </Text>
                  )}
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setBinanceModalVisible(false)}>
                    <Text style={styles.modalBtnText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtnSubmit, { backgroundColor: Colors.primary }]}
                    onPress={handleGenerateBinanceOrder}
                    disabled={binanceLoading || !binanceAmount || parseFloat(binanceAmount) <= 0}
                  >
                    {binanceLoading ? <ActivityIndicator color="#fff" /> : (
                      <Text style={styles.modalBtnSubmitText}>Gerar Pedido</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={{ width: '100%', alignItems: 'center' }}>
                <View style={{ backgroundColor: Colors.success + '15', padding: 12, borderRadius: 30, marginBottom: 12 }}>
                  <Feather name="check-circle" size={32} color={Colors.success} />
                </View>
                <Text style={{ color: Colors.light.text, fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 4 }}>
                  Pedido Gerado!
                </Text>
                <Text style={{ color: Colors.light.textSecondary, fontSize: 12, textAlign: 'center', marginBottom: 16 }}>
                  Aguardando pagamento via checkout Binance Pay.
                </Text>

                <View style={{ backgroundColor: Colors.light.surfaceLight, padding: 16, borderRadius: 10, width: '100%', marginBottom: 16, borderWidth: 1, borderColor: Colors.light.border }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ color: Colors.light.textMuted, fontSize: 12 }}>ID do Pedido:</Text>
                    <Text style={{ color: Colors.light.text, fontSize: 12, fontWeight: '600' }}>{binanceOrder?.orderId}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ color: Colors.light.textMuted, fontSize: 12 }}>Valor a Pagar:</Text>
                    <Text style={{ color: Colors.light.text, fontSize: 12, fontWeight: '600' }}>R$ {formatCurrency(binanceOrder?.amount)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: Colors.light.textMuted, fontSize: 12 }}>Total Estimado:</Text>
                    <Text style={{ color: Colors.success, fontSize: 12, fontWeight: '700' }}>
                      {binanceOrder?.cryptoAmount.toFixed(binanceAsset === 'USDT' || binanceAsset === 'USDC' ? 2 : 6)} {binanceOrder?.cryptoAsset}
                    </Text>
                  </View>
                </View>

                {binanceOrder?.payUrl && (
                  <View style={{ padding: 16, backgroundColor: '#fff', borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#eee' }}>
                    <QRCode
                      value={binanceOrder.payUrl}
                      size={140}
                    />
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.modalBtnSubmit, { backgroundColor: Colors.primary, width: '100%', paddingVertical: 14, borderRadius: 10, marginBottom: 8, flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center' }]}
                  onPress={() => {
                    if (binanceOrder?.payUrl) {
                      Linking.openURL(binanceOrder.payUrl);
                    }
                  }}
                >
                  <Feather name="external-link" size={16} color="#fff" />
                  <Text style={styles.modalBtnSubmitText}>Ir para o Checkout</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    backgroundColor: Colors.light.surfaceLight, borderRadius: 8, padding: 10, width: '100%',
                    borderWidth: 1, borderColor: Colors.light.border, alignItems: 'center', marginBottom: 16
                  }}
                  onPress={() => {
                    if (binanceOrder?.payUrl) {
                      Clipboard.setStringAsync(binanceOrder.payUrl);
                      Alert.alert('Copiado!', 'Link de checkout copiado.');
                    }
                  }}
                >
                  <Text style={{ color: Colors.light.textSecondary, fontWeight: '600', fontSize: 12 }}>📋 Copiar Link de Checkout</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtnCancel, { width: '100%' }]}
                  onPress={() => setBinanceModalVisible(false)}
                >
                  <Text style={[styles.modalBtnText, { textAlign: 'center' }]}>Concluir</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Scanner Modal */}
      <Modal visible={scannerVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={{ flex: 1, width: '100%', height: '100%' }}>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              onBarcodeScanned={scannerVisible ? handleBarcodeScanned : undefined}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            />
            <View style={{ flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end', padding: 40 }}>
              <TouchableOpacity style={[styles.modalBtnCancel, { backgroundColor: 'rgba(0,0,0,0.8)' }]} onPress={() => setScannerVisible(false)}>
                <Text style={[styles.modalBtnText, { color: '#fff', textAlign: 'center' }]}>Cancelar Câmera</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal 4: PIX externo (escanear QR de pessoa fora do Atos2) */}
      <Modal visible={pixPayModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Feather name="send" size={20} color={Colors.warning} />
              <Text style={styles.modalTitle}>Pagar via PIX</Text>
            </View>
            <Text style={styles.modalSubtitle}>Confirme os dados antes de enviar o pagamento.</Text>

            {/* Chave PIX ou QR */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md }}>
              <TextInput
                style={[styles.inputModal, { flex: 1, marginBottom: 0 }]}
                placeholder="Chave PIX ou QR Copia/Cola"
                placeholderTextColor={Colors.light.textMuted}
                value={pixPayTarget}
                onChangeText={setPixPayTarget}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={{
                  backgroundColor: Colors.warning + '15',
                  padding: Spacing.md,
                  borderRadius: BorderRadius.sm,
                  borderWidth: 1,
                  borderColor: Colors.warning + '40',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
                onPress={() => {
                  setPixPayModalVisible(false);
                  openScanner();
                }}
              >
                <Feather name="camera" size={20} color={Colors.warning} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.inputModal}
              placeholder="Valor a enviar (ex: 50,00)"
              placeholderTextColor={Colors.light.textMuted}
              keyboardType="numeric"
              value={pixPayAmount}
              onChangeText={setPixPayAmount}
            />

            {pixPayAmount ? (
              <View style={{ backgroundColor: Colors.warning + '15', padding: 10, borderRadius: 8, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="info" size={16} color={Colors.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: Colors.warning, fontWeight: '600' }}>
                    Taxa de Saque PIX: R$ {ATOS2_FEES.PIX_WITHDRAWAL.toFixed(2).replace('.', ',')}
                  </Text>
                  <Text style={{ fontSize: 10, color: Colors.light.textMuted, marginTop: 2 }}>
                    Total debitado: R$ {((parseFloat(pixPayAmount.replace(',', '.')) || 0) + ATOS2_FEES.PIX_WITHDRAWAL).toFixed(2).replace('.', ',')}
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setPixPayModalVisible(false)} disabled={pixPayLoading}>
                <Text style={styles.modalBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtnSubmit, { backgroundColor: Colors.warning }]} onPress={handlePixPayExternal} disabled={pixPayLoading}>
                {pixPayLoading ? <ActivityIndicator color="#fff" /> : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Feather name="send" size={16} color="#fff" />
                    <Text style={styles.modalBtnSubmitText}>Enviar PIX</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Transaction Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior="padding" style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nova Movimentação</Text>
            <Text style={styles.modalSubtitle}>Sua operação será liquidada na Moeda Local ({balanceData?.local?.currency})</Text>

            <TextInput
              style={styles.inputModal}
              placeholder="UUID de Destino (Opcional)"
              placeholderTextColor={Colors.light.textMuted}
              value={txTarget}
              onChangeText={setTxTarget}
            />

            {fetchingRecipient && (
              <ActivityIndicator color={Colors.primary} style={{ marginVertical: 8 }} />
            )}

            {!fetchingRecipient && recipientInfo && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: Colors.light.background,
                padding: Spacing.md,
                borderRadius: BorderRadius.md,
                borderWidth: 1,
                borderColor: Colors.light.border,
                marginBottom: Spacing.md,
                gap: Spacing.md,
                width: '100%'
              }}>
                {recipientInfo.profileImage ? (
                  <CachedImage
                    url={recipientInfo.profileImage.startsWith('http') ? recipientInfo.profileImage : `${SERVER_URL}${recipientInfo.profileImage}`}
                    style={{ width: 44, height: 44, borderRadius: 22 }}
                  />
                ) : (
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>{recipientInfo.name?.charAt(0).toUpperCase() || '?'}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: Colors.light.text }}>{recipientInfo.name}</Text>
                  <Text style={{ fontSize: FontSize.xs, color: Colors.light.textMuted }}>@{recipientInfo.nickname}</Text>
                </View>
              </View>
            )}

            {!fetchingRecipient && txTarget && txTarget.trim().length === 36 && !recipientInfo && (
              <Text style={{ color: Colors.error, fontSize: FontSize.xs, marginBottom: Spacing.md, textAlign: 'center', width: '100%' }}>
                ⚠️ Destinatário não encontrado.
              </Text>
            )}

            <TextInput
              style={styles.inputModal}
              placeholder="Valor Local a Transferir"
              placeholderTextColor={Colors.light.textMuted}
              keyboardType="decimal-pad"
              value={txAmount}
              onChangeText={setTxAmount}
            />

            <TextInput
              style={styles.inputModal}
              placeholder="🔒 Senha de Segurança"
              placeholderTextColor={Colors.light.textMuted}
              secureTextEntry
              value={txPassword}
              onChangeText={setTxPassword}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalVisible(false)} disabled={txLoading}>
                <Text style={styles.modalBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSubmit} onPress={handleTransaction} disabled={txLoading}>
                {txLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnSubmitText}>Confirmar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Receipt Modal */}
      <Modal visible={!!selectedTx} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: Colors.light.surface }]}>
            {selectedTx && (
              <>
                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                  <View style={[styles.transactionIcon, { backgroundColor: typeLabels[selectedTx.type].color + '20', width: 60, height: 60, borderRadius: 30, marginBottom: 10 }]}>
                    <Feather name={typeLabels[selectedTx.type].icon} size={30} color={typeLabels[selectedTx.type].color} />
                  </View>
                  <Text style={styles.modalTitle}>Comprovante</Text>
                  <Text style={[styles.transactionAmount, { fontSize: 24, marginVertical: 10, color: selectedTx.amount >= 0 ? Colors.success : Colors.error }]}>
                    {selectedTx.amount >= 0 ? '+' : ''}{selectedTx.currency} {formatCurrency(Math.abs(selectedTx.amount))}
                  </Text>
                </View>

                <View style={{ backgroundColor: Colors.light.background, padding: 15, borderRadius: 10, marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                    <Text style={{ color: Colors.light.textMuted }}>Tipo de Operação</Text>
                    <Text style={{ color: Colors.light.text, fontWeight: 'bold' }}>{typeLabels[selectedTx.type].label}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                    <Text style={{ color: Colors.light.textMuted }}>Data da Operação</Text>
                    <Text style={{ color: Colors.light.text }}>{new Date(selectedTx.created_at).toLocaleString('pt-BR')}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                    <Text style={{ color: Colors.light.textMuted }}>Status</Text>
                    <Text style={{ color: selectedTx.status === 'COMPLETED' ? Colors.success : Colors.warning, fontWeight: 'bold' }}>{selectedTx.status}</Text>
                  </View>
                  {selectedTx.description && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                      <Text style={{ color: Colors.light.textMuted }}>Descrição</Text>
                      <Text style={{ color: Colors.light.text }}>{selectedTx.description}</Text>
                    </View>
                  )}
                  <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: Colors.light.border }}>
                    <Text style={{ color: Colors.light.textMuted, fontSize: 12 }}>ID da Transação</Text>
                    <Text style={{ color: Colors.light.textSecondary, fontSize: 10, marginTop: 4 }}>{selectedTx.id}</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setSelectedTx(null)}>
                  <Text style={styles.modalBtnText}>Fechar Comprovante</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      <TapToPayModal
        visible={tapToPayVisible}
        onClose={() => setTapToPayVisible(false)}
        amount={tapToPayAmountCents}
        onSuccess={() => {
          setChargeAmount('');
          loadData();
        }}
      />

      {/* Coach Marks */}
      <CoachMark
        visible={coachVisible}
        onComplete={async () => { setCoachVisible(false); await markCoachDone('wallet'); }}
        steps={[
          {
            targetRef: balanceCardRef,
            title: 'Seu Saldo Atos2',
            description: 'Acompanhe seu saldo em moeda local (R$), a moeda original da sua carteira e a moeda global (GLB) para transações internacionais.',
            tooltipPosition: 'bottom',
          },
          {
            targetRef: depositBtnRef,
            title: 'Depositar via PIX',
            description: 'Gere um código PIX ou QR Code dinâmico para carregar saldo em sua carteira com facilidade.',
            tooltipPosition: 'bottom',
          },
          {
            targetRef: transferBtnRef,
            title: 'Transferir GLBs',
            description: 'Envie saldo para qualquer usuário do Atos2 instantaneamente usando seu nome de usuário ou e-mail.',
            tooltipPosition: 'bottom',
          },
          {
            targetRef: historyListRef,
            title: 'Histórico de Transações',
            description: 'Monitore todos os depósitos, saques, transferências e pagamentos realizados. Toque em qualquer item para ver o comprovante.',
            tooltipPosition: 'top',
          },
        ]}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  balanceCardSlider: {
    width: Dimensions.get('window').width - Spacing.lg * 2,
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  balanceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  balanceLabel: {
    color: Colors.light.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currencyBadge: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currencyBadgeText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '900',
  },
  balanceValue: {
    color: Colors.light.text,
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1,
  },
  balanceCurrency: {
    color: Colors.light.textMuted,
    fontSize: FontSize.xs,
    marginTop: 6,
  },
  btnSmallGhost: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
  },
  btnSmallGhostText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  actionGridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  actionGridItem: {
    alignItems: 'center',
    width: (Dimensions.get('window').width - Spacing.lg * 2) / 5,
  },
  actionGridIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.light.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  actionGridText: {
    color: Colors.light.text,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  cardWidgetContainer: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  cardWidgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardWidgetTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.light.text,
  },
  cardWidgetBody: {
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  virtualCardGraphic: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    height: 90,
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
  },
  virtualCardChip: {
    width: 32,
    height: 22,
    backgroundColor: '#FFD700',
    borderRadius: 4,
    opacity: 0.8,
  },
  virtualCardNetwork: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  virtualCardNumber: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 2,
  },
  cardWidgetActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  cardActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: Colors.light.surfaceLight,
    borderRadius: 8,
  },
  cardActionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: Colors.light.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  actionLabel: {
    color: Colors.light.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  actionSublabel: {
    color: Colors.light.textMuted,
    fontSize: 10,
    fontWeight: '500',
  },
  sectionHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.light.text,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  listContent: { paddingHorizontal: Spacing.md, gap: Spacing.xs },
  transactionItem: {
    flexDirection: 'row',
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionInfo: { flex: 1 },
  transactionDesc: {
    color: Colors.light.text,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  transactionDate: {
    color: Colors.light.textMuted,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center'
  },
  modalContent: {
    width: '85%', backgroundColor: Colors.light.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.light.border
  },
  modalTitle: {
    color: Colors.light.text, fontSize: FontSize.lg, fontWeight: '700', textAlign: 'center'
  },
  modalSubtitle: {
    color: Colors.primary, fontSize: FontSize.xs, textAlign: 'center', marginBottom: Spacing.lg
  },
  inputModal: {
    backgroundColor: Colors.light.surfaceLight, borderRadius: BorderRadius.sm, padding: Spacing.md,
    color: Colors.light.text, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.light.border,
    marginBottom: Spacing.md
  },
  modalActions: {
    flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xs
  },
  modalBtnCancel: {
    flex: 1, padding: Spacing.md, borderRadius: BorderRadius.sm, alignItems: 'center',
    backgroundColor: Colors.light.surfaceLight, borderWidth: 1, borderColor: Colors.light.border
  },
  modalBtnText: {
    color: Colors.light.textSecondary, fontWeight: '600'
  },
  modalBtnSubmit: {
    flex: 1, padding: Spacing.md, borderRadius: BorderRadius.sm, alignItems: 'center',
    backgroundColor: Colors.primary
  },
  modalBtnSubmitText: {
    color: '#fff', fontWeight: '700'
  },
  // Wallet Lock Screen styles
  walletLockWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  walletLockIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primary + '18',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.primary + '40',
  },
  walletLockTitle: {
    color: Colors.light.text,
    fontSize: FontSize.xl,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  walletLockSubtitle: {
    color: Colors.light.textSecondary,
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  walletLockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    width: '100%',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  walletLockBtnText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});
