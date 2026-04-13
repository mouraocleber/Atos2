import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import api from '../../services/api';

type PaymentStep = 'idle' | 'creating' | 'waiting' | 'confirming' | 'success' | 'error';

const NUMPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export default function ReceiveTab() {
  const [cents, setCents] = useState(0);
  const [step, setStep] = useState<PaymentStep>('idle');
  const [statusText, setStatusText] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState('');

  const formatted = (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const handleKey = (key: string) => {
    if (step !== 'idle' && step !== 'error') return;
    if (key === '⌫') {
      setCents(prev => Math.floor(prev / 10));
    } else if (key !== '' && cents < 99999999) {
      setCents(prev => prev * 10 + parseInt(key));
    }
  };

  const handleCharge = async () => {
    if (cents <= 0) {
      Alert.alert('Valor inválido', 'Digite um valor para cobrar.');
      return;
    }

    setStep('creating');
    setStatusText('Criando cobrança...');

    try {
      const amountBRL = cents / 100;
      const { data } = await api.post('/stripe/create_intent', { amount: amountBRL });
      setPaymentIntentId(data.id || data.payment_intent_id || '');
      setStep('waiting');
      setStatusText('Aguardando pagamento...\nEncoste o cartão na parte traseira do celular.');
    } catch (e: any) {
      setStep('error');
      setStatusText(e?.response?.data?.message || e.message || 'Falha ao criar cobrança.');
      Alert.alert('Erro', 'Não foi possível criar a cobrança. Verifique sua conexão.');
    }
  };

  const handleConfirmManual = async () => {
    setStep('confirming');
    setStatusText('Confirmando pagamento...');
    try {
      await api.post('/stripe/confirm_intent', { payment_intent_id: paymentIntentId });
      setStep('success');
      setStatusText(`Pagamento de R$ ${formatted} recebido!`);
    } catch (e: any) {
      setStep('error');
      setStatusText(e?.response?.data?.message || 'Falha ao confirmar pagamento.');
    }
  };

  const handleReset = () => {
    setCents(0);
    setStep('idle');
    setStatusText('');
    setPaymentIntentId('');
  };

  const isLoading = step === 'creating' || step === 'confirming';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="always">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconWrapper}>
            <Feather name="credit-card" size={32} color={Colors.primary} />
          </View>
          <Text style={styles.headerTitle}>Cobrar</Text>
          <Text style={styles.headerSub}>Receba pagamentos via cartão</Text>
        </View>

        {/* Amount Display */}
        <View style={styles.amountCard}>
          <Text style={styles.currencyLabel}>BRL</Text>
          <Text style={styles.amountText}>R$ {formatted}</Text>
        </View>

        {/* Numpad */}
        {(step === 'idle' || step === 'error') && (
          <View style={styles.numpad}>
            {NUMPAD_KEYS.map((key, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.numKey, key === '' && { opacity: 0 }]}
                onPress={() => handleKey(key)}
                disabled={key === ''}
                activeOpacity={0.7}
              >
                <Text style={styles.numKeyText}>{key}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Status / Waiting UI */}
        {(step === 'waiting' || step === 'confirming' || step === 'success') && (
          <View style={styles.statusCard}>
            {isLoading && <ActivityIndicator color={Colors.primary} size="large" style={{ marginBottom: Spacing.md }} />}

            {step === 'success' && (
              <View style={styles.successIcon}>
                <Feather name="check-circle" size={64} color="#22c55e" />
              </View>
            )}

            {step === 'waiting' && (
              <View style={styles.tapIllustration}>
                <Feather name="smartphone" size={64} color={Colors.primary} />
                <Feather name="credit-card" size={40} color={Colors.secondary} style={styles.cardOverlay} />
              </View>
            )}

            <Text style={[styles.statusText, step === 'success' && { color: '#22c55e' }]}>
              {statusText}
            </Text>

            {step === 'waiting' && (
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmManual}>
                  <Feather name="check" size={16} color="#fff" />
                  <Text style={styles.confirmBtnText}>Confirmar Pagamento</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleReset}>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'success' && (
              <TouchableOpacity style={styles.newChargeBtn} onPress={handleReset}>
                <Feather name="plus" size={16} color="#fff" />
                <Text style={styles.newChargeBtnText}>Nova Cobrança</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {step === 'error' && (
          <View style={styles.errorBanner}>
            <Feather name="alert-circle" size={18} color="#ef4444" />
            <Text style={styles.errorText}>{statusText}</Text>
          </View>
        )}

        {/* Charge Button */}
        {(step === 'idle' || step === 'error') && (
          <TouchableOpacity
            style={[styles.chargeBtn, (cents === 0) && styles.chargeBtnDisabled]}
            onPress={handleCharge}
            disabled={cents === 0}
            activeOpacity={0.8}
          >
            <Feather name="zap" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.chargeBtnText}>Cobrar R$ {formatted}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl, alignItems: 'center' },

  header: { alignItems: 'center', marginBottom: Spacing.xl, width: '100%' },
  iconWrapper: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  headerTitle: { color: Colors.dark.text, fontSize: 24, fontWeight: '800' },
  headerSub: { color: Colors.dark.textMuted, fontSize: FontSize.sm, marginTop: 4 },

  amountCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.xl,
    width: '100%',
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  currencyLabel: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '700', letterSpacing: 2, marginBottom: 4 },
  amountText: { color: Colors.dark.text, fontSize: 48, fontWeight: '800' },

  numpad: {
    flexDirection: 'row', flexWrap: 'wrap',
    width: '100%', justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  numKey: {
    width: '30%', margin: '1.5%',
    paddingVertical: Spacing.md,
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.lg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.dark.border,
  },
  numKeyText: { color: Colors.dark.text, fontSize: 24, fontWeight: '600' },

  statusCard: {
    width: '100%', backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.xl, padding: Spacing.xl,
    alignItems: 'center', marginBottom: Spacing.xl,
    borderWidth: 1, borderColor: Colors.dark.border,
  },
  tapIllustration: { position: 'relative', width: 80, height: 80, marginBottom: Spacing.lg, alignItems: 'center', justifyContent: 'center' },
  cardOverlay: { position: 'absolute', bottom: 0, right: -8 },
  successIcon: { marginBottom: Spacing.lg },
  statusText: {
    color: Colors.dark.text, fontSize: FontSize.md,
    fontWeight: '600', textAlign: 'center', lineHeight: 24,
  },
  actionRow: { width: '100%', marginTop: Spacing.xl, gap: Spacing.sm },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: BorderRadius.full,
    paddingVertical: Spacing.md, gap: 8,
  },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
  cancelBtn: {
    alignItems: 'center', paddingVertical: Spacing.sm,
  },
  cancelBtnText: { color: Colors.dark.textMuted, fontSize: FontSize.sm },
  newChargeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#22c55e', borderRadius: BorderRadius.full,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl,
    marginTop: Spacing.lg, gap: 8,
  },
  newChargeBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#ef444415', borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: Spacing.lg, width: '100%',
    borderWidth: 1, borderColor: '#ef4444',
  },
  errorText: { color: '#ef4444', flex: 1, fontSize: FontSize.sm },

  chargeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: BorderRadius.full,
    paddingVertical: Spacing.lg, width: '100%',
  },
  chargeBtnDisabled: { backgroundColor: Colors.dark.border, opacity: 0.5 },
  chargeBtnText: { color: '#fff', fontWeight: '800', fontSize: FontSize.lg },
});
