# 📊 Esquema de Base de Datos - Sistema de Inventario GSC

## 🗄️ Visión General

El sistema utiliza **PostgreSQL** con **Prisma ORM** para gestionar una base de datos relacional completa que soporta:

- Gestión de inventario de activos
- Sistema de tickets de soporte
- Control de mantenimiento
- Gestión de cámaras y seguridad
- Flota vehicular
- Almacenamiento de archivos
- Chat y notificaciones
- Auditoría completa

---

## 🏗️ Estructura Principal

### 📍 **Core: Ubicaciones y Usuarios**

#### **Users** - Gestión de Usuarios
```sql
- id (UUID) - Identificador único
- email (UNIQUE) - Correo electrónico
- dni (UNIQUE) - DNI del usuario
- full_name - Nombre completo
- password_hash - Contraseña encriptada
- role - Rol del usuario (super_admin, sistemas, gerencia, etc.)
- status - Estado (active, inactive)
- permissions[] - Array de permisos personalizados
- location_id - Ubicación asignada
- created_at/updated_at - Timestamps
```

**Roles del Sistema:**
- `super_admin` - Acceso total
- `sistemas` - Administración técnica
- `gerencia` - Gestión y reportes
- `supervisores` - Supervisión de operaciones
- `administradores` - Operaciones básicas
- `user` - Acceso limitado

#### **Locations** - Sedes y Oficinas
```sql
- id (UUID) - Identificador único
- name - Nombre de la ubicación
- type - Tipo (sede, oficina, almacén)
- address - Dirección física
- region/country/city - Datos geográficos
- manager_name/manager_phone - Datos del responsable
- is_active - Estado activo
```

#### **Areas** - Divisiones Internas
```sql
- id (UUID) - Identificador único
- name - Nombre del área
- location_id - Ubicación padre
- floor/section - Ubicación física
- is_active - Estado activo
```

---

## 📦 **Inventario de Activos**

#### **Assets** - Activos de TI
```sql
- id (UUID) - Identificador único
- codigo_unico (UNIQUE) - Código de inventario
- category_id/subcategory_id - Categorización
- location_id/area_id - Ubicación física
- brand/model/serial_number - Datos del equipo
- status - Estado (active, maintenance, retired, lost)
- condition - Condición (excelente, bueno, regular, malo)
- anydesk_id/teamviewer_id - Acceso remoto
- ip_address/mac_address - Conectividad de red
- os/processor/ram/storage - Especificaciones técnicas
- purchase_date/purchase_price - Información de compra
- assigned_to - Usuario asignado
- last_maintenance/next_maintenance - Mantenimiento programado
```

#### **Categories & Subcategories** - Clasificación
```sql
Categories:
- name - Nombre de categoría
- icon/color - Elementos visuales
- is_active/sort_order - Control de visualización

Subcategories:
- category_id - Categoría padre
- name - Nombre de subcategoría
- is_active/sort_order - Control de visualización
```

---

## 🎫 **Sistema de Tickets**

#### **Tickets** - Tickets de Soporte
```sql
- id (UUID) - Identificador único
- title/description - Detalle del problema
- status - Estado (open, in_progress, resolved, closed, archived)
- priority - Prioridad (low, medium, high, critical)
- category - Categoría del problema
- anydesk/anydesk_password - Acceso remoto
- requester_id/assigned_to - Usuarios involucrados
- location_id - Ubicación del problema
- attended_at/resolved_at/closed_at - Timestamps de gestión
- due_date - Fecha límite
- satisfaction_rating - Calificación del servicio
```

#### **TicketComments** - Comunicación
```sql
- ticket_id - Ticket asociado
- user_id - Autor del comentario
- content - Contenido del mensaje
- is_internal - Comentario interno vs visible para cliente
- created_at - Timestamp
```

#### **TicketHistory** - Historial de Cambios
```sql
- ticket_id - Ticket asociado
- user_id - Usuario que realizó el cambio
- field_name - Campo modificado
- old_value/new_value - Valores antes/después
- action - Tipo de acción (created, updated, assigned, closed)
- description - Descripción del cambio
```

