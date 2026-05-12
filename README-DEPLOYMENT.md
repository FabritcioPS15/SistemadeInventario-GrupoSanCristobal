# 📦 Guía de Despliegue - Sistema de Inventario GSC

## 🚀 Despliegue Rápido en VPS con Docker

### Requisitos Previos

- Docker y Docker Compose instalados
- Acceso SSH al VPS
- Al menos 2GB RAM y 10GB disco

### 1. Preparar el VPS

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clonar repositorio
git clone <tu-repositorio>
cd SistemadeInventario-GrupoSanCristobal
```

### 2. Configurar Variables de Entorno

```bash
# Copiar archivo de producción
cp .env.production .env

# Editar con tus credenciales
nano .env
```

**Variables importantes a configurar:**
- `DB_PASSWORD`: Contraseña segura para PostgreSQL
- `JWT_SECRET`: Secreto único para JWT
- `VITE_SUPABASE_URL/KEY`: Si usas Supabase

### 3. Despliegue Automático

```bash
# Hacer ejecutable el script
chmod +x deploy.sh

# Desplegar en producción
./deploy.sh production
```

### 4. Verificar Despliegue

```bash
# Ver estado de contenedores
docker-compose ps

# Ver logs
docker-compose logs -f

# Acceder a la aplicación
curl http://localhost
```

## 🛠️ Configuración Adicional

### Dominio y SSL

1. **Configurar dominio:**
   ```bash
   # Editar nginx.conf
   nano nginx.conf
   ```

2. **Instalar SSL con Let's Encrypt:**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d tudominio.com
   ```

### Firewall

```bash
# Configurar UFW
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### Backup Automático

```bash
# Crear script de backup
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T db pg_dump -U postgres gsc_db > backup_$DATE.sql
EOF

chmod +x backup.sh

# Agregar a crontab (diario a las 2 AM)
echo "0 2 * * * /path/to/backup.sh" | crontab -
```

## 📊 Monitoreo

### Verificar Servicios

```bash
# Estado general
docker-compose ps

# Logs específicos
docker-compose logs api
docker-compose logs frontend
docker-compose logs db

# Estadísticas de recursos
docker stats
```

### Mantenimiento

```bash
# Reiniciar servicios
docker-compose restart

# Actualizar aplicación
git pull
docker-compose up --build -d

# Limpiar imágenes antiguas
docker system prune -f
```

## 🔧 Solución de Problemas

### Problemas Comunes

1. **Error de conexión a base de datos:**
   ```bash
   # Verificar contenedor de DB
   docker-compose logs db
   
   # Reiniciar base de datos
   docker-compose restart db
   ```

2. **Error de CORS:**
   - Verificar configuración en `backend/src/main.ts`
   - Asegurar que el dominio esté en `allowedOrigins`

3. **Error de permisos:**
   ```bash
   # Corregir permisos de uploads
   sudo chown -R $USER:$USER uploads/
   chmod -R 755 uploads/
   ```

### Logs Útiles

- **Frontend (Nginx):** `docker-compose logs frontend`
- **Backend (API):** `docker-compose logs api`
- **Base de datos:** `docker-compose logs db`

## 🌐 Acceso a Servicios

Después del despliegue:

- **Aplicación web:** `http://tu-vps-ip` o `http://tudominio.com`
- **API:** `http://tu-vps-ip/api`
- **Documentación Swagger:** `http://tu-vps-ip/docs`

## 📈 Escalabilidad

Para mayor rendimiento:

1. **Aumentar recursos del VPS**
2. **Configurar balanceador de carga**
3. **Añadir Redis para caché**
4. **Optimizar base de datos con índices**

## 🔐 Seguridad

- Cambiar contraseñas por defecto
- Configurar firewall
- Usar SSL/TLS
- Mantener Docker actualizado
- Hacer backups regulares

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs de los contenedores
2. Verifica la configuración de red
3. Confirma las variables de entorno
4. Revisa la documentación oficial de Docker y NestJS
