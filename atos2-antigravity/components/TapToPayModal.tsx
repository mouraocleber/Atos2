import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Alert
} from 'react-native';
// Safe import for the beta package which may have different exports
let useTerminal: any = null;
try {
  useTerminal = require('@stripe/stripe-terminal-react-native').useTerminal;
} catch (e) {
  console.warn('[TapToPayModal] Stripe Terminal not available');
}

import { Feather } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';
import api from '../services/api';

interface TapToPayModalProps {
  visible: boolean;
  onClose: () => void;
  amount: number; // in cents
  onSuccess: () => void;
}

export default function TapToPayModal({ visible, onClose, amount, onSuccess }: TapToPayModalProps) {
  const terminal = useTerminal ? useTerminal() : {};
  const { 
    discoverReaders, 
    connectLocalMobileReader, 
    collectPaymentMethod, 
    processPayment,
    connectedReader,
  } = terminal;

  const [step, setStep] = useState<'initializing' | 'discovering' | 'connecting' | 'ready' | 'collecting' | 'processing' | 'success' | 'error'>('initializing');
  const [status, setStatus] = useState('Iniciando o Terminal...');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (visible) {
      startFlow();
    } else {
      setStep('initializing');
    }
  }, [visible]);

  const startFlow = async () => {
    setErrorMsg('');
    try {
      if (!connectedReader) {
        setStep('discovering');
        setStatus('Transformando seu celular em maquininha...');
        
        // Discover the local mobile reader (Tap to Pay)
        const { error: discoveryError, readers } = await discoverReaders({
          discoveryMethod: 'localMobile',
          simulated: false,
        });

        if (discoveryError) throw discoveryError;
        
        const localReader = readers?.find((r: any) => r.deviceType === 'localMobile');
        if (!localReader) throw new Error('Seu dispositivo não suporta Tap to Pay.');

        setStep('connecting');
        setStatus('Conectando ao provedor de pagamentos...');
        
        const { error: connectionError } = await connectLocalMobileReader({
          reader: localReader,
          locationId: 'templocation', // You might need to fetch a real locationId from backend
        });

        if (connectionError) throw connectionError;
      }

      // Now we are connected and ready
      handlePayment();
    } catch (e: any) {
      setStep('error');
      setStatus('Falha na Inicialização');
      setErrorMsg(e.message || 'Erro desconhecido');
    }
  };

  const handlePayment = async () => {
    try {
      setStep('collecting');
      setStatus('Aproxime o cartão na traseira do celular');

      // 1. Create PaymentIntent on Backend
      const { data } = await api.post('/stripe/create_intent', { amount });
      const clientSecret = data.client_secret;

      // 2. Collect Payment Method
      const { error: collectError, paymentIntent: collectedIntent } = await collectPaymentMethod({
        paymentIntent: clientSecret,
      });

      if (collectError) throw collectError;

      setStep('processing');
      setStatus('Processando pagamento...');

      // 3. Process Payment
      const { error: processError, paymentIntent: processedIntent } = await processPayment({
        paymentIntent: collectedIntent!,
      });

      if (processError) throw processError;

      setStep('success');
      setStatus('Pagamento Recebido!');
      onSuccess();
      
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (e: any) {
      setStep('error');
      setStatus('Pagamento não realizado');
      setErrorMsg(e.message || 'Erro no processamento');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Maquininha Atos2</Text>
            <TouchableOpacity onPress={onClose} disabled={step === 'processing' || step === 'collecting'}>
                <Feather name="x" size={24} color={Colors.light.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
             {step === 'success' ? (
                <Feather name="check-circle" size={80} color={Colors.success} />
             ) : step === 'error' ? (
                <Feather name="alert-circle" size={80} color={Colors.error} />
             ) : (
                <View style={styles.animContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    {step === 'collecting' && (
                        <Feather name="rss" size={40} color={Colors.primary} style={styles.nfcIcon} />
                    )}
                </View>
             )}

             <Text style={styles.statusText}>{status}</Text>
             {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
             
             <Text style={styles.amountText}>
                R$ {(amount / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
             </Text>
          </View>

          {step === 'error' && (
              <TouchableOpacity style={styles.retryBtn} onPress={startFlow}>
                  <Text style={styles.retryText}>Tentar Novamente</Text>
              </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: Colors.light.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    minHeight: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.primary,
  },
  body: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  animContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nfcIcon: {
    position: 'absolute',
  },
  statusText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    textAlign: 'center',
    color: Colors.light.text,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  amountText: {
    fontSize: FontSize.xxl,
    fontWeight: '900',
    color: Colors.primary,
    marginTop: Spacing.sm,
  },
  retryBtn: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
  }
});
