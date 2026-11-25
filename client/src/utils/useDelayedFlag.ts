import { useEffect, useState } from 'react';

/**
 * Chỉ trả true khi `flag` đã bật liên tục quá `delayMs`.
 * Dùng cho loading: tác vụ nhanh (< 300 ms) thì không hiện skeleton, tránh nháy màn hình.
 */
export function useDelayedFlag(flag: boolean, delayMs = 300): boolean {
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!flag) {
      setOn(false);
      return;
    }
    const timer = setTimeout(() => setOn(true), delayMs);
    return () => clearTimeout(timer);
  }, [flag, delayMs]);

  return on;
}
