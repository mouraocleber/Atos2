import React, { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';
import { MemberRole } from '../services/group';

interface InviteRoleModalProps {
  visible: boolean;
  targetUserName: string;
  actionType: 'INVITE' | 'ACCEPT';
  onClose: () => void;
  onConfirm: (selectedRole: MemberRole) => void;
}

export default function InviteRoleModal({
  visible,
  targetUserName,
  actionType = 'INVITE',
  onClose,
  onConfirm,
}: InviteRoleModalProps) {
  const [selectedRole, setSelectedRole] = useState<MemberRole>('LISTENER');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(selectedRole);
    } catch (e) {
      console.warn('Erro na ação de papel:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Feather name="mic" size={20} color={Colors.secondaryDark} />
            </View>
            <Text style={styles.title}>
              {actionType === 'INVITE' ? 'Enviar Convite para Palestra' : 'Aprovar Entrada na Palestra'}
            </Text>
          </View>

          <Text style={styles.subTitle}>
            Escolha como <Text style={{ fontWeight: '700', color: Colors.light.text }}>{targetUserName}</Text> participará da palestra:
          </Text>

          {/* Opção 1: Palestrante */}
          <TouchableOpacity
            style={[styles.roleCard, selectedRole === 'SPEAKER' && styles.roleCardActive]}
            onPress={() => setSelectedRole('SPEAKER')}
            activeOpacity={0.8}
          >
            <View style={[styles.roleIconCircle, { backgroundColor: '#FEF3C7' }]}>
              <Feather name="mic" size={20} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.roleTitle}>🎤 Palestrante</Text>
                <View style={styles.badgeTag}>
                  <Text style={styles.badgeText}>Pode Falar</Text>
                </View>
              </View>
              <Text style={styles.roleDesc}>
                O usuário terá autorização para falar, transmitir áudio/vídeo e responder a perguntas.
              </Text>
            </View>
            <View style={styles.radio}>
              {selectedRole === 'SPEAKER' && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>

          {/* Opção 2: Ouvinte */}
          <TouchableOpacity
            style={[styles.roleCard, selectedRole === 'LISTENER' && styles.roleCardActive]}
            onPress={() => setSelectedRole('LISTENER')}
            activeOpacity={0.8}
          >
            <View style={[styles.roleIconCircle, { backgroundColor: '#E0F2FE' }]}>
              <Feather name="headphones" size={20} color="#0284C7" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.roleTitle}>🎧 Ouvinte</Text>
                <View style={[styles.badgeTag, { backgroundColor: '#E0F2FE' }]}>
                  <Text style={[styles.badgeText, { color: '#0369A1' }]}>Apenas Ouve</Text>
                </View>
              </View>
              <Text style={styles.roleDesc}>
                O usuário assistirá/ouvirá a palestra e poderá interagir via texto no chat.
              </Text>
            </View>
            <View style={styles.radio}>
              {selectedRole === 'LISTENER' && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>

          {/* Botões */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleConfirm}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="check" size={18} color="#fff" />
                  <Text style={styles.confirmText}>
                    {actionType === 'INVITE' ? 'Enviar Convite' : 'Confirmar Aceite'}
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
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  container: {
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.secondary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.light.text,
    flex: 1,
  },
  subTitle: {
    fontSize: FontSize.sm,
    color: Colors.light.textSecondary,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.surfaceLight,
    gap: 12,
  },
  roleCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08',
  },
  roleIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.light.text,
  },
  badgeTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
  },
  roleDesc: {
    fontSize: FontSize.xs,
    color: Colors.light.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
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
  cancelText: {
    color: Colors.light.textMuted,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});
