import React, { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Pressable
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';
import { RoomType, AccessPolicy, createRoom } from '../services/group';

interface CreateRoomModalProps {
  visible: boolean;
  initialType?: RoomType;
  onClose: () => void;
  onSuccess: (roomData: any) => void;
}

export default function CreateRoomModal({
  visible,
  initialType = 'GROUP',
  onClose,
  onSuccess,
}: CreateRoomModalProps) {
  const [type, setType] = useState<RoomType>(initialType);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [accessPolicy, setAccessPolicy] = useState<AccessPolicy>('PUBLIC');
  const [translationConfirmed, setTranslationConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sync initial type when modal opens
  React.useEffect(() => {
    setType(initialType);
  }, [initialType, visible]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setAccessPolicy('PUBLIC');
    setTranslationConfirmed(false);
    setLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Atenção', 'Informe o nome da sala no Modo Guia.');
      return;
    }

    if (!translationConfirmed) {
      Alert.alert('Confirmação Necessária', 'Você precisa confirmar que está ciente da cobrança por minuto em caso de uso de tradução.');
      return;
    }

    setLoading(true);
    try {
      const res = await createRoom({
        name: name.trim(),
        description: description.trim(),
        type: 'GROUP',
        accessPolicy,
        translationAwareConfirmed: translationConfirmed,
      });

      if (res.success || res.data) {
        Alert.alert(
          'Sucesso!',
          'Sala Modo Guia criada com sucesso! O QR Code está pronto para os participantes escanearem.',
          [
            {
              text: 'OK',
              onPress: () => {
                const createdData = res.data || res;
                resetForm();
                onSuccess(createdData);
              },
            },
          ]
        );
      } else {
        Alert.alert('Erro', (res as any).message || 'Não foi possível concluir a criação.');
      }
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.message || 'Falha ao criar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.iconCircle, { backgroundColor: '#E0F2FE' }]}>
                <Feather
                  name="headphones"
                  size={22}
                  color="#0284C7"
                />
              </View>
              <Text style={styles.headerTitle}>
                Criar Sala Modo Guia
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Feather name="x" size={22} color={Colors.light.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Descritivo do Modo Guia */}
            <View style={[
              styles.modeInfoBox,
              {
                backgroundColor: '#F0F9FF',
                borderColor: '#0284C7',
              }
            ]}>
              <Feather
                name="headphones"
                size={20}
                color="#0369A1"
                style={{ marginTop: 2 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.modeInfoTitle, { color: '#0369A1' }]}>
                  🎧 Modo Guia • Tradução Simultânea Coletiva
                </Text>
                <Text style={[styles.modeInfoBody, { color: '#0C4A6E' }]}>
                  Todos que escanearem o QR Code entram na mesma conversa e cada participante recebe o áudio traduzido automaticamente para o seu idioma nativo.
                </Text>
              </View>
            </View>

            {/* Nome */}
            <Text style={styles.label}>
              Nome da Sala / Tour (Modo Guia) *
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Tour Histórico Pelourinho ou Grupo Internacional"
              placeholderTextColor={Colors.light.textMuted}
              value={name}
              onChangeText={setName}
            />

            {/* Descrição */}
            <Text style={styles.label}>Descrição / Roteiro (opcional)</Text>
            <TextInput
              style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
              placeholder="Descreva o propósito da sala ou roteiro do guia..."
              placeholderTextColor={Colors.light.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline={true}
            />

            {/* Regras de Entrada e Privacidade */}
            <Text style={styles.label}>Regra de Entrada e Acesso</Text>

            <TouchableOpacity
              style={[styles.policyCard, accessPolicy === 'PUBLIC' && styles.policyCardSelected]}
              onPress={() => setAccessPolicy('PUBLIC')}
              activeOpacity={0.7}
            >
              <View style={styles.radioCircle}>
                {accessPolicy === 'PUBLIC' && <View style={styles.radioInner} />}
              </View>
              <View style={styles.policyContent}>
                <Text style={styles.policyTitle}>1ª Entrada Livre via QR Code (Recomendado)</Text>
                <Text style={styles.policySub}>
                  Qualquer participante que escanear o QR Code entra direto na sala do Modo Guia.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.policyCard, accessPolicy === 'APPROVAL' && styles.policyCardSelected]}
              onPress={() => setAccessPolicy('APPROVAL')}
              activeOpacity={0.7}
            >
              <View style={styles.radioCircle}>
                {accessPolicy === 'APPROVAL' && <View style={styles.radioInner} />}
              </View>
              <View style={styles.policyContent}>
                <Text style={styles.policyTitle}>2ª Só entra mediante aprovação do Guia</Text>
                <Text style={styles.policySub}>
                  O participante escaneia e solicita entrada. Você aprova ou recusa.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.policyCard, accessPolicy === 'INVITE_ONLY' && styles.policyCardSelected]}
              onPress={() => setAccessPolicy('INVITE_ONLY')}
              activeOpacity={0.7}
            >
              <View style={styles.radioCircle}>
                {accessPolicy === 'INVITE_ONLY' && <View style={styles.radioInner} />}
              </View>
              <View style={styles.policyContent}>
                <Text style={styles.policyTitle}>3ª Sala Privada com convite do Guia</Text>
                <Text style={styles.policySub}>
                  Apenas participantes diretamente convidados pelo Guia poderão acessar.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Card de Aviso sobre Tradução */}
            <View style={styles.warningCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Feather name="alert-triangle" size={20} color="#D97706" />
                <Text style={styles.warningTitle}>AVISO IMPORTANTE SOBRE TRADUÇÃO</Text>
              </View>
              <Text style={styles.warningBody}>
                Caso haja utilização do recurso de <Text style={{ fontWeight: '800', color: Colors.primary }}>TRADUÇÃO SIMULTÂNEA</Text> no Modo Guia, <Text style={{ fontWeight: '800', color: '#B45309' }}>O VALOR SERÁ COBRADO POR MINUTO DE USO DA TRADUÇÃO</Text>.
              </Text>

              <Pressable
                style={styles.checkboxRow}
                onPress={() => setTranslationConfirmed(!translationConfirmed)}
              >
                <View style={[styles.checkbox, translationConfirmed && styles.checkboxChecked]}>
                  {translationConfirmed && <Feather name="check" size={14} color="#fff" />}
                </View>
                <Text style={styles.checkboxLabel}>
                  Estou ciente da cobrança por minuto em caso de uso de tradução.
                </Text>
              </Pressable>
            </View>
          </ScrollView>

          {/* Buttons Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                (!name.trim() || !translationConfirmed || loading) && styles.submitBtnDisabled,
              ]}
              onPress={handleCreate}
              disabled={!name.trim() || !translationConfirmed || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="check-circle" size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>
                    Criar Sala Modo Guia
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.light.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '90%',
    paddingBottom: 20,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.secondary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.light.text,
  },
  closeBtn: {
    padding: 6,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.light.text,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.surfaceLight,
  },
  typeOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.light.textMuted,
  },
  typeTextActive: {
    color: '#fff',
  },
  input: {
    backgroundColor: Colors.light.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: FontSize.md,
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  policyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.surfaceLight,
    marginBottom: Spacing.sm,
    gap: 12,
  },
  policyCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  policyContent: {
    flex: 1,
  },
  policyTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.light.text,
  },
  policySub: {
    fontSize: FontSize.xs,
    color: Colors.light.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  warningCard: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  warningTitle: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.5,
  },
  warningBody: {
    fontSize: FontSize.xs,
    color: '#78350F',
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#FCD34D',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#B45309',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#B45309',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: '#78350F',
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: Colors.light.textMuted,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  submitBtn: {
    flex: 2,
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: Colors.light.textMuted,
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  modeInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  modeInfoTitle: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    marginBottom: 2,
  },
  modeInfoBody: {
    fontSize: FontSize.xs,
    lineHeight: 16,
  },
});
