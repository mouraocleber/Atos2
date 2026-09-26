import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import {
  MerchantPixConfig,
  PixKeyType,
  PIX_TYPE_LABELS,
  getMerchantPixConfig,
  saveMerchantPixConfig,
} from '../services/pixService';

interface PixConfigModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: (config: MerchantPixConfig) => void;
  defaultHolderName?: string;
  defaultEmail?: string;
  defaultPhone?: string;
}

export const PixConfigModal: React.FC<PixConfigModalProps> = ({
  visible,
  onClose,
  onSaved,
  defaultHolderName = '',
  defaultEmail = '',
  defaultPhone = '',
}) => {
  const [keyType, setKeyType] = useState<PixKeyType>('cnpj');
  const [keyValue, setKeyValue] = useState<string>('');
  const [holderName, setHolderName] = useState<string>(defaultHolderName);
  const [bankName, setBankName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingExisting, setLoadingExisting] = useState<boolean>(true);

  useEffect(() => {
    if (visible) {
      loadCurrentConfig();
    }
  }, [visible]);

  const loadCurrentConfig = async () => {
    setLoadingExisting(true);
    const existing = await getMerchantPixConfig();
    if (existing) {
      setKeyType(existing.type);
      setKeyValue(existing.key);
      setHolderName(existing.holderName || defaultHolderName);
      setBankName(existing.bankName || '');
    } else {
      // Pré-preenche sugestões
      setHolderName(defaultHolderName);
      if (defaultEmail) {
        setKeyValue(defaultEmail);
        setKeyType('email');
      }
    }
    setLoadingExisting(false);
  };

  const getPlaceholder = (): string => {
    switch (keyType) {
      case 'cnpj':
        return '00.000.000/0001-00';
      case 'cpf':
        return '000.000.000-00';
      case 'email':
        return 'financeiro@seuhotel.com.br';
      case 'phone':
        return '+55 (11) 99999-9999';
      case 'random':
        return 'Chave EVP aleatória (ex: 123e4567-e89b...)';
    }
  };

  const handleSave = async () => {
    const cleanKey = keyValue.trim();
    if (!cleanKey) {
      Alert.alert('Atenção', 'Por favor, digite a sua Chave PIX.');
      return;
    }

    if (keyType === 'cnpj' && cleanKey.replace(/\D/g, '').length < 14) {
      Alert.alert('CNPJ Inválido', 'O CNPJ deve conter 14 dígitos.');
      return;
    }

    if (keyType === 'cpf' && cleanKey.replace(/\D/g, '').length < 11) {
      Alert.alert('CPF Inválido', 'O CPF deve conter 11 dígitos.');
      return;
    }

    setLoading(true);
    const config: MerchantPixConfig = {
      key: cleanKey,
      type: keyType,
      holderName: holderName.trim() || 'Estabelecimento Atos2',
      bankName: bankName.trim() || undefined,
    };

    const success = await saveMerchantPixConfig(config);
    setLoading(false);

    if (success) {
      Alert.alert(
        'Chave PIX Salva! 🎉',
        'Os recebimentos em Reais (BRL) e a liquidação das vendas em cripto serão direcionados para esta conta.'
      );
      if (onSaved) onSaved(config);
      onClose();
    } else {
      Alert.alert('Erro', 'Não foi possível salvar a chave. Tente novamente.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="qr-code" size={20} color="#10B981" />
              </View>
              <View>
                <Text style={styles.title}>Chave PIX de Recebimento</Text>
                <Text style={styles.subtitle}>Conta bancária para receber seus pagamentos</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {loadingExisting ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={Colors.primary} size="large" />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
              {/* Card informativo de Hotel / Restaurante */}
              <View style={styles.infoBanner}>
                <Ionicons name="shield-checkmark" size={20} color="#38BDF8" style={{ marginTop: 2 }} />
                <Text style={styles.infoBannerText}>
                  Esta é a conta bancária onde cairão os pagamentos em Reais e as liquidações automáticas de clientes que pagarem em cripto.
                </Text>
              </View>

              {/* Seletor de Tipo de Chave */}
              <Text style={styles.inputLabel}>Tipo de Chave PIX</Text>
              <View style={styles.typeSelectorRow}>
                {(['cnpj', 'cpf', 'email', 'phone', 'random'] as PixKeyType[]).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.typeChip,
                      keyType === t && styles.typeChipActive,
                    ]}
                    onPress={() => setKeyType(t)}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        keyType === t && styles.typeChipTextActive,
                      ]}
                    >
                      {PIX_TYPE_LABELS[t]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Input da Chave */}
              <Text style={styles.inputLabel}>Chave PIX *</Text>
              <TextInput
                style={styles.textInput}
                value={keyValue}
                onChangeText={setKeyValue}
                placeholder={getPlaceholder()}
                placeholderTextColor="#64748B"
                keyboardType={
                  keyType === 'email'
                    ? 'email-address'
                    : keyType === 'phone'
                    ? 'phone-pad'
                    : keyType === 'cnpj' || keyType === 'cpf'
                    ? 'numeric'
                    : 'default'
                }
                autoCapitalize="none"
              />

              {/* Nome do Titular / Razão Social */}
              <Text style={styles.inputLabel}>Razão Social / Nome do Titular da Conta</Text>
              <TextInput
                style={styles.textInput}
                value={holderName}
                onChangeText={setHolderName}
                placeholder="Ex: Hotel Mar Azul Ltda"
                placeholderTextColor="#64748B"
              />

              {/* Nome do Banco (opcional) */}
              <Text style={styles.inputLabel}>Banco (Opcional)</Text>
              <TextInput
                style={styles.textInput}
                value={bankName}
                onChangeText={setBankName}
                placeholder="Ex: Itaú, Bradesco, Santander, Nubank"
                placeholderTextColor="#64748B"
              />

              {/* Botão de Salvar */}
              <TouchableOpacity
                style={[styles.saveBtn, loading && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name="check-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>Salvar Chave PIX</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
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
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#064E3B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
  },
  body: {
    padding: 20,
  },
  infoBanner: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#0284C7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#BAE6FD',
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 8,
    marginTop: 12,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  typeChipActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  typeChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#F8FAFC',
    fontSize: 15,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 24,
    marginBottom: 10,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
