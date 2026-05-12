#!/bin/bash

# Script de despliegue para Sistema de Inventario GSC en VPS
# Uso: ./deploy.sh [production|development]

set -e

ENVIRONMENT=${1:-production}
echo "🚀 Desplegando Sistema de Inventario GSC en modo: $ENVIRONMENT"

# Verificar Docker y Docker Compose
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado. Por favor instálalo primero."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose no está instalado. Por favor instálalo primero."
    exit 1
fi

# Crear directorio de uploads si no existe
mkdir -p uploads

# Copiar variables de entorno según el ambiente
if [ "$ENVIRONMENT" = "production" ]; then
    if [ ! -f .env ]; then
        echo "📝 Creando archivo .env desde .env.production..."
        cp .env.production .env
        echo "⚠️  IMPORTANTE: Edita el archivo .env con tus credenciales reales antes de continuar!"
        echo "   - Cambia DB_PASSWORD por una contraseña segura"
        echo "   - Cambia JWT_SECRET por un secreto único"
        echo "   - Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY si usas Supabase"
        read -p "Presiona Enter cuando hayas configurado las variables de entorno..."
    fi
else
    if [ ! -f .env ]; then
        echo "📝 Creando archivo .env para desarrollo..."
        cat > .env << EOF
DB_USER=postgres
DB_PASSWORD=admin123
DB_NAME=gsc_db
JWT_SECRET=dev-secret-key
VITE_API_URL=/api
VITE_DATABASE_MODE=nestjs
NODE_ENV=development
EOF
    fi
fi

# Limpiar contenedores anteriores
echo "🧹 Limpiando contenedores anteriores..."
docker-compose down --remove-orphans

# Construir y levantar servicios
echo "🔨 Construyendo y levantando servicios..."
docker-compose up --build -d

# Esperar a que la base de datos esté lista
echo "⏳ Esperando a que la base de datos esté lista..."
sleep 10

# Verificar que los servicios estén corriendo
echo "🔍 Verificando servicios..."
if docker-compose ps | grep -q "Up"; then
    echo "✅ ¡Despliegue exitoso!"
    echo ""
    echo "🌐 Servicios disponibles:"
    echo "   - Frontend: http://localhost (puerto 80)"
    echo "   - API: http://localhost/api"
    echo "   - Base de datos: localhost:5432"
    echo ""
    echo "📋 Comandos útiles:"
    echo "   - Ver logs: docker-compose logs -f"
    echo "   - Detener: docker-compose down"
    echo "   - Reiniciar: docker-compose restart"
    echo ""
    echo "🔐 Para producción, no olvides:"
    echo "   - Configurar un dominio real"
    echo "   - Instalar SSL (Let's Encrypt)"
    echo "   - Configurar firewall"
    echo "   - Hacer backup de la base de datos"
else
    echo "❌ Error en el despliegue. Revisa los logs:"
    docker-compose logs
    exit 1
fi
