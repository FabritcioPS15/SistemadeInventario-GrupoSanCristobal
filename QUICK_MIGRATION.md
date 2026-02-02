# Quick Migration Guide for Remaining Files

Para los archivos que aún importan Supabase, realizar los siguientes reemplazos:

## 1. BUSCAR Y REEMPLAZAR en VS Code (Ctrl+Shift+H)

### Reemplazo 1: Import statement
**Buscar (regex enabled):**
```
import { supabase } from ['"]\.\.\/lib\/supabase['"];?
```

**Reemplazar con:**
```
import { api } from '../lib/api';
```

### Reemplazo 2: from() calls
**Buscar:**
```
supabase.from(
```

**Reemplazar con:**
```
api.from(
```

## 2. Archivos a migrar manualmente

Los siguientes archivos necesitan actualización:
- `src/views/Sedes.tsx`
- `src/views/Cameras.tsx`
- `src/views/Servers.tsx`
- `src/views/Inventory.tsx`
- `src/views/Maintenance.tsx`
- `src/views/Tickets.tsx`
- `src/views/Users.tsx`
- `src/views/Audit.tsx`
- `src/views/Sutran.tsx`
- `src/contexts/AuthContext.tsx`
- `src/components/*` (varios)

## 3. Notas importantes

- El API client (`src/lib/api.ts`) **ya está configurado** para funcionar igual que Supabase
- No hay cambios necesarios en la lógica, solo en las importaciones
- La sintaxis `.from().select()`, `.insert()`, `.update().eq()`, `.delete().eq()` funciona idéntica

## 4. Verificación

Después de los cambios:
1. Ejecutar `npm run dev`
2. Revisar consola de errores
3. Si hay errores de "Cannot find name 'supabase'", repetir reemplazo en ese archivo
