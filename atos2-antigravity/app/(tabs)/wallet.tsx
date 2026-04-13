import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, Modal, TextInput, ActivityIndicator, RefreshControl, KeyboardAvoidingView, Platform
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useStripe } from '@stripe/stripe-react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useBiometric } from '../../contexts/BiometricContext';
import { getBalance, getTransactionHistory, createTransaction, WalletBalanceResponse } from '../../services/wallet';
import api from '../../services/api';

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

  // Guarda de segurança — começa bloqueada a cada vez que a tela monta
  const [walletUnlocked, setWalletUnlocked] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [showUnlockPassword, setShowUnlockPassword] = useState(false);

  useEffect(() => {
    // Reset da trava sempre que a tela é (re)montada
    setWalletUnlocked(false);
    setShowUnlockPassword(false);
    setUnlockPassword('');
  }, []);

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

  const [balanceData, setBalanceData] = useState<WalletBalanceResponse | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // QR Code State
  const [permission, requestPermission] = useCameraPermissions();
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [txTarget, setTxTarget] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txPassword, setTxPassword] = useState('');
  const [txLoading, setTxLoading] = useState(false);

  // Deposit State
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [pixData, setPixData] = useState<any>(null);
  const [depositLoading, setDepositLoading] = useState(false);

  // Receipt State
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const loadData = async () => {
    try {
      const [bal, hist] = await Promise.all([getBalance(), getTransactionHistory()]);
      setBalanceData(bal);
      // O endpoint do backend pode retornar { success: true, data: [...] }
      setTransactions(Array.isArray(hist) ? hist : (hist as any).data || []);
    } catch (e: any) {
      console.error(e);
      Alert.alert('Erro', e?.response?.data?.error || 'Não foi possível carregar a carteira');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDepositStripe = async (mode: 'deposit' | 'charge' = 'deposit') => {
    if (!depositAmount || parseFloat(depositAmount.replace(',', '.')) <= 0) {
      return Alert.alert('Atenção', 'Informe um valor válido.');
    }
    setDepositLoading(true);
    try {
      const amountCents = Math.round(parseFloat(depositAmount.replace(',', '.')) * 100);
      const { data } = await api.post('/stripe/create_intent', { amount: amountCents });

      if (!data.client_secret) throw new Error('Credenciais de cobrança inválidas');

      const initResponse = await initPaymentSheet({
        merchantDisplayName: 'Atos2 Pay',
        paymentIntentClientSecret: data.client_secret,
        returnURL: 'atos2://stripe-redirect',
        style: 'alwaysDark'
      });
      
      if (initResponse.error) return Alert.alert('Erro', initResponse.error.message);

      setDepositModalVisible(false);

      const presentResponse = await presentPaymentSheet();
      
      if (presentResponse.error) {
         if (presentResponse.error.code !== 'Canceled') {
            Alert.alert('Aviso', presentResponse.error.message);
         }
      } else {
         const sucessoMsg = mode === 'charge' 
            ? 'Cobrança efetuada! O valor já foi creditado na sua carteira G.'
            : 'Depósito concluído via Stripe PIX / Aproximação.';
         Alert.alert('Sucesso 🎉', sucessoMsg);
         setDepositAmount('');
         loadData();
      }
    } catch (e: any) {
      Alert.alert('Falha Segura', e?.response?.data?.error || e.message || 'Erro no Gateway');
    } finally {
      setDepositLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

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
      const targetId = data.split('targetId=')[1].split('&')[0];
      if (targetId) {
        setTxTarget(targetId);
        setModalVisible(true); // Abre o modal de transferência automaticamente
      }
    } else {
      Alert.alert('QR Code Inválido', 'Este QR code não é da rede Atos2.');
    }
  };

  const handleTransaction = async () => {
    if (!txAmount || !txPassword) return Alert.alert('Atenção', 'Valor e senha são obrigatórios.');

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
          {item.amount >= 0 ? '+' : ''}{item.currency} {Number(Math.abs(item.amount)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
      </TouchableOpacity>
    );
  };

  const formatCurrency = (value: number | undefined | null, decimals: number = 2) => {
    if (value == null) return '0,00';
    return Number(value).toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  return (
    <View style={styles.container}>
      {/* Balance Card */}
      <View style={styles.balanceCard}>
        {loading ? <ActivityIndicator color={Colors.primary} /> : (
          <>
            <Text style={styles.balanceLabel}>Saldo Local</Text>
            <Text style={styles.balanceValue}>
              {balanceData?.local?.currency} {formatCurrency(balanceData?.local?.balance)}
            </Text>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 4}}>
              <Text style={styles.balanceCurrency}>
                Original: {balanceData?.original?.currency} {formatCurrency(balanceData?.original?.balance)}
              </Text>
              <Text style={styles.balanceCurrency}>
                Global: G {formatCurrency(balanceData?.global?.balance, 4)}
              </Text>
            </View>
          </>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => { setDepositAmount(''); setDepositModalVisible(true); }}
          >
            <Feather name="arrow-down" size={24} color={Colors.light.textSecondary} />
            <Text style={styles.actionLabel}>Depositar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => { setDepositAmount(''); setDepositModalVisible(true); }} // Abre modal que possui opção de cobrar
          >
            <Feather name="dollar-sign" size={24} color={Colors.light.textSecondary} />
            <Text style={styles.actionLabel}>Cobrar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setModalVisible(true)}
          >
            <Feather name="arrow-up-right" size={24} color={Colors.light.textSecondary} />
            <Text style={styles.actionLabel}>Transferir</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={openScanner}
          >
            <Feather name="camera" size={24} color={Colors.light.textSecondary} />
            <Text style={styles.actionLabel}>Ler QR</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Transactions */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Histórico</Text>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
      />

      {/* Recieve (Generate QR) Modal */}
      <Modal visible={qrModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {alignItems: 'center'}]}>
            <Text style={styles.modalTitle}>Meu QR Code</Text>
            <Text style={styles.modalSubtitle}>Mostre este código para receber um pagamento na sua carteira Atos2.</Text>
            <View style={{padding: 20, backgroundColor: '#fff', borderRadius: 10, marginVertical: 20}}>
              {user?.id ? (
                <QRCode value={`atos2://pay?targetId=${user.id}`} size={200} />
              ) : (
                <Text>Carregando conta...</Text>
              )}
            </View>
            <TouchableOpacity style={[styles.modalBtnCancel, { width: '80%' }]} onPress={() => setQrModalVisible(false)}>
              <Text style={[styles.modalBtnText, {textAlign: 'center'}]}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
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
              <View style={{ flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end', padding: 40}}>
                 <TouchableOpacity style={[styles.modalBtnCancel, {backgroundColor: 'rgba(0,0,0,0.8)'}]} onPress={() => setScannerVisible(false)}>
                    <Text style={[styles.modalBtnText, {color: '#fff', textAlign: 'center'}]}>Cancelar Câmera</Text>
                 </TouchableOpacity>
              </View>
           </View>
        </View>
      </Modal>

      {/* Stripe Deposit / Charge Modal */}
      <Modal visible={depositModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Stripe Gateway</Text>
            <Text style={{marginBottom: 16, color: Colors.light.textSecondary, textAlign: 'center'}}>
              Digite o valor para gerar a cobrança unificada (PIX / NFC). O valor cairá instantaneamente em sua carteira {balanceData?.local?.currency}.
            </Text>

            <TextInput
              style={styles.inputModal}
              placeholder="0,00"
              placeholderTextColor={Colors.light.textMuted}
              keyboardType="numeric"
              value={depositAmount}
              onChangeText={setDepositAmount}
            />

            <View style={{flexDirection: 'column', gap: 10, marginTop: 16}}>
               <TouchableOpacity style={[styles.modalBtnSubmit, {backgroundColor: '#6366f1'}]} onPress={() => handleDepositStripe('charge')} disabled={depositLoading}>
                 {depositLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnSubmitText}>Cobrar de um Cliente</Text>}
               </TouchableOpacity>

               <TouchableOpacity style={styles.modalBtnSubmit} onPress={() => handleDepositStripe('deposit')} disabled={depositLoading}>
                 {depositLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnSubmitText}>Depositar p/ Mim Mesmo</Text>}
               </TouchableOpacity>
               
               <TouchableOpacity style={[styles.modalBtnCancel, {marginTop: 6}]} onPress={() => { setDepositModalVisible(false); loadData(); }} disabled={depositLoading}>
                 <Text style={styles.modalBtnText}>Cancelar</Text>
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
                <View style={{alignItems: 'center', marginBottom: 20}}>
                  <View style={[styles.transactionIcon, { backgroundColor: typeLabels[selectedTx.type].color + '20', width: 60, height: 60, borderRadius: 30, marginBottom: 10 }]}>
                    <Feather name={typeLabels[selectedTx.type].icon} size={30} color={typeLabels[selectedTx.type].color} />
                  </View>
                  <Text style={styles.modalTitle}>Comprovante</Text>
                  <Text style={[styles.transactionAmount, { fontSize: 24, marginVertical: 10, color: selectedTx.amount >= 0 ? Colors.success : Colors.error }]}>
                    {selectedTx.amount >= 0 ? '+' : ''}{selectedTx.currency} {Number(Math.abs(selectedTx.amount)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>

                <View style={{ backgroundColor: Colors.light.background, padding: 15, borderRadius: 10, marginBottom: 20 }}>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10}}>
                    <Text style={{color: Colors.light.textMuted}}>Tipo de Operação</Text>
                    <Text style={{color: Colors.light.text, fontWeight: 'bold'}}>{typeLabels[selectedTx.type].label}</Text>
                  </View>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10}}>
                    <Text style={{color: Colors.light.textMuted}}>Data da Operação</Text>
                    <Text style={{color: Colors.light.text}}>{new Date(selectedTx.created_at).toLocaleString('pt-BR')}</Text>
                  </View>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10}}>
                    <Text style={{color: Colors.light.textMuted}}>Status</Text>
                    <Text style={{color: selectedTx.status === 'COMPLETED' ? Colors.success : Colors.warning, fontWeight: 'bold'}}>{selectedTx.status}</Text>
                  </View>
                  {selectedTx.description && (
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10}}>
                    <Text style={{color: Colors.light.textMuted}}>Descrição</Text>
                    <Text style={{color: Colors.light.text}}>{selectedTx.description}</Text>
                  </View>
                  )}
                  <View style={{marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: Colors.light.border}}>
                    <Text style={{color: Colors.light.textMuted, fontSize: 12}}>ID da Transação</Text>
                    <Text style={{color: Colors.light.textSecondary, fontSize: 10, marginTop: 4}}>{selectedTx.id}</Text>
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

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  balanceCard: {
    margin: Spacing.md,
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  balanceLabel: {
    color: Colors.light.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  balanceValue: {
    color: Colors.light.text,
    fontSize: 36,
    fontWeight: '800',
    marginTop: Spacing.xs,
  },
  balanceCurrency: {
    color: Colors.light.textMuted,
    fontSize: FontSize.xs,
    marginTop: 2,
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
    fontWeight: '600',
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
