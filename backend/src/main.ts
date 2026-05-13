import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuración de CORS optimizada para producción
  const isProduction = process.env.NODE_ENV === 'production';
  const rawAllowedOrigins = process.env.ALLOWED_ORIGINS || '';
  
  const allowedOrigins = isProduction 
    ? rawAllowedOrigins.split(',').map(origin => origin.trim()).filter(Boolean)
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:80'];

  // Si no hay orígenes definidos en producción, permitir todos (no recomendado pero útil para debug inicial)
  // o al menos incluir localhost para pruebas
  if (isProduction && allowedOrigins.length === 0) {
    allowedOrigins.push('http://localhost:80'); 
    console.warn('⚠️ No ALLOWED_ORIGINS defined in .env. CORS may block Vercel requests.');
  }

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count'],
  });

  // Prefijo global para todas las rutas
  app.setGlobalPrefix('api');

  // Validaciones globales para los datos que entran
  app.useGlobalPipes(new ValidationPipe({
    whitelist: false, // Desactivado temporalmente para permitir objetos genéricos (any/Record)
    forbidNonWhitelisted: false,
    transform: true,
  }));

  // Configuración de Swagger (Documentación de API automática)
  const config = new DocumentBuilder()
    .setTitle('GSC API')
    .setDescription('API para el Sistema de Inventario Grupo San Cristobal')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(3000);
  console.log(`🚀 Servidor corriendo en: http://localhost:3000`);
  console.log(`📄 Documentación disponible en: http://localhost:3000/docs`);
}
bootstrap();
