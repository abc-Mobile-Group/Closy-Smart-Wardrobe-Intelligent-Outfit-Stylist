import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('Closy API')
    .setDescription(
      'Closy – Smart Wardrobe & Intelligent Outfit Stylist (CO3043).\n\n' +
        '**API 1 – Wardrobe**: nạp đồ vào tủ (US01).\n' +
        '**API 2 – Outfits**: Color Harmony Engine gợi ý bộ đồ theo bối cảnh, Lock/Swap, Xác nhận mặc (US02–US04).\n\n' +
        '**Cách test nhanh:** (1) `POST /wardrobe/capsule-basics` → (2) `POST /outfits/suggest` → (3) `POST /outfits/confirm-wear`. ' +
        'Dữ liệu lưu in-memory theo `userId` (mặc định `demo`).',
    )
    .setVersion('1.0')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config), {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Closy API running. Swagger: http://localhost:${port}/docs`);
}
bootstrap();
