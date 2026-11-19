import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';

export interface MorningNotificationSettings {
  enabled: boolean;
  hour: number;
  minute: number;
  scheduledNotificationId?: string | null;
}

export interface TimePreset {
  id: string;
  label: string;
  hour: number;
  minute: number;
}

const SETTINGS_STORAGE_KEY = 'closy_morning_notification_settings';
const ANDROID_CHANNEL_ID = 'closy-morning-reminder';

let isHandlerConfigured = false;
let memorySettings: MorningNotificationSettings | null = null;
let lastHandledNotificationId: string | null = null;

export class NotificationService {
  static readonly DEFAULT_HOUR = 7;
  static readonly DEFAULT_MINUTE = 30;
  static readonly TARGET_ROUTE = '/(tabs)/today';
  static readonly MORNING_TITLE = 'Hôm nay bạn đi đâu?';
  static readonly MORNING_BODY =
    'Chào buổi sáng! Hôm nay bạn đi đâu? Cùng Closy chọn bộ đồ hợp thời tiết nhé.';

  static readonly TIME_PRESETS: TimePreset[] = [
    { id: '07:00', label: '07:00', hour: 7, minute: 0 },
    { id: '07:30', label: '07:30', hour: 7, minute: 30 },
    { id: '08:00', label: '08:00', hour: 8, minute: 0 },
  ];

  static readonly DEFAULT_SETTINGS: MorningNotificationSettings = {
    enabled: false,
    hour: NotificationService.DEFAULT_HOUR,
    minute: NotificationService.DEFAULT_MINUTE,
    scheduledNotificationId: null,
  };