---

## 🔧 **Mantenimiento**

#### **MaintenanceRecord** - Registros de Mantenimiento
```sql
- id (UUID) - Identificador único
- asset_id - Activo mantenido
- maintenance_type - Tipo (preventive, corrective, predictive)
- status - Estado (pending, in_progress, completed, cancelled)
- description/solution - Detalle del trabajo
- total_cost/labor_cost/parts_cost - Costos desglosados
- scheduled_date/started_at/completed_date - Tiempos
- technician_id/technician_name - Personal técnico
- parts_used - JSON con detalles de partes
- success_rating - Calificación del trabajo
```

---

## 🚗 **Flota Vehicular**

#### **Vehicles** - Vehículos de la Empresa
```sql
- id (UUID) - Identificador único
- placa (UNIQUE) - Placa del vehículo
- marca/modelo/año - Datos básicos
- estado - Estado (activa, mantenimiento, baja, vendida)
- ubicacion_id - Ubicación actual
- tipo_vehiculo - Tipo (automovil, camioneta, motocicleta, camion)
- color/combustible/transmision - Especificaciones
- kilometraje/capacidad_carga - Datos operativos
- soat_vencimiento/citv_vencimiento/poliza_vencimiento - Documentación
- asignado_a/conductor - Personal asignado
- ultimo_mantenimiento/proximo_mantenimiento - Mantenimiento
- gps_instalado/gps_device_id - Sistema de tracking
```

---

## 📹 **Sistema de Cámaras**

#### **Cameras** - Cámaras de Seguridad
```sql
- id (UUID) - Identificador único
- name - Nombre de la cámara
- location_id - Ubicación física
- brand/model/ip_address/port - Configuración de red
- username/password/url - Credenciales de acceso
- access_type - Tipo de acceso (url, ivms, rtsp, etc.)
- resolution/fps/night_vision/audio - Especificaciones técnicas
- motion_detection - Detección de movimiento
- status - Estado (active, inactive, maintenance)
- display_count/storage_days - Configuración de almacenamiento
- installation_height/installation_angle/coverage_area - Instalación física
```

#### **CameraDisk & StoredDisk** - Almacenamiento
```sql
CameraDisk:
- camera_id - Cámara asociada
- disk_number - Número de disco
- total_capacity_gb/used_space_gb - Capacidad utilizada
- disk_type - Tipo de disco (HDD, SSD)
- manufacturer/model/serial_number - Datos del disco
- status/health_status - Estado y salud del disco

StoredDisk:
- camera_id - Cámara asociada
- stored_from/stored_to - Período de almacenamiento
- brand/serial_number - Identificación del disco
- image_url - Foto del disco físico
```

---

## 📁 **Almacenamiento de Archivos**

#### **Files** - Gestión de Documentos
```sql
- id (UUID) - Identificador único
- original_name/filename - Nombres de archivo
- file_path - Ruta de almacenamiento
- file_size/mime_type - Metadatos del archivo
- file_hash - Hash SHA-256 para integridad
- uploaded_by - Usuario que subió el archivo
- asset_id/ticket_id/maintenance_id/location_id - Asociaciones
- description/tags[] - Metadatos adicionales
- is_public - Visibilidad del archivo
- download_count - Estadísticas de uso
- expires_at - Fecha de expiración opcional
```

**Tipos de Archivos Soportados:**
- Imágenes: JPEG, PNG, GIF, WebP, SVG
- Documentos: PDF, Word, Excel, PowerPoint, Text
- Comprimidos: ZIP, RAR, 7Z
- Otros: JSON

---

## 💬 **Comunicación y Notificaciones**

#### **Conversations & Messages** - Sistema de Chat
```sql
Conversations:
- id - Identificador único
- title/type - Título y tipo de conversación
- is_active - Estado activo
- last_message - Último mensaje timestamp

Messages:
- conversation_id - Conversación asociada
- sender_id - Autor del mensaje
- content - Contenido del mensaje
- message_type - Tipo (text, image, file, system)
- file_url - URL de archivo adjunto
- is_edited/edited_at - Estado de edición
```

