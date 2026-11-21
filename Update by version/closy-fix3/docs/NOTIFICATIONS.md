# Thiết kế: lịch và thông báo nhắc sự kiện (chưa code)

Bảng `planned_events` đã có sẵn cột `remind_at` (mặc định = trước sự kiện 1 ngày, do `EventService.add` điền).

## Đề xuất: local notification (không cần server push)
- Thư viện: `expo-notifications`.
- Khi lưu sự kiện: `scheduleNotificationAsync({ content: { title, body }, trigger: { date: remind_at 08:00 } })`, lưu `notification_id` vào bảng (cần migration v5).
- Khi xóa sự kiện: `cancelScheduledNotificationAsync(notification_id)`.
- Xin quyền thông báo đúng lúc người dùng lưu sự kiện đầu tiên (contextual permission).
- Android 13+: cần quyền `POST_NOTIFICATIONS` và một notification channel.
- Khi bấm thông báo: mở thẳng `/events`.

## Vì sao không dùng server push
Cần FCM, token thiết bị và server luôn online. Laptop làm server không bảo đảm điều đó. Local notification chạy offline và không gửi thêm dữ liệu lên server.

## Việc còn mở
Chốt local notification hay server push (backlog mục 12, số 3).
