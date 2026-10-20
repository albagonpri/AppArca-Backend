import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Validación global estricta de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Habilitar CORS para permitir peticiones desde clientes web/móviles
  app.enableCors();

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('AppArca API')
    .setDescription('API REST del backend de AppArca')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  await app.listen(port);
  console.log(`[AppArca Backend] Servidor ejecutándose en http://localhost:${port}`);
  console.log(`[AppArca Backend] Swagger disponible en http://localhost:${port}/api`);
}

await bootstrap();
