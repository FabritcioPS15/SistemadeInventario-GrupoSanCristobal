# Comandos para iniciar el sistema

## Desarrollo Local (Sin Docker)

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
npm run dev
```

## Producción (Con Docker)

### Iniciar todos los servicios
```bash
docker-compose up -d
```

### Ver logs
```bash
docker-compose logs -f
```

### Detener servicios
```bash
docker-compose down
```

### Reiniciar servicios
```bash
docker-compose restart
```

### Reconstruir imágenes
```bash
docker-compose up --build -d
```

## Servicios y Puertos

- **Frontend**: http://localhost:80
- **Backend API**: http://localhost:3001
- **PostgreSQL**: localhost:5432
  - Database: `inventario`
  - User: `admin`
  - Password: (ver `.env`)

## Primera vez

1. Copiar `.env.example` a `.env` y configurar variables
2. Iniciar servicios: `docker-compose up -d`
3. La base de datos se inicializa automáticamente con `database/init.sql`
4. Acceder a http://localhost
