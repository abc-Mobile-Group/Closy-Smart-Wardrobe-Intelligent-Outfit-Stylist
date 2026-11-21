import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../constants/theme';
import { useAuthStore } from '../store/authStore';
import { useWardrobeStore } from '../store/wardrobeStore';
import {
  MorningNotificationSettings,
  NotificationService,
} from '../services/NotificationService';
import { BackupService, InspectedBackup } from '../services/BackupService';

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

  // Issue #27: Cài đặt thông báo cục bộ gợi ý đồ sáng sớm
  const [notifSettings, setNotifSettings] = useState<MorningNotificationSettings>(
    NotificationService.DEFAULT_SETTINGS,
  );
  const [notifBusy, setNotifBusy] = useState(false);
  const [notifFeedback, setNotifFeedback] = useState<string | null>(null);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

  // Issue #28: Sao lưu & Khôi phục dữ liệu tủ đồ (.closy / .json)
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupFeedback, setBackupFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [pendingRestore, setPendingRestore] = useState<InspectedBackup | null>(null);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    setNotifFeedback(null);
    setShowPermissionPrompt(false);
    setBackupFeedback(null);
    setPendingRestore(null);
    NotificationService.getSettings().then((saved) => {
      if (active) setNotifSettings(saved);
    });
    return () => {
      active = false;
    };
  }, [visible]);

  const applyEnableReminder = async (hour: number, minute: number) => {
    setNotifBusy(true);
    setNotifFeedback(null);
    setShowPermissionPrompt(false);
    const res = await NotificationService.scheduleMorningReminder(hour, minute);
    setNotifSettings(res.settings);
    if (res.success) {
      setNotifFeedback(
        res.reason ||
          `Đã đặt lịch nhắc mỗi sáng lúc ${NotificationService.formatTime(hour, minute)}.`,
      );
    } else {
      setNotifFeedback(res.reason || 'Không thể bật thông báo nhắc nhở.');
    }
    setNotifBusy(false);
  };

  const handleToggleNotification = async (nextValue: boolean) => {
    if (notifBusy) return;
    if (!nextValue) {
      setNotifBusy(true);
      setShowPermissionPrompt(false);
      const updated = await NotificationService.disableMorningReminder();
      setNotifSettings(updated);
      setNotifFeedback('Đã tắt thông báo gợi ý đồ buổi sáng.');
      setNotifBusy(false);
      return;
    }

    // Contextual permission: kiểm tra quyền trước khi bật system dialog
    const permStatus = await NotificationService.getPermissionStatus();
    if (permStatus === 'granted' || permStatus === 'unsupported') {
      await applyEnableReminder(notifSettings.hour, notifSettings.minute);
    } else {
      setNotifFeedback(null);
      setShowPermissionPrompt(true);
    }
  };

  const handleSelectTimePreset = async (hour: number, minute: number) => {
    if (notifBusy) return;
    const nextSettings: MorningNotificationSettings = {
      ...notifSettings,
      hour,
      minute,
    };
    setNotifSettings(nextSettings);

    if (notifSettings.enabled) {
      await applyEnableReminder(hour, minute);
    } else {
      await NotificationService.saveSettings(nextSettings);
      setNotifFeedback(
        `Đã chọn khung giờ ${NotificationService.formatTime(hour, minute)}. Bật công tắc để nhận nhắc nhở hàng ngày.`,
      );
    }
  };

  // Issue #28: Xuất bản sao lưu .closy và mở bảng chia sẻ hệ thống
  const handleBackupWardrobe = async () => {
    if (backupBusy) return;
    setBackupBusy(true);
    setBackupFeedback(null);
    setPendingRestore(null);
    try {
      const result = await BackupService.exportAndShareBackup();
      setBackupFeedback({
        type: 'success',
        message: `Đã sao lưu ${result.metadata.counts.items} món đồ và ${result.metadata.counts.images} tệp ảnh (${result.fileName}).`,
      });
    } catch (e: any) {
      setBackupFeedback({
        type: 'error',
        message: e?.message || 'Không thể tạo tệp sao lưu tủ đồ.',
      });
    } finally {
      setBackupBusy(false);
    }
  };

  // Issue #28: Chọn tệp sao lưu .closy / .json và kiểm tra toàn vẹn (Checksum / Version)
  const handlePickRestoreFile = async () => {
    if (backupBusy) return;
    setBackupBusy(true);
    setBackupFeedback(null);
    setPendingRestore(null);
    try {
      const inspected = await BackupService.pickAndInspectBackup();
      if (!inspected) {
        return;
      }
      // Mở hộp thông báo xác nhận an toàn trước khi ghi đè dữ liệu
      setPendingRestore(inspected);
    } catch (e: any) {
      setBackupFeedback({
        type: 'error',
        message: e?.message || 'Tệp sao lưu không hợp lệ hoặc đã bị hỏng.',
      });
    } finally {
      setBackupBusy(false);
    }
  };

  // Issue #28: Xác nhận ghi đè dữ liệu & giải nén ảnh + nạp lại SQLite
  const handleConfirmRestore = async () => {
    if (!pendingRestore || backupBusy) return;
    setBackupBusy(true);
    setBackupFeedback(null);
    try {
      const summary = await BackupService.restoreFromInspectedBackup(pendingRestore);
      await useWardrobeStore.getState().loadItems();
      setPendingRestore(null);
      setBackupFeedback({
        type: 'success',
        message: `Khôi phục thành công ${summary.itemsRestored} món đồ, ${summary.historyRestored + summary.outfitsRestored} nhật ký mặc đồ và ${summary.imagesRestored} tệp ảnh.`,
      });
    } catch (e: any) {
      setBackupFeedback({
        type: 'error',
        message: e?.message || 'Khôi phục dữ liệu thất bại. Dữ liệu cũ vẫn được bảo vệ.',
      });
    } finally {
      setBackupBusy(false);
    }
  };

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

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >

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

          {/* Issue #27: Cài đặt Thông báo cục bộ gợi ý đồ sáng sớm */}
          <View style={styles.notifCard}>
            <View style={styles.notifHeaderRow}>
              <View style={styles.notifTitleGroup}>
                <Ionicons name="notifications-outline" size={17} color={colors.primary} />
                <View style={styles.notifTextCol}>
                  <Text style={styles.notifTitle}>Nhắc phối đồ buổi sáng</Text>
                  <Text style={styles.notifSubtitle}>
                    Mỗi ngày lúc {NotificationService.formatTime(notifSettings.hour, notifSettings.minute)}
                  </Text>
                </View>
              </View>
              <Switch
                value={notifSettings.enabled}
                onValueChange={handleToggleNotification}
                disabled={notifBusy}
                trackColor={{ false: colors.border, true: '#BAE6FD' }}
                thumbColor={notifSettings.enabled ? colors.primary : '#FFFFFF'}
              />
            </View>

            {/* Contextual Permission Prompt */}
            {showPermissionPrompt && (
              <View style={styles.permissionBox}>
                <Text style={styles.permissionText}>
                  Closy sẽ gửi 1 thông báo nhẹ lúc{' '}
                  {NotificationService.formatTime(notifSettings.hour, notifSettings.minute)} mỗi sáng hỏi
                  &ldquo;Hôm nay bạn đi đâu?&rdquo; để bạn mở app phối đồ ngay. Cho phép nhận thông báo nhé?
                </Text>
                <View style={styles.permissionActions}>
                  <Pressable
                    style={styles.permissionDeclineBtn}
                    onPress={() => setShowPermissionPrompt(false)}
                  >
                    <Text style={styles.permissionDeclineText}>Để sau</Text>
                  </Pressable>
                  <Pressable
                    style={styles.permissionAllowBtn}
                    onPress={() => applyEnableReminder(notifSettings.hour, notifSettings.minute)}
                    disabled={notifBusy}
                  >
                    <Text style={styles.permissionAllowText}>Cho phép</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Chọn khung giờ nhắc nhở: 07:00, 07:30, 08:00 */}
            <View style={styles.timePresetRow}>
              <Text style={styles.timePresetLabel}>Khung giờ:</Text>
              <View style={styles.timePresetChips}>
                {NotificationService.TIME_PRESETS.map((preset) => {
                  const active =
                    notifSettings.hour === preset.hour && notifSettings.minute === preset.minute;
                  return (
                    <Pressable
                      key={preset.id}
                      style={[styles.timeChip, active && styles.timeChipActive]}
                      onPress={() => handleSelectTimePreset(preset.hour, preset.minute)}
                      disabled={notifBusy}
                    >
                      <Text style={[styles.timeChipText, active && styles.timeChipTextActive]}>
                        {preset.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {!!notifFeedback && (
              <Text style={styles.notifFeedbackText}>{notifFeedback}</Text>
            )}
          </View>

          {/* Issue #28: Sao lưu & Khôi phục dữ liệu Tủ đồ (Local-First) */}
          <View style={styles.backupCard}>
            <View style={styles.backupHeader}>
              <Ionicons name="archive-outline" size={17} color={colors.primary} />
              <View style={styles.notifTextCol}>
                <Text style={styles.notifTitle}>Sao lưu & Khôi phục tủ đồ</Text>
                <Text style={styles.notifSubtitle}>
                  Đóng gói SQLite + ảnh (.closy) để chuyển máy an toàn
                </Text>
              </View>
            </View>

            <View style={styles.backupActionsRow}>
              <Pressable
                style={[styles.backupPrimaryBtn, backupBusy && styles.backupBtnDisabled]}
                onPress={handleBackupWardrobe}
                disabled={backupBusy}
              >
                {backupBusy && !pendingRestore ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={15} color="#FFFFFF" />
                    <Text style={styles.backupPrimaryText}>Sao lưu tủ đồ</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={[styles.backupSecondaryBtn, backupBusy && styles.backupBtnDisabled]}
                onPress={handlePickRestoreFile}
                disabled={backupBusy}
              >
                <Ionicons name="cloud-download-outline" size={15} color={colors.primary} />
                <Text style={styles.backupSecondaryText}>Khôi phục dữ liệu</Text>
              </Pressable>
            </View>

            {/* Thông báo xác nhận an toàn trước khi ghi đè dữ liệu (Issue #28) */}
            {pendingRestore && (
              <View style={styles.restoreConfirmBox}>
                <View style={styles.restoreConfirmHeader}>
                  <Ionicons name="warning-outline" size={16} color="#B45309" />
                  <Text style={styles.restoreConfirmTitle}>
                    Xác nhận ghi đè dữ liệu tủ đồ?
                  </Text>
                </View>
                <Text style={styles.restoreConfirmDesc}>
                  Tệp: {pendingRestore.fileName} (v{pendingRestore.document.metadata.version} · Đã xác thực Checksum)
                  {'\n'}Nội dung: {pendingRestore.document.metadata.counts.items} món đồ,{' '}
                  {pendingRestore.document.metadata.counts.images} ảnh,{' '}
                  {pendingRestore.document.metadata.counts.history +
                    pendingRestore.document.metadata.counts.outfits}{' '}
                  nhật ký mặc đồ.
                  {'\n'}Toàn bộ dữ liệu tủ đồ hiện tại trên máy sẽ được thay thế bằng bản sao lưu này.
                </Text>
                <View style={styles.permissionActions}>
                  <Pressable
                    style={styles.permissionDeclineBtn}
                    onPress={() => setPendingRestore(null)}
                    disabled={backupBusy}
                  >
                    <Text style={styles.permissionDeclineText}>Hủy</Text>
                  </Pressable>
                  <Pressable
                    style={styles.restoreConfirmBtn}
                    onPress={handleConfirmRestore}
                    disabled={backupBusy}
                  >
                    {backupBusy ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.restoreConfirmBtnText}>Xác nhận khôi phục</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}

            {backupFeedback && (
              <Text
                style={[
                  styles.backupFeedbackText,
                  backupFeedback.type === 'error' && styles.backupFeedbackError,
                ]}
              >
                {backupFeedback.message}
              </Text>
            )}
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
          </ScrollView>
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
    maxHeight: '90%',
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
  scrollContent: {
    gap: spacing.md,
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
  // Issue #27: Morning Local Notification settings
  notifCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  notifTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  notifTextCol: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  notifSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  permissionBox: {
    backgroundColor: '#F0F9FB',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    padding: spacing.sm + 2,
    gap: spacing.sm,
  },
  permissionText: {
    fontSize: 11,
    color: colors.text,
    lineHeight: 16,
  },
  permissionActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs + 2,
  },
  permissionDeclineBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  permissionDeclineText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  permissionAllowBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  permissionAllowText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  timePresetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  timePresetLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  timePresetChips: {
    flexDirection: 'row',
    gap: 6,
  },
  timeChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  timeChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  notifFeedbackText: {
    fontSize: 11,
    color: colors.primary,
    lineHeight: 15,
  },
  // Issue #28: Backup & Restore section
  backupCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  backupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backupActionsRow: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
  },
  backupPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  backupPrimaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  backupSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: radius.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  backupSecondaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  backupBtnDisabled: {
    opacity: 0.6,
  },
  restoreConfirmBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: spacing.sm + 2,
    gap: spacing.xs + 2,
  },
  restoreConfirmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  restoreConfirmTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  restoreConfirmDesc: {
    fontSize: 11,
    color: '#78350F',
    lineHeight: 16,
  },
  restoreConfirmBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.md,
    backgroundColor: '#D97706',
  },
  restoreConfirmBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  backupFeedbackText: {
    fontSize: 11,
    color: colors.success,
    lineHeight: 16,
    fontWeight: '600',
  },
  backupFeedbackError: {
    color: colors.danger,
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
