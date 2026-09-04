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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

export default function CheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { setLinkAccess } = useAuth();

  useEffect(() => {
    setLinkAccess(true);
  }, []);

  const rawAmount = (params.amount as string) || '100.00';
  const table = (params.table as string) || '01';

  const baseAmountBrl = parseFloat(rawAmount) || 100.0;
  const [selectedTip, setSelectedTip] = useState<number>(0);

  const tipAmountBrl = (baseAmountBrl * selectedTip) / 100;
  const totalAmountBrl = baseAmountBrl + tipAmountBrl;

  const estimatedUsd = (totalAmountBrl / 5.0).toFixed(2);
  const estimatedEur = (totalAmountBrl / 5.5).toFixed(2);

  const [selectedMethod, setSelectedMethod] = useState<'card' | 'applepay' | 'crypto'>('applepay');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isPaid, setIsPaid] = useState<boolean>(false);


  const handlePay = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsPaid(true);
    }, 1500);
  };

  if (isPaid) {
    return (
      <SafeAreaView style={styles.successContainer}>
        <StatusBar barStyle="light-content" />
        <View style={styles.successCard}>
          <View style={styles.successIconBox}>
            <Ionicons name="checkmark-circle" size={80} color="#4ADE80" />
          </View>

          <Text style={styles.successTitle}>Payment Successful!</Text>
          <Text style={styles.successSub}>Pagamento Confirmado com Sucesso</Text>

          <View style={styles.receiptBox}>
            <Text style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Table / Mesa:</Text>
              <Text style={styles.receiptVal}>Table {table}</Text>
            </Text>
            <Text style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Amount / Valor:</Text>
              <Text style={styles.receiptVal}>R$ {totalAmountBrl.toFixed(2)} (${estimatedUsd} USD)</Text>
            </Text>
            <Text style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Status:</Text>
              <Text style={[styles.receiptVal, { color: '#4ADE80' }]}>APPROVED (Pix Sent D+0)</Text>
            </Text>
          </View>

          <TouchableOpacity style={styles.doneButton} onPress={() => router.replace('/')}>
            <Text style={styles.doneButtonText}>Done / Concluído</Text>
          </TouchableOpacity>
        </View>
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
        {/* Banner de Atendimento & Produtos/Serviços */}
        <View style={styles.merchantCard}>
          <Text style={styles.merchantName}>Tourism & Concierge Services</Text>
          <Text style={styles.tableBadge}>Ref / Identificador {table}</Text>

          <View style={styles.amountDisplay}>
            <Text style={styles.amountBrl}>R$ {totalAmountBrl.toFixed(2)}</Text>
            <Text style={styles.amountFx}>
              ~ ${estimatedUsd} USD  •  ~ €{estimatedEur} EUR
            </Text>
          </View>
        </View>

        {/* Sugestão de Gratificação / Gorjeta Voluntária */}
        <Text style={styles.sectionTitle}>Would you like to leave a tip? / Gratificação Voluntária</Text>
        <View style={styles.tipRow}>
          {[0, 5, 10, 15, 20].map((tip) => (
            <TouchableOpacity
              key={tip}
              style={[styles.tipCard, selectedTip === tip && styles.tipCardActive]}
              onPress={() => setSelectedTip(tip)}
            >
              <Text style={[styles.tipCardText, selectedTip === tip && styles.tipCardTextActive]}>
                {tip === 0 ? 'No Tip' : `${tip}%`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>


        {/* Seleção do Método de Pagamento */}
        <Text style={styles.sectionTitle}>Select Payment Method / Escolha a Forma de Pagamento</Text>

        <TouchableOpacity
          style={[styles.methodCard, selectedMethod === 'applepay' && styles.methodCardActive]}
          onPress={() => setSelectedMethod('applepay')}
        >
          <View style={styles.methodLeft}>
            <Ionicons name="logo-apple" size={26} color="#FFF" />
            <View>
              <Text style={styles.methodTitle}>Apple Pay / Google Pay</Text>
              <Text style={styles.methodSub}>1-Tap Instant Checkout</Text>
            </View>
          </View>
          <View style={[styles.radio, selectedMethod === 'applepay' && styles.radioActive]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.methodCard, selectedMethod === 'card' && styles.methodCardActive]}
          onPress={() => setSelectedMethod('card')}
        >
          <View style={styles.methodLeft}>
            <Ionicons name="card-outline" size={26} color="#38BDF8" />
            <View>
              <Text style={styles.methodTitle}>International Credit Card</Text>
              <Text style={styles.methodSub}>Visa, Mastercard, Amex</Text>
            </View>
          </View>
          <View style={[styles.radio, selectedMethod === 'card' && styles.radioActive]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.methodCard, selectedMethod === 'crypto' && styles.methodCardActive]}
          onPress={() => setSelectedMethod('crypto')}
        >
          <View style={styles.methodLeft}>
            <Ionicons name="wallet-outline" size={26} color="#F59E0B" />
            <View>
              <Text style={styles.methodTitle}>Binance Pay / USDC</Text>
              <Text style={styles.methodSub}>Zero FX Fee Cripto Pay</Text>
            </View>
          </View>
          <View style={[styles.radio, selectedMethod === 'crypto' && styles.radioActive]} />
        </TouchableOpacity>

        {/* Botão de Pagar */}
        <TouchableOpacity style={styles.payButton} onPress={handlePay} disabled={isProcessing}>
          {isProcessing ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="lock-closed" size={18} color="#FFF" />
              <Text style={styles.payButtonText}>
                Pay R$ {totalAmountBrl.toFixed(2)} (${estimatedUsd} USD)
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.guaranteeText}>
          🔒 Guaranteed 256-bit Encrypted Checkout • Instant Receipt
        </Text>
      </ScrollView>
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
    padding: 20,
    gap: 16,
  },
  merchantCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  merchantName: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  tableBadge: {
    backgroundColor: '#0284C7',
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  amountDisplay: {
    alignItems: 'center',
    marginTop: 16,
  },
  amountBrl: {
    color: '#38BDF8',
    fontSize: 36,
    fontWeight: 'bold',
  },
  amountFx: {
    color: '#4ADE80',
    fontSize: 14,
    marginTop: 4,
    fontWeight: '600',
  },
  sectionTitle: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  tipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tipCard: {
    flex: 1,
    paddingVertical: 12,
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
    fontSize: 13,
    fontWeight: '600',
  },
  tipCardTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },

  methodCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
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
    gap: 14,
  },
  methodTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '600',
  },
  methodSub: {
    color: '#94A3B8',
    fontSize: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#64748B',
  },
  radioActive: {
    borderColor: '#38BDF8',
    backgroundColor: '#38BDF8',
  },
  payButton: {
    backgroundColor: '#16A34A',
    paddingVertical: 18,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    elevation: 4,
  },
  payButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
  guaranteeText: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  successContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successCard: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  successIconBox: {
    marginBottom: 16,
  },
  successTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  successSub: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 20,
  },
  receiptBox: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    gap: 10,
    marginBottom: 20,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  receiptLabel: {
    color: '#94A3B8',
    fontSize: 13,
  },
  receiptVal: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  doneButton: {
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
