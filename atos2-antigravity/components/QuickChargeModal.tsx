import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';

interface QuickChargeModalProps {
  visible: boolean;
  onClose: () => void;
  waiterName?: string;
  tableNumber?: string;
}

export const QuickChargeModal: React.FC<QuickChargeModalProps> = ({
  visible,
  onClose,
  waiterName = 'Atendente',
  tableNumber = '01',
}) => {
  const [amount, setAmount] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const getBaseAmount = (): number => {
    return parseFloat(amount.replace(',', '.')) || 0;
  };

  const handleGenerateCharge = () => {
    const numAmount = getBaseAmount();
    if (!numAmount || numAmount <= 0) return;

    setIsGenerating(true);
    // Simula geração de URL única de checkout para o turista
    setTimeout(() => {
      const checkoutId = Math.random().toString(36).substring(2, 9);
      const totalStr = numAmount.toFixed(2);
      const url = `https://atos2.online/checkout/${checkoutId}?amount=${totalStr}&table=${tableNumber}`;
      setQrCodeUrl(url);
      setIsGenerating(false);
    }, 400);
  };

  const handleShareLink = async () => {
    if (!qrCodeUrl) return;
    try {
      await Share.share({
        message: `AtoS2 Checkout - Link de Pagamento Multilíngue (Mesa ${tableNumber}): ${qrCodeUrl}`,
      });
    } catch (e) {
      console.warn('Erro ao compartilhar link:', e);
    }
  };

  const handleFinishSession = () => {
    setAmount('');
    setQrCodeUrl(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Cabeçalho */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Gerar Cobrança Rápida</Text>
              <Text style={styles.subtitle}>
                Ref: {tableNumber} • Operador: {waiterName}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {!qrCodeUrl ? (
            /* Formulário de Digitação do Valor */
            <View style={styles.formContainer}>
              <Text style={styles.label}>Valor Bruto (R$)</Text>
              <TextInput
                style={styles.input}
                placeholder="0,00"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                autoFocus
              />

              <Text style={styles.tipNotice}>
                💡 A gratificação/gorjeta voluntária para o usuário ({waiterName}) será escolhida pelo cliente no checkout.
              </Text>

              <TouchableOpacity
                style={[
                  styles.generateButton,
                  (!amount || parseFloat(amount.replace(',', '.')) <= 0) &&
                    styles.generateButtonDisabled,
                ]}
                onPress={handleGenerateCharge}
                disabled={!amount || parseFloat(amount.replace(',', '.')) <= 0}
              >
                {isGenerating ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="qr-code-outline" size={20} color="#FFF" />
                    <Text style={styles.generateButtonText}>Exibir QR Code</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            /* Exibição do QR Code de Pagamento para o Turista */
            <View style={styles.qrContainer}>
              <Text style={styles.qrInstruction}>
                Peça para o cliente escanear o QR Code com a câmera do celular:
              </Text>

              <View style={styles.qrBox}>
                <QRCode value={qrCodeUrl} size={180} color="#0F172A" />
              </View>

              <Text style={styles.totalDisplay}>
                Valor da Conta: R$ {getBaseAmount().toFixed(2).replace('.', ',')}
              </Text>

              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.shareButton} onPress={handleShareLink}>
                  <Ionicons name="share-social-outline" size={18} color="#0284C7" />
                  <Text style={styles.shareButtonText}>Enviar Link (WhatsApp)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.finishButton}
                  onPress={handleFinishSession}
                >
                  <Ionicons name="checkmark-done" size={18} color="#FFF" />
                  <Text style={styles.finishButtonText}>Finalizar & Liberar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#334155',
  },
  formContainer: {
    gap: 16,
  },
  label: {
    fontSize: 14,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#38BDF8',
    textAlign: 'center',
  },
  tipNotice: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginVertical: 4,
  },
  tipContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tipButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  tipButtonActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  tipText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  tipTextActive: {
    color: '#FFF',
  },
  summaryBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 16,
    borderRadius: 12,
  },
  summaryLabel: {
    color: '#94A3B8',
    fontSize: 14,
  },
  summaryValue: {
    color: '#4ADE80',
    fontSize: 20,
    fontWeight: 'bold',
  },
  generateButton: {
    backgroundColor: '#0284C7',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  generateButtonDisabled: {
    opacity: 0.5,
  },
  generateButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  qrContainer: {
    alignItems: 'center',
    gap: 16,
  },
  qrInstruction: {
    color: '#CBD5E1',
    textAlign: 'center',
    fontSize: 14,
  },
  qrBox: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    elevation: 4,
  },
  totalDisplay: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#38BDF8',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 12,
  },
  shareButtonText: {
    color: '#38BDF8',
    fontWeight: '600',
    fontSize: 13,
  },
  finishButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    borderRadius: 12,
  },
  finishButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
