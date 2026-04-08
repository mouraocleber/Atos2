import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, Modal, TextInput, ActivityIndicator, RefreshControl, KeyboardAvoidingView
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { getBalance, getTransactionHistory, createTransaction, WalletBalanceResponse } from '../../services/wallet';
import { api } from '../../services/api';

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

  const handleDepositPix = async () => {
    if (!depositAmount || parseFloat(depositAmount.replace(',', '.')) <= 0) {
      return Alert.alert('Atenção', 'Informe um valor válido.');
    }
    setDepositLoading(true);
    try {
      const resp = await api.post('/payments/deposit/pix', { amount: parseFloat(depositAmount.replace(',', '.')) });
      setPixData(resp.data.data.pix);
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.error || 'Falha ao gerar o código PIX.');
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
            onPress={() => { setPixData(null); setDepositModalVisible(true); }}
          >
            <Feather name="arrow-down" size={24} color={Colors.dark.textSecondary} />
            <Text style={styles.actionLabel}>Depositar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setModalVisible(true)}
          >
            <Feather name="arrow-up-right" size={24} color={Colors.dark.textSecondary} />
            <Text style={styles.actionLabel}>Transferir</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setModalVisible(true)}
          >
            <Feather name="credit-card" size={24} color={Colors.dark.textSecondary} />
            <Text style={styles.actionLabel}>Pagar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={openScanner}
          >
            <Feather name="camera" size={24} color={Colors.dark.textSecondary} />
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

      {/* Deposit PIX Modal */}
      <Modal visible={depositModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior="padding" style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Depositar via PIX</Text>
            
            {!pixData ? (
              <>
                <Text style={styles.modalSubtitle}>Adicione saldo instantâneo à sua carteira (Em BRL)</Text>
                <TextInput
                  style={styles.inputModal}
                  placeholder="Valor (Ex: 50.00)"
                  placeholderTextColor={Colors.dark.textMuted}
                  keyboardType="decimal-pad"
                  value={depositAmount}
                  onChangeText={setDepositAmount}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setDepositModalVisible(false)}>
                    <Text style={styles.modalBtnText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalBtnSubmit} onPress={handleDepositPix} disabled={depositLoading}>
                    {depositLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnSubmitText}>Gerar Pix</Text>}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.modalSubtitle}>Escaneie ou copie o código Pix abaixo:</Text>
                
                <View style={{padding: 20, backgroundColor: '#fff', borderRadius: 10, marginVertical: 10, alignSelf: 'center'}}>
                  <QRCode value={pixData.qr_code} size={150} />
                </View>

                <TouchableOpacity 
                  style={[styles.modalBtnSubmit, { marginBottom: Spacing.md, backgroundColor: Colors.info }]} 
                  onPress={async () => {
                    await Clipboard.setStringAsync(pixData.qr_code);
                    Alert.alert('Copiado', 'Pix Copia e Cola salvo na área de transferência!');
                  }}
                >
                  <Text style={styles.modalBtnSubmitText}>📋 Copiar Pix Copia e Cola</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalBtnCancel} onPress={() => { setDepositModalVisible(false); loadData(); }}>
                  <Text style={styles.modalBtnText}>Fechar</Text>
                </TouchableOpacity>
              </>
            )}
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
              placeholderTextColor={Colors.dark.textMuted}
              value={txTarget}
              onChangeText={setTxTarget}
            />
            
            <TextInput
              style={styles.inputModal}
              placeholder="Valor Local a Transferir"
              placeholderTextColor={Colors.dark.textMuted}
              keyboardType="decimal-pad"
              value={txAmount}
              onChangeText={setTxAmount}
            />
            
            <TextInput
              style={styles.inputModal}
              placeholder="🔒 Senha de Segurança"
              placeholderTextColor={Colors.dark.textMuted}
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
          <View style={[styles.modalContent, { backgroundColor: Colors.dark.surface }]}>
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

                <View style={{ backgroundColor: Colors.dark.background, padding: 15, borderRadius: 10, marginBottom: 20 }}>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10}}>
                    <Text style={{color: Colors.dark.textMuted}}>Tipo de Operação</Text>
                    <Text style={{color: Colors.dark.textPrimary, fontWeight: 'bold'}}>{typeLabels[selectedTx.type].label}</Text>
                  </View>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10}}>
                    <Text style={{color: Colors.dark.textMuted}}>Data da Operação</Text>
                    <Text style={{color: Colors.dark.textPrimary}}>{new Date(selectedTx.created_at).toLocaleString('pt-BR')}</Text>
                  </View>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10}}>
                    <Text style={{color: Colors.dark.textMuted}}>Status</Text>
                    <Text style={{color: selectedTx.status === 'COMPLETED' ? Colors.success : Colors.warning, fontWeight: 'bold'}}>{selectedTx.status}</Text>
                  </View>
                  {selectedTx.description && (
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10}}>
                    <Text style={{color: Colors.dark.textMuted}}>Descrição</Text>
                    <Text style={{color: Colors.dark.textPrimary}}>{selectedTx.description}</Text>
                  </View>
                  )}
                  <View style={{marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: Colors.dark.border}}>
                    <Text style={{color: Colors.dark.textMuted, fontSize: 12}}>ID da Transação</Text>
                    <Text style={{color: Colors.dark.textSecondary, fontSize: 10, marginTop: 4}}>{selectedTx.id}</Text>
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
  container: { flex: 1, backgroundColor: Colors.dark.background },
  balanceCard: {
    margin: Spacing.md,
    backgroundColor: Colors.dark.surface,
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
    color: Colors.dark.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  balanceValue: {
    color: Colors.dark.text,
    fontSize: 36,
    fontWeight: '800',
    marginTop: Spacing.xs,
  },
  balanceCurrency: {
    color: Colors.dark.textMuted,
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
    backgroundColor: Colors.dark.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  actionLabel: {
    color: Colors.dark.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  sectionHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.dark.text,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  listContent: { paddingHorizontal: Spacing.md, gap: Spacing.xs },
  transactionItem: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
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
    color: Colors.dark.text,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  transactionDate: {
    color: Colors.dark.textMuted,
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
    width: '85%', backgroundColor: Colors.dark.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.dark.border
  },
  modalTitle: {
    color: Colors.dark.text, fontSize: FontSize.lg, fontWeight: '700', textAlign: 'center'
  },
  modalSubtitle: {
    color: Colors.primary, fontSize: FontSize.xs, textAlign: 'center', marginBottom: Spacing.lg
  },
  inputModal: {
    backgroundColor: Colors.dark.surfaceLight, borderRadius: BorderRadius.sm, padding: Spacing.md,
    color: Colors.dark.text, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.dark.border,
    marginBottom: Spacing.md
  },
  modalActions: {
    flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xs
  },
  modalBtnCancel: {
    flex: 1, padding: Spacing.md, borderRadius: BorderRadius.sm, alignItems: 'center',
    backgroundColor: Colors.dark.surfaceLight, borderWidth: 1, borderColor: Colors.dark.border
  },
  modalBtnText: {
    color: Colors.dark.textSecondary, fontWeight: '600'
  },
  modalBtnSubmit: {
    flex: 1, padding: Spacing.md, borderRadius: BorderRadius.sm, alignItems: 'center',
    backgroundColor: Colors.primary
  },
  modalBtnSubmitText: {
    color: '#fff', fontWeight: '700'
  }
});