#### **Notifications** - Sistema de Notificaciones
```sql
- id - Identificador único
- type - Tipo de notificación
- title/message - Contenido
- sender_id/receiver_id - Emisor y receptor
- ticket_id/asset_id/maintenance_id - Contexto
- priority - Prioridad (low, medium, high, urgent)
- read/read_at - Estado de lectura
- action_url/action_text - Acciones disponibles
- expires_at - Fecha de expiración
```

---

## 🔍 **Auditoría y Control**

#### **AuditLog** - Registro de Auditoría
```sql
- id - Identificador único
- user_id - Usuario que realizó la acción
- action - Tipo de acción (create, update, delete, login, logout)
- entity_type/entity_id - Entidad afectada
- details - JSON con detalles del cambio
- ip_address/user_agent - Información de sesión
- success/error_message - Resultado de la operación
```

---

## 📋 **Checklists y Auditorías**

#### **Checklist** - Checklists de Procesos
```sql
- id - Identificador único
- type - Tipo (escon, ecsal, citv)
- location_id - Ubicación auditada
- user_id/user_name - Auditor
- date - Fecha de auditoría
- status - Estado (pending, in_progress, completed, failed)
- data - JSON con contenido dinámico
- image_url - Evidencia fotográfica
- score/max_score - Calificación obtenida
```

#### **SutranVisit & BranchAudit** - Auditorías Externas
```sql
SutranVisit:
- visit_date/inspector_name - Datos de inspección
- visit_type - Tipo de visita
- findings/recommendations - Resultados
- evidence_urls[] - Evidencias

BranchAudit:
- auditor_name/audit_date - Datos de auditoría
- score - Puntuación obtenida
- responses - JSON con respuestas
- follow_up_required/follow_up_date - Seguimiento
```

---

## 🚚 **Logística y Movimientos**

#### **Shipment** - Transferencias de Activos
```sql
- id - Identificador único
- shipment_code (UNIQUE) - Código de envío
- asset_id - Activo transferido
- from_location_id/to_location_id - Origen y destino
- status - Estado (pending, shipped, delivered, lost)
- transport_method/transport_company - Datos del transporte
- tracking_number/driver_name/vehicle_plate - Seguimiento
- shipping_cost/insurance_cost - Costos
- shipped_by/received_by - Personal responsable
```

#### **InventoryMovement** - Movimientos de Inventario
```sql
- asset_id - Activo movido
- type - Tipo (in, out, transfer, adjustment)
- quantity/reason - Detalle del movimiento
- from_location_id/to_location_id - Ubicaciones
- moved_by - Usuario responsable
- reference - Documento de referencia
```

---

## 🔗 **Relaciones Principales**

### **Diagrama de Relaciones Simplificado**

```
Users (1) → (N) Tickets (1) → (N) TicketComments
Users (1) → (N) Assets (1) → (N) MaintenanceRecord
Users (1) → (N) Files (N) ← (1) Assets/Tickets/Maintenance

Locations (1) → (N) Assets
Locations (1) → (N) Areas
Locations (1) → (N) Tickets
Locations (1) → (N) Cameras
Locations (1) → (N) Vehicles

Categories (1) → (N) Subcategories (1) → (N) Assets

Cameras (1) → (N) CameraDisk
Cameras (1) → (N) StoredDisk

Conversations (N) ↔ (N) Users
Conversations (1) → (N) Messages
```

---

## 📊 **Índices y Optimizaciones**