  /**
   * Format giờ:phút dạng HH:mm (ví dụ: 07:30)
   */
  static formatTime(hour: number, minute: number): string {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  /**
   * Cấu hình cách hiển thị thông báo khi app đang mở (foreground)
   */
  static configureNotificationHandler(): void {
    if (Platform.OS === 'web' || isHandlerConfigured) return;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    isHandlerConfigured = true;
  }

  /**
   * Tạo Notification Channel chuẩn trên Android để thông báo cục bộ hiển thị ổn định
   */
  private static async ensureAndroidChannel(): Promise<void> {
    if (Platform.OS !== 'android') return;
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Gợi ý trang phục buổi sáng',
      description: 'Nhắc nhở nhẹ hàng sáng để mở Closy chọn bộ đồ phù hợp thời tiết',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
      vibrationPattern: [0, 200, 150, 200],
    });
  }

  /**
   * Đọc cài đặt thông báo cục bộ đã lưu trên thiết bị
   */
  static async getSettings(): Promise<MorningNotificationSettings> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
          if (raw) return { ...this.DEFAULT_SETTINGS, ...JSON.parse(raw) };
        }
        return memorySettings ?? { ...this.DEFAULT_SETTINGS };
      }

      const raw = await SecureStore.getItemAsync(SETTINGS_STORAGE_KEY);
      if (raw) {
        return { ...this.DEFAULT_SETTINGS, ...JSON.parse(raw) };
      }
      return memorySettings ?? { ...this.DEFAULT_SETTINGS };
    } catch (e) {
      console.warn('[NotificationService] Lỗi đọc cài đặt thông báo:', e);
      return memorySettings ?? { ...this.DEFAULT_SETTINGS };
    }
  }

  /**
   * Lưu cài đặt thông báo cục bộ trên thiết bị
   */
  static async saveSettings(settings: MorningNotificationSettings): Promise<void> {
    memorySettings = settings;
    try {
      const payload = JSON.stringify(settings);
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(SETTINGS_STORAGE_KEY, payload);
        }
        return;
      }
      await SecureStore.setItemAsync(SETTINGS_STORAGE_KEY, payload);
    } catch (e) {
      console.warn('[NotificationService] Lỗi lưu cài đặt thông báo:', e);
    }
  }

  /**
   * Kiểm tra trạng thái quyền thông báo hiện tại (không bật popup hệ thống)
   */
  static async getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined' | 'unsupported'> {
    if (Platform.OS === 'web') return 'unsupported';
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status;
    } catch {
      return 'undetermined';
    }
  }

  /**
   * Xin quyền thông báo một cách chủ động (chỉ gọi sau khi người dùng đồng ý ở ngữ cảnh rõ ràng)
   */
  static async requestPermission(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    try {
      const existing = await Notifications.getPermissionsAsync();
      if (existing.status === 'granted') {
        return true;
      }
      const requested = await Notifications.requestPermissionsAsync();
      return requested.status === 'granted';
    } catch (e) {
      console.warn('[NotificationService] Lỗi xin quyền thông báo:', e);
      return false;
    }
  }

  /**
   * Hủy thông báo buổi sáng đã lên lịch trước đó (nếu có)
   */
  private static async cancelExistingMorningReminders(savedId?: string | null): Promise<void> {
    if (Platform.OS === 'web') return;
    try {
      if (savedId) {
        await Notifications.cancelScheduledNotificationAsync(savedId);
      }
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const req of scheduled) {
        if (req.content.data?.type === 'morning_outfit_reminder') {
          await Notifications.cancelScheduledNotificationAsync(req.identifier);
        }
      }
    } catch (e) {
      console.warn('[NotificationService] Lỗi hủy lịch thông báo cũ:', e);
    }
  }

  /**
   * Bật và lên lịch Local Scheduled Notification hàng ngày tại giờ/phút chỉ định (mặc định 07:30)
   */
  static async scheduleMorningReminder(
    hour: number = this.DEFAULT_HOUR,
    minute: number = this.DEFAULT_MINUTE,
  ): Promise<{ success: boolean; settings: MorningNotificationSettings; reason?: string }> {
    const current = await this.getSettings();

    if (Platform.OS === 'web') {
      const next: MorningNotificationSettings = {
        enabled: true,
        hour,
        minute,
        scheduledNotificationId: null,
      };
      await this.saveSettings(next);
      return {
        success: true,
        settings: next,
        reason: 'Đã lưu khung giờ nhắc nhở (thông báo đẩy cục bộ hoạt động trên ứng dụng Android/iOS).',
      };
    }

    const granted = await this.requestPermission();
    if (!granted) {
      const next: MorningNotificationSettings = {
        ...current,
        enabled: false,
        hour,
        minute,
        scheduledNotificationId: null,
      };
      await this.saveSettings(next);
      return {
        success: false,
        settings: next,
        reason: 'Bạn chưa cấp quyền thông báo cho Closy. Vui lòng bật quyền thông báo trong Cài đặt thiết bị.',
      };
    }

    try {
      this.configureNotificationHandler();
      await this.ensureAndroidChannel();
      await this.cancelExistingMorningReminders(current.scheduledNotificationId);

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: this.MORNING_TITLE,
          body: this.MORNING_BODY,
          sound: 'default',
          data: {
            type: 'morning_outfit_reminder',
            route: this.TARGET_ROUTE,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
        },
      });

      const next: MorningNotificationSettings = {
        enabled: true,
        hour,
        minute,
        scheduledNotificationId: identifier,
      };
      await this.saveSettings(next);

      return { success: true, settings: next };
    } catch (e: any) {
      console.warn('[NotificationService] Lỗi đặt lịch thông báo sáng:', e);
      return {
        success: false,
        settings: current,
        reason: e?.message || 'Không thể đặt lịch thông báo trên thiết bị này.',
      };
    }
  }

  /**
   * Tắt thông báo nhắc nhở buổi sáng và hủy lịch đã đặt trên thiết bị
   */
  static async disableMorningReminder(): Promise<MorningNotificationSettings> {
    const current = await this.getSettings();
    await this.cancelExistingMorningReminders(current.scheduledNotificationId);

    const next: MorningNotificationSettings = {
      ...current,
      enabled: false,
      scheduledNotificationId: null,
    };
    await this.saveSettings(next);
    return next;
  }

  /**
   * Đồng bộ lại lịch thông báo khi khởi động app (chỉ khi người dùng đã bật và đã cấp quyền từ trước)
   */
  static async syncScheduledReminderOnLaunch(): Promise<void> {
    if (Platform.OS === 'web') return;
    this.configureNotificationHandler();
    const settings = await this.getSettings();
    if (!settings.enabled) return;

    const permission = await this.getPermissionStatus();
    if (permission !== 'granted') return;

    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const hasActive = scheduled.some(
        (req) => req.content.data?.type === 'morning_outfit_reminder',
      );
      if (!hasActive) {
        await this.scheduleMorningReminder(settings.hour, settings.minute);
      }
    } catch (e) {
      console.warn('[NotificationService] Lỗi đồng bộ lịch thông báo khi mở app:', e);
    }
  }

  /**
   * Lắng nghe sự kiện người dùng chạm vào thông báo (cả khi app đang chạy nền lẫn khi mở từ trạng thái tắt)
   * và gọi callback điều hướng thẳng vào màn hình Hôm nay (/(tabs)/today).
   */
  static subscribeToNotificationResponses(onNavigateToToday: () => void): () => void {
    if (Platform.OS === 'web') {
      return () => {};
    }

    const handleResponse = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const reqId = response.notification.request.identifier;
      if (reqId && reqId === lastHandledNotificationId) return;

      const data = response.notification.request.content.data;
      if (
        !data ||
        data.route === this.TARGET_ROUTE ||
        data.type === 'morning_outfit_reminder'
      ) {
        lastHandledNotificationId = reqId || `${Date.now()}`;
        onNavigateToToday();
      }
    };

    // 1. Kiểm tra trường hợp app vừa được khởi chạy do người dùng chạm vào thông báo
    Notifications.getLastNotificationResponseAsync()
      .then((lastResponse) => handleResponse(lastResponse))
      .catch((e) => console.warn('[NotificationService] Lỗi đọc lastNotificationResponse:', e));

    // 2. Lắng nghe sự kiện bấm thông báo khi app đang mở hoặc ở nền
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      handleResponse(response);
    });

    return () => {
      subscription.remove();
    };
  }
}
