# ==========================================
# Giai đoạn 1: Build static web bundle
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Vô hiệu hóa telemetry & bật chế độ CI
ENV CI=1
ENV EXPO_NO_TELEMETRY=1

# Biến môi trường build-time cho Expo Web (có thể truyền qua build args)
ARG EXPO_PUBLIC_API_URL=http://localhost:8000
ARG EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=""
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=$EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID

# Copy dependency manifests
COPY package.json package-lock.json ./

# Cài đặt dependencies
RUN npm install

# Copy toàn bộ mã nguồn
COPY . .

# Export web tĩnh với Expo Router
RUN npx expo export --platform web

# ==========================================
# Giai đoạn 2: Serve web tĩnh với Nginx
# ==========================================
FROM nginx:alpine AS runner

# Copy cấu hình Nginx SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy tệp web đã export
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