### **Índices Recomendados**
```sql
-- Usuarios
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_location ON users(location_id);

-- Activos
CREATE INDEX idx_assets_codigo ON assets(codigo_unico);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_location ON assets(location_id);
CREATE INDEX idx_assets_category ON assets(category_id);

-- Tickets
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_requester ON tickets(requester_id);
CREATE INDEX idx_tickets_assigned ON tickets(assigned_to);
CREATE INDEX idx_tickets_created ON tickets(created_at);

-- Archivos
CREATE INDEX idx_files_uploader ON files(uploaded_by);
CREATE INDEX idx_files_entity ON files(asset_id, ticket_id, maintenance_id);
CREATE INDEX idx_files_mime ON files(mime_type);

-- Auditoría
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
```

---

## 🔐 **Seguridad de Datos**

### **Políticas de Acceso**
- **Usuarios**: Solo pueden ver/editar sus propios datos asignados
- **Archivos**: Control de acceso basado en propietario y visibilidad
- **Tickets**: Visibilidad según rol y asignación
- **Auditoría**: Registro completo de todas las operaciones

### **Encriptación**
- **Contraseñas**: Hash con bcrypt
- **Archivos**: Hash SHA-256 para verificación de integridad
- **Conexión**: SSL/TLS obligatorio en producción

---

## 📈 **Escalabilidad**

### **Particionamiento Recomendado**
```sql
-- Particionar tickets por fecha
PARTITION BY RANGE (created_at);

-- Particionar audit logs por fecha
PARTITION BY RANGE (created_at);

-- Particionar archivos por fecha de creación
PARTITION BY RANGE (created_at);
```

### **Archivado**
- **Tickets cerrados**: Archivar después de 1 año
- **Audit logs**: Archivar después de 2 años
- **Archivos temporales**: Eliminar según fecha de expiración

---

## 🔄 **Migración y Backup**

### **Backup Automático**
```bash
# Backup completo
pg_dump -h localhost -U postgres gsc_db > backup_full_$(date +%Y%m%d).sql

# Backup incremental
pg_dump -h localhost -U postgres gsc_db --data-only > backup_data_$(date +%Y%m%d).sql
```

### **Restauración**
```bash
# Restaurar backup completo
psql -h localhost -U postgres gsc_db < backup_full_20240512.sql

# Restaurar solo datos
psql -h localhost -U postgres gsc_db < backup_data_20240512.sql
```

---

## 🚀 **Configuración para Producción**

### **PostgreSQL Config**
```ini
# postgresql.conf
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
```

### **Connection Pool**
```javascript
// Prisma Connection Pool
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Pool de conexiones optimizado
  connection_limit = 20
  pool_timeout = 10
}
```

---

## 📝 **Notas de Implementación**

### **Consideraciones Especiales**
1. **UUIDs**: Todos los IDs usan UUID para mejor distribución
2. **Timestamps**: UTC para consistencia global
3. **Soft Deletes**: Implementados con campos `status` en lugar de eliminación física
4. **JSON Fields**: Usados para datos flexibles y metadatos
5. **Arrays**: Para relaciones many-to-many simplificadas

### **Performance Tips**
- Usar índices compuestos para consultas frecuentes
- Implementar caché Redis para datos de lectura intensiva
- Considerar replicación para lecturas de alta demanda
- Monitorizar consultas lentas con pg_stat_statements

---

## 🎯 **Resumen de Capacidades**

Este esquema soporta:

✅ **Gestión Completa de Activos** - Con especificaciones detalladas y seguimiento  
✅ **Sistema de Tickets Robusto** - Con historial completo y comunicación  
✅ **Control de Mantenimiento** - Preventivo y correctivo con costos  
✅ **Gestión Documental** - Almacenamiento seguro con control de acceso  
✅ **Sistema de Chat** - Comunicación en tiempo real  
✅ **Auditoría Completa** - Trazabilidad de todas las operaciones  
✅ **Flota Vehicular** - Con tracking y documentación  
✅ **Seguridad** - Cámaras y sistema de vigilancia  
✅ **Escalabilidad** - Diseñado para crecimiento empresarial  
✅ **Multi-locación** - Soporte para múltiples sedes  

El esquema está optimizado para **alto rendimiento**, **seguridad de datos**, y **escalabilidad** a nivel empresarial.
