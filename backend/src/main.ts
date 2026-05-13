import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
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
