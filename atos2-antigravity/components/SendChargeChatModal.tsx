import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';

interface SendChargeChatModalProps {
  visible: boolean;
  onClose: () => void;
  onSend: (data: { amount: number; table: string; description: string }) => void;
  defaultTable?: string;
}

export default function SendChargeChatModal({
  visible,
  onClose,
  onSend,
  defaultTable = '01',
}: SendChargeChatModalProps) {
  const [amountStr, setAmountStr] = useState('');
  const [table, setTable] = useState(defaultTable);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const parsedAmount = parseFloat(amountStr.replace(',', '.')) || 0;

  const handleSend = () => {
    if (parsedAmount <= 0) return;
    setLoading(true);
    try {
      onSend({
        amount: parsedAmount,
        table: table.trim() || 'Geral',
        description: description.trim() || `Conta Mesa ${table.trim() || 'Geral'}`,
      });
      setAmountStr('');
      setDescription('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.iconCircle}>
                <Ionicons name="receipt-outline" size={22} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.title}>Enviar Conta / Cobrança</Text>
                <Text style={styles.subtitle}>Link de checkout instantâneo no chat</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={22} color={Colors.light.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.body}>
            <Text style={styles.label}>Valor da Conta (R$) *</Text>
            <View style={styles.inputRow}>
              <Text style={styles.currencyPrefix}>R$</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0,00"
                placeholderTextColor={Colors.light.textMuted}
                keyboardType="numeric"
                value={amountStr}
                onChangeText={setAmountStr}
                autoFocus
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: Spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Mesa / Ref</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ex: Mesa 04"
                  placeholderTextColor={Colors.light.textMuted}
                  value={table}
                  onChangeText={setTable}
                />
              </View>
              <View style={{ flex: 2 }}>
                <Text style={styles.label}>Descrição / Detalhe</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ex: Almoço + Bebidas"
                  placeholderTextColor={Colors.light.textMuted}
                  value={description}
                  onChangeText={setDescription}
                />
              </View>
            </View>

            {/* Badges de métodos aceitos */}
            <View style={styles.methodsBox}>
              <Text style={styles.methodsTitle}>O cliente poderá pagar via:</Text>
              <View style={styles.badgesRow}>
                <View style={[styles.badge, { borderColor: '#A855F7' }]}>
                  <Text style={[styles.badgeText, { color: '#A855F7' }]}>⚡ Solana Pay (USDC)</Text>
                </View>
                <View style={[styles.badge, { borderColor: '#22C55E' }]}>
                  <Text style={[styles.badgeText, { color: '#22C55E' }]}>PIX Dinâmico</Text>
                </View>
                <View style={[styles.badge, { borderColor: '#38BDF8' }]}>
                  <Text style={[styles.badgeText, { color: '#38BDF8' }]}>Cartão / Apple Pay</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sendBtn, parsedAmount <= 0 && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={parsedAmount <= 0 || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="paper-plane-outline" size={18} color="#fff" />
                  <Text style={styles.sendBtnText}>Enviar Cobrança no Chat</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.light.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: Spacing.xl,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: FontSize.xs,
    color: Colors.light.textMuted,
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    padding: Spacing.md,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 12,
    marginBottom: Spacing.sm,
  },
  currencyPrefix: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.primary,
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    paddingVertical: 10,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: FontSize.sm,
    color: Colors.light.text,
  },
  methodsBox: {
    marginTop: Spacing.md,
    backgroundColor: '#0F172A',
    borderRadius: BorderRadius.md,
    padding: 12,
    gap: 8,
  },
  methodsTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  sendBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#FFF',
  },
});
