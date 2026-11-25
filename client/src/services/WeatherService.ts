import * as Location from 'expo-location';

export interface WeatherData {
  temperature: number;
  weatherCode: number;
  isRaining: boolean;
  locationName: string;
  conditionDescription: string;
  iconName: string;
  recommendationAdvice: string;
}

/**
 * Thời tiết "trung tính" CHỈ dùng cho engine gợi ý khi thiếu dữ liệu thật
 * (26°C nằm giữa ngưỡng lạnh 22° và nóng 32° nên không ưu tiên món nào).
 * KHÔNG hiển thị cho người dùng như thể là thời tiết thật.
 */
export const DEFAULT_WEATHER: WeatherData = {
  temperature: 26,
  weatherCode: 2,
  isRaining: false,
  locationName: 'Hà Nội',
  conditionDescription: 'trời dịu mát',
  iconName: 'partly-sunny-outline',
  recommendationAdvice: 'Tham khảo thêm, không bắt buộc khi phối đồ',
};

export type LocationPermission = 'granted' | 'denied' | 'undetermined';

// Cache kết quả thời tiết 20 phút để tiết kiệm pin và băng thông
let cachedWeather: WeatherData | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 20 * 60 * 1000;
// Mất mạng thì vẫn dùng bản cache cũ tối đa 3 giờ (mới hơn thì hiện, cũ hơn thì ẩn)
const STALE_MAX_MS = 3 * 60 * 60 * 1000;

export class WeatherService {
  /** Thời tiết trung tính cho engine (không hiển thị). */
  static getDefaultWeather(): WeatherData {
    return DEFAULT_WEATHER;
  }

  /** Trạng thái quyền vị trí mà KHÔNG làm hiện hộp thoại xin quyền. */
  static async getPermissionStatus(): Promise<LocationPermission> {
    try {
      const res = await Location.getForegroundPermissionsAsync();
      if (res.granted) return 'granted';
      if (res.status === Location.PermissionStatus.UNDETERMINED) return 'undetermined';
      return 'denied';
    } catch {
      return 'denied';
    }
  }

  /**
   * Lấy thời tiết thật qua GPS + Open-Meteo.
   * - Trả `null` khi chưa có quyền vị trí, mất mạng hoặc lỗi: giao diện phải ẩn thẻ thời tiết,
   *   việc phối đồ vẫn chạy bình thường (engine dùng `getDefaultWeather()`).
   * - Chỉ hiện hộp thoại xin quyền khi `askPermission = true` (sau màn giải thích của Closy).
   */
  static async getCurrentWeather(
    options: { forceRefresh?: boolean; askPermission?: boolean } = {},
  ): Promise<WeatherData | null> {
    const { forceRefresh = false, askPermission = false } = options;
    const now = Date.now();
    if (!forceRefresh && cachedWeather && now - lastFetchTime < CACHE_TTL_MS) {
      return cachedWeather;
    }

    try {
      let status = await this.getPermissionStatus();
      if (status !== 'granted' && askPermission) {
        const res = await Location.requestForegroundPermissionsAsync();
        status = res.granted ? 'granted' : 'denied';
      }
      if (status !== 'granted') {
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = location.coords;

      let locationName = 'Vị trí của bạn';
      try {
        const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (addresses && addresses.length > 0) {
          const addr = addresses[0];
          locationName =
            addr.city || addr.subregion || addr.region || addr.district || addr.name || locationName;
        }
      } catch (geoError) {
        console.log('[WeatherService] Lỗi dịch ngược tọa độ, dùng tên mặc định:', geoError);
      }

      const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`Open-Meteo trả về mã lỗi ${response.status}`);
      }

      const data = await response.json();
      const current = data?.current_weather;
      if (!current) {
        throw new Error('Không có dữ liệu current_weather từ Open-Meteo');
      }

      const temperature = Math.round(current.temperature);
      const weatherCode = Number(current.weathercode ?? 0);
      const { isRaining, iconName, conditionText } = this.parseWmoCode(weatherCode, temperature);

      let recommendationAdvice = 'Thời tiết dịu mát, thoải mái phối đồ theo sở thích';
      if (temperature < 22 || isRaining) {
        recommendationAdvice = isRaining
          ? 'Trời có mưa: Nhắc thêm áo khoác, quần dài & mang ô nhé'
          : 'Trời se lạnh: Ưu tiên áo khoác, áo dài tay & quần dài';
      } else if (temperature > 32) {
        recommendationAdvice = 'Trời nắng nóng: Ưu tiên áo thun cộc tay, mỏng nhẹ, màu sáng';
      }

      const parsedWeather: WeatherData = {
        temperature,
        weatherCode,
        isRaining,
        locationName,
        conditionDescription: conditionText,
        iconName,
        recommendationAdvice,
      };

      cachedWeather = parsedWeather;
      lastFetchTime = now;
      return parsedWeather;
    } catch (error) {
      console.warn('[WeatherService] Lỗi lấy thời tiết:', error);
      // Offline: dùng bản cache chưa quá cũ, nếu không thì ẩn thời tiết
      if (cachedWeather && now - lastFetchTime < STALE_MAX_MS) {
        return cachedWeather;
      }
      return null;
    }
  }

  /** Diễn giải mã thời tiết WMO của Open-Meteo sang tiếng Việt và icon */
  private static parseWmoCode(
    code: number,
    temp: number,
  ): { isRaining: boolean; iconName: string; conditionText: string } {
    if (code >= 95) {
      return { isRaining: true, iconName: 'thunderstorm-outline', conditionText: 'mưa dông' };
    }
    if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
      return { isRaining: true, iconName: 'rainy-outline', conditionText: 'trời có mưa' };
    }
    if (code >= 51 && code <= 57) {
      return { isRaining: true, iconName: 'rainy-outline', conditionText: 'mưa phùn nhẹ' };
    }
    if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
      return { isRaining: false, iconName: 'snow-outline', conditionText: 'có tuyết' };
    }
    if (code === 45 || code === 48) {
      return { isRaining: false, iconName: 'cloudy-outline', conditionText: 'trời nhiều sương mù' };
    }
    if (code === 3) {
      return { isRaining: false, iconName: 'cloudy-outline', conditionText: 'trời nhiều mây' };
    }
    if (code === 1 || code === 2) {
      return {
        isRaining: false,
        iconName: 'partly-sunny-outline',
        conditionText: temp < 22 ? 'trời se lạnh' : temp > 32 ? 'nắng dịu' : 'trời dịu mát',
      };
    }
    return {
      isRaining: false,
      iconName: 'sunny-outline',
      conditionText: temp > 32 ? 'trời nắng nóng' : 'trời nắng đẹp',
    };
  }
}
