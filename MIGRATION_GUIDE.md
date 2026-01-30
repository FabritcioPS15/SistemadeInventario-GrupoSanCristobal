# Guía de Migración: Supabase → Backend API

## Patrón de Migración

### ANTES (Supabase):
```typescript
import { supabase } from '../lib/supabase';

// GET
const { data, error } = await supabase.from('vehicles').select('*');

// INSERT
const { data, error } = await supabase.from('vehicles').insert(newVehicle);

// UPDATE
const { data, error } = await supabase.from('vehicles').update(updates).eq('id', vehicleId);

// DELETE
const { data, error } = await supabase.from('vehicles').delete().eq('id', vehicleId);
```

### DESPUÉS (API Client):
```typescript
import { api } from '../lib/api';

// GET
const { data, error } = await api.from('vehicles').select();

// INSERT
const { data, error } = await api.from('vehicles').insert(newVehicle);

// UPDATE
const { data, error } = await api.from('vehicles').update(updates).eq('id', vehicleId);

// DELETE
const { data, error } = await api.from('vehicles').delete().eq('id', vehicleId);
```

## Cambios Necesarios

1. **Reemplazar imports**:
   ```typescript
   // Cambiar esto:
   import { supabase } from '../lib/supabase';
   
   // Por esto:
   import { api } from '../lib/api';
   ```

2. **Reemplazar llamadas**:
   ```typescript
   // Cambiar esto:
   supabase.from('table_name')
   
   // Por esto:
   api.from('table_name')
   ```

## Archivos a Modificar

Los principales archivos que usan Supabase son:
- `src/views/FlotaVehicular.tsx` - Gestión de vehículos
- `src/views/Dashboard.tsx` - Dashboard principal
- `src/views/Sedes.tsx` - Gestión de sedes
- `src/views/Cameras.tsx` - Gestión de cámaras
- `src/views/Servers.tsx` - Gestión de servidores
- `src/components/forms/*.tsx` - Todos los formularios

## Próximos pasos

¿Deseas que proceda con la migración automática de estos archivos?
