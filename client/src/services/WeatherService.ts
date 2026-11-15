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

// Thời tiết mặc định (Fallback khi không có mạng hoặc từ chối GPS)
export const DEFAULT_WEATHER: WeatherData = {
  temperature: 26,
  weatherCode: 2,
  isRaining: false,
  locationName: 'Hà Nội',
  conditionDescription: 'trời dịu mát',
  iconName: 'partly-sunny-outline',
  recommendationAdvice: 'Tham khảo thêm, không bắt buộc khi phối đồ',
};

// Cache kết quả thời tiết trong 20 phút để tiết kiệm pin và băng thông
let cachedWeather: WeatherData | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 20 * 60 * 1000;

export class WeatherService {
  /**
   * Lấy thời tiết mặc định
   */
  static getDefaultWeather(): WeatherData {
    return DEFAULT_WEATHER;
  }

  /**
   * Lấy thông tin thời tiết hiện tại qua Open-Meteo và GPS thiết bị
   * Tuân thủ DoD:
   * - Sử dụng API Open-Meteo miễn phí, không cần key, bảo vệ quyền riêng tư.
   * - Fallback êm ái về 26°C Hà Nội nếu lỗi hoặc không có GPS/Internet.
   */
  static async getCurrentWeather(forceRefresh = false): Promise<WeatherData> {
    const now = Date.now();
    if (!forceRefresh && cachedWeather && now - lastFetchTime < CACHE_TTL_MS) {
      return cachedWeather;
    }

    try {
      // 1. Xin quyền truy cập vị trí
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('[WeatherService] Quyền GPS bị từ chối, kích hoạt fallback thời tiết mặc định');
        cachedWeather = DEFAULT_WEATHER;
        lastFetchTime = now;
        return DEFAULT_WEATHER;
      }

      // 2. Lấy tọa độ GPS (Độ chính xác Balanced để lấy nhanh và tiết kiệm pin)
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;

      // 3. Lấy tên địa phương (Reverse Geocoding)
      let locationName = 'Vị trí của bạn';
      try {
        const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (addresses && addresses.length > 0) {
          const addr = addresses[0];
          locationName =
            addr.city || addr.subregion || addr.region || addr.district || addr.name || 'Hà Nội';
        }
      } catch (geoError) {
        console.log('[WeatherService] Lỗi dịch ngược tọa độ, dùng tên mặc định:', geoError);
      }

      // 4. Gọi API Open-Meteo
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

      // 5. Phân tích mã thời tiết chuẩn WMO
      const { isRaining, iconName, conditionText } = this.parseWmoCode(weatherCode, temperature);

      // 6. Quy tắc ảnh hưởng đến lời khuyên gợi ý trang phục (DoD)
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
      console.warn('[WeatherService] Lỗi lấy thời tiết, sử dụng fallback mặc định:', error);
      cachedWeather = DEFAULT_WEATHER;
      lastFetchTime = now;
      return DEFAULT_WEATHER;
    }
  }

  /**
   * Diễn giải mã thời tiết WMO của Open-Meteo sang ngôn ngữ tiếng Việt và Icon
   */
  private static parseWmoCode(
    code: number,
    temp: number,
  ): { isRaining: boolean; iconName: string; conditionText: string } {
    // Mưa dông, sấm sét
    if (code >= 95) {
      return { isRaining: true, iconName: 'thunderstorm-outline', conditionText: 'mưa dông' };
    }
    // Mưa rào, mưa lớn, mưa vừa
    if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
      return { isRaining: true, iconName: 'rainy-outline', conditionText: 'trời có mưa' };
    }
    // Mưa phùn
    if (code >= 51 && code <= 57) {
      return { isRaining: true, iconName: 'rainy-outline', conditionText: 'mưa phùn nhẹ' };
    }
    // Tuyết rơi
    if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
      return { isRaining: false, iconName: 'snow-outline', conditionText: 'có tuyết' };
    }
    // Sương mù
    if (code === 45 || code === 48) {
      return { isRaining: false, iconName: 'cloudy-outline', conditionText: 'trời nhiều sương mù' };
    }
    // Trời nhiều mây, âm u
    if (code === 3) {
      return { isRaining: false, iconName: 'cloudy-outline', conditionText: 'trời nhiều mây' };
    }
    // Trời có mây dịu mát
    if (code === 1 || code === 2) {
      return {
        isRaining: false,
        iconName: 'partly-sunny-outline',
        conditionText: temp < 22 ? 'trời se lạnh' : temp > 32 ? 'nắng dịu' : 'trời dịu mát',
      };
    }
    // Trời nắng quang đãng
    return {
      isRaining: false,
      iconName: 'sunny-outline',
      conditionText: temp > 32 ? 'trời nắng nóng' : 'trời nắng đẹp',
    };
  }
}
