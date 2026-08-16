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
    if (type === 'LISTENING') {
      handleClose();
      router.push('/(tabs)/listening');
      return;
    }

    if (!name.trim()) {
      Alert.alert('Atenção', 'Informe o nome do grupo ou palestra.');
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
        type,
        accessPolicy,
        translationAwareConfirmed: translationConfirmed,
      });

      if (res.success || res.data) {
        Alert.alert(
          'Sucesso!',
          `${type === 'GROUP' ? 'Grupo' : 'Palestra'} criado(a) com sucesso!`,
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
              <View style={styles.iconCircle}>
                <Feather
                  name={type === 'GROUP' ? 'users' : type === 'LECTURE' ? 'mic' : 'headphones'}
                  size={22}
                  color={Colors.secondaryDark}
                />
              </View>
              <Text style={styles.headerTitle}>
                {type === 'GROUP' ? 'Criar Novo Grupo' : type === 'LECTURE' ? 'Criar Nova Palestra' : 'Modo Escuta'}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Feather name="x" size={22} color={Colors.light.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Seletor de Modo: Grupo, Palestra ou Modo Escuta */}
            <Text style={styles.label}>Tipo de Modo / Sala</Text>
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeOption, type === 'GROUP' && styles.typeOptionActive]}
                onPress={() => setType('GROUP')}
                activeOpacity={0.8}
              >
                <Feather
                  name="users"
                  size={16}
                  color={type === 'GROUP' ? '#fff' : Colors.light.textMuted}
                />
                <Text style={[styles.typeText, type === 'GROUP' && styles.typeTextActive]}>
                  👥 Grupo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeOption, type === 'LECTURE' && styles.typeOptionActive]}
                onPress={() => setType('LECTURE')}
                activeOpacity={0.8}
              >
                <Feather
                  name="mic"
                  size={16}
                  color={type === 'LECTURE' ? '#fff' : Colors.light.textMuted}
                />
                <Text style={[styles.typeText, type === 'LECTURE' && styles.typeTextActive]}>
                  🎤 Palestra
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeOption, type === 'LISTENING' && styles.typeOptionActive]}
                onPress={() => setType('LISTENING')}
                activeOpacity={0.8}
              >
                <Feather
                  name="headphones"
                  size={16}
                  color={type === 'LISTENING' ? '#fff' : Colors.light.textMuted}
                />
                <Text style={[styles.typeText, type === 'LISTENING' && styles.typeTextActive]}>
                  🎧 Escuta
                </Text>
              </TouchableOpacity>
            </View>

            {/* Descritivo dos Modos */}
            <View style={[
              styles.modeInfoBox,
              {
                backgroundColor: type === 'GROUP' ? '#F0F9FF' : type === 'LECTURE' ? '#FEF3C7' : '#F3E8FF',
                borderColor: type === 'GROUP' ? '#0284C7' : type === 'LECTURE' ? '#F59E0B' : '#9333EA',
              }
            ]}>
              <Feather
                name={type === 'GROUP' ? 'volume-2' : type === 'LECTURE' ? 'mic-off' : 'headphones'}
                size={18}
                color={type === 'GROUP' ? '#0369A1' : type === 'LECTURE' ? '#B45309' : '#7E22CE'}
                style={{ marginTop: 2 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.modeInfoTitle, { color: type === 'GROUP' ? '#0369A1' : type === 'LECTURE' ? '#92400E' : '#6B21A8' }]}>
                  {type === 'GROUP' ? '🗣️ Todos Podem Falar:' : type === 'LECTURE' ? '🎤 Regra da Palestra:' : '🎧 Modo Escuta Ativo:'}
                </Text>
                <Text style={[styles.modeInfoBody, { color: type === 'GROUP' ? '#0C4A6E' : type === 'LECTURE' ? '#78350F' : '#581C87' }]}>
                  {type === 'GROUP'
                    ? 'No modo GRUPO, TODOS os participantes possuem autorização para falar, interagir e enviar áudios.'
                    : type === 'LECTURE'
                    ? 'No modo PALESTRA, APENAS as pessoas indicadas/autorizadas pelo criador podem falar. Todos os demais entram estritamente como OUVINTES.'
                    : 'No MODO ESCUTA, o app capta o áudio do ambiente (na rua) via microfone, detecta o idioma automaticamente e traduz direto no seu fone de ouvido.'}
                </Text>
              </View>
            </View>

            {type !== 'LISTENING' && (
              <>
                {/* Nome */}
                <Text style={styles.label}>
                  Nome {type === 'GROUP' ? 'do Grupo' : 'da Palestra'} *
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={type === 'GROUP' ? 'Ex: Grupo de Estudos Atos2' : 'Ex: Palestra sobre Inovação'}
                  placeholderTextColor={Colors.light.textMuted}
                  value={name}
                  onChangeText={setName}
                />

                {/* Descrição */}
                <Text style={styles.label}>Descrição / Assunto (opcional)</Text>
                <TextInput
                  style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                  placeholder="Descreva o propósito da sala..."
                  placeholderTextColor={Colors.light.textMuted}
                  value={description}
                  onChangeText={setDescription}
                  multiline={true}
                />

                {/* Regras de Entrada e Privacidade */}
                <Text style={styles.label}>Regra de Entrada e Privacidade</Text>

                <TouchableOpacity
                  style={[styles.policyCard, accessPolicy === 'PUBLIC' && styles.policyCardSelected]}
                  onPress={() => setAccessPolicy('PUBLIC')}
                  activeOpacity={0.7}
                >
                  <View style={styles.radioCircle}>
                    {accessPolicy === 'PUBLIC' && <View style={styles.radioInner} />}
                  </View>
                  <View style={styles.policyContent}>
                    <Text style={styles.policyTitle}>1ª Qualquer um pode entrar</Text>
                    <Text style={styles.policySub}>
                      Acesso livre. Qualquer usuário pode encontrar e entrar no {type === 'GROUP' ? 'grupo' : 'palestra'}.
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
                    <Text style={styles.policyTitle}>2ª Só entra mediante ACEITE do dono</Text>
                    <Text style={styles.policySub}>
                      O interessado envia solicitação e você (dono do {type === 'GROUP' ? 'grupo' : 'palestra'}) aprova ou recusa.
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
                    <Text style={styles.policyTitle}>3ª Só entra com ACEITE DE CONVITE enviado pelo dono</Text>
                    <Text style={styles.policySub}>
                      Sala privada. Apenas usuários diretamente convidados por você poderão participar.
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
                    Caso haja utilização do recurso de <Text style={{ fontWeight: '800', color: Colors.primary }}>TRADUÇÃO SIMULTÂNEA</Text> no {type === 'GROUP' ? 'grupo' : 'palestra'}, <Text style={{ fontWeight: '800', color: '#B45309' }}>O VALOR SERÁ COBRADO POR MINUTO DE USO DA TRADUÇÃO</Text>.
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
              </>
            )}
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
                type !== 'LISTENING' && (!name.trim() || !translationConfirmed || loading) && styles.submitBtnDisabled,
                type === 'LISTENING' && { backgroundColor: '#9333EA' },
              ]}
              onPress={handleCreate}
              disabled={type !== 'LISTENING' && (!name.trim() || !translationConfirmed || loading)}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name={type === 'LISTENING' ? 'headphones' : 'check-circle'} size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>
                    {type === 'GROUP' ? 'Criar Grupo' : type === 'LECTURE' ? 'Criar Palestra' : 'Abrir Modo Escuta'}
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
