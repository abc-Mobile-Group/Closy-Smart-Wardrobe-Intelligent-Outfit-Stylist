import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../constants/theme';
import { useAuthStore } from '../store/authStore';

type ProfileModalProps = {
  visible: boolean;
  onClose: () => void;
};

export default function ProfileModal({ visible, onClose }: ProfileModalProps) {
  const { email, name, busy, updateName, signOut } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(name || '');
  const [saving, setSaving] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const displayName = name || (email ? email.split('@')[0] : 'Bạn mới');
  const initial = displayName.charAt(0).toUpperCase();

  const handleStartEdit = () => {
    setNewName(displayName);
    setEditing(true);
  };

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    await updateName(newName.trim());
    setSaving(false);
    setEditing(false);
  };

  const handleSignOut = async () => {
    onClose();
    await signOut();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {/* Click outside to close */}
        <Pressable style={styles.dismissOverlay} onPress={onClose} />

        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Tài khoản cá nhân</Text>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Profile Overview */}
          <View style={styles.profileSection}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
              <View style={styles.activeDot} />
            </View>

            {editing ? (
              <View style={styles.editRow}>
                <TextInput
                  style={styles.nameInput}
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="Nhập họ và tên"
                  autoFocus
                />
                <Pressable
                  style={styles.saveNameBtn}
                  onPress={handleSaveName}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveNameText}>Lưu</Text>
                  )}
                </Pressable>
                <Pressable
                  style={styles.cancelEditBtn}
                  onPress={() => setEditing(false)}
                >
                  <Text style={styles.cancelEditText}>Hủy</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.nameRow}>
                <Text style={styles.nameText}>{displayName}</Text>
                <Pressable onPress={handleStartEdit} hitSlop={8} style={styles.editIconBtn}>
                  <Ionicons name="pencil-outline" size={15} color={colors.primary} />
                </Pressable>
              </View>
            )}

            <View style={styles.emailBadge}>
              <Ionicons name="mail-outline" size={13} color={colors.textMuted} />
              <Text style={styles.emailText}>{email || 'Chưa có email'}</Text>
              <View style={styles.verifiedTag}>
                <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                <Text style={styles.verifiedText}>Đã xác thực</Text>
              </View>
            </View>
          </View>

          {/* Wardrobe & Settings Info */}
          <View style={styles.infoGroup}>
            <View style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <Ionicons name="shirt-outline" size={17} color={colors.primary} />
                <Text style={styles.infoLabel}>Tủ đồ của bạn</Text>
              </View>
              <Text style={styles.infoValue}>7 món trang phục</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <Ionicons name="color-palette-outline" size={17} color={colors.primary} />
                <Text style={styles.infoLabel}>Phong cách chính</Text>
              </View>
              <Text style={styles.infoValue}>Tối giản (Minimal)</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <Ionicons name="shield-checkmark-outline" size={17} color={colors.primary} />
                <Text style={styles.infoLabel}>Bảo mật dữ liệu</Text>
              </View>
              <Text style={styles.infoValue}>Local-first trên máy</Text>
            </View>
          </View>

          {/* Logout Section */}
          <View style={styles.footerSection}>
            {confirmSignOut ? (
              <View style={styles.confirmBox}>
                <Text style={styles.confirmTitle}>Bạn chắc chắn muốn đăng xuất?</Text>
                <View style={styles.confirmButtons}>
                  <Pressable
                    style={styles.cancelSignOutBtn}
                    onPress={() => setConfirmSignOut(false)}
                  >
                    <Text style={styles.cancelSignOutText}>Hủy</Text>
                  </Pressable>
                  <Pressable
                    style={styles.confirmSignOutBtn}
                    onPress={handleSignOut}
                  >
                    <Text style={styles.confirmSignOutText}>Đăng xuất ngay</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                style={styles.signOutBtn}
                onPress={() => setConfirmSignOut(true)}
              >
                <Ionicons name="log-out-outline" size={18} color={colors.danger} />
                <Text style={styles.signOutText}>Đăng xuất tài khoản</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  dismissOverlay: {
    ...StyleSheet.absoluteFill,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    ...Platform.select({
      web: {
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      } as any,
      default: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSection: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: spacing.xs,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#BAE6FD',
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary,
  },
  activeDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nameText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  editIconBtn: {
    padding: 4,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    marginVertical: 4,
  },
  nameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: colors.text,
    backgroundColor: '#FFFFFF',
  },
  saveNameBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.md,
  },
  saveNameText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  cancelEditBtn: {
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  cancelEditText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceCard,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  emailText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.success,
  },
  infoGroup: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  footerSection: {
    marginTop: spacing.xs,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: radius.lg,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.danger,
  },
  confirmBox: {
    backgroundColor: '#FEF2F2',
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
  confirmTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.danger,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelSignOutBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelSignOutText: {
    fontSize: 13,
    color: colors.text,
  },
  confirmSignOutBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: colors.danger,
  },
  confirmSignOutText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
