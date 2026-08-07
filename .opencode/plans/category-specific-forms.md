# Plan: Formularios Completamente Personalizados por Categoría de Inventario

## Objetivo

Reemplazar el formulario genérico actual (`AssetForm.tsx` con 65+ campos en un solo componente) por formularios completamente diferentes por categoría, donde cada categoría tenga sus propios pasos, campos, layout y validaciones específicas.

## Arquitectura

### Componente Despachador

`AssetForm.tsx` se convierte en un **dispatcher delgado** que:
1. Obtiene el `category_id` del asset (o del `initialCategoryId`)
2. Busca el slug de la categoría en el registry
3. Renderiza el componente de formulario correspondiente
4. Si la categoría no tiene form dedicado, usa `GenericForm` como fallback

### Registry de Formularios

```
src/modules/inventory/config/categoryFormRegistry.ts
```

Mapa `{ [categorySlug]: React.ComponentType<FormProps> }` que asocia cada categoría con su componente.

### Formularios por Categoría

Cada form es un componente independiente que usa `MultiStepForm` con sus propios pasos y campos.

### Directorio de Formularios

```
src/modules/inventory/forms/categories/
├── TecnologiaForm.tsx          (Tecnología)
├── SeguridadControlForm.tsx    (Seguridad y Control)
├── EquiposOperativosForm.tsx   (Equipos Operativos)
├── FlotaVehicularForm.tsx      (Flota Vehicular)
├── InfraestructuraTIForm.tsx   (Infraestructura TI)
├── GenericForm.tsx             (Mobiliario, Útiles, Otros Activos)
└── index.ts                    (exports)
```

### Props Comunes

Todos los formularios reciben las mismas props:

```ts
type CategoryFormProps = {
  onClose: () => void;
  onSave: () => void;
  editAsset?: AssetWithDetails;
  initialCategoryId?: string;
  initialSubcategoryId?: string;
};
```

### Lógica Compartida (Custom Hook)

```
src/modules/inventory/hooks/useAssetForm.ts
```

Hook que extrae toda la lógica común:
- Carga de categorías, subcategorías, ubicaciones
- Generación de código único
-handleChange
- handleSubmit (insert/update en tabla `assets`)
- Estados de loading, errors
- Fetch de datos iniciales

Cada form solo se preocupa por el JSX (pasy campos).

## Detalle por Categoría

### 1. TecnologíaForm (Tecnología)

**Paso 1: Identificación**
- Código único (auto-generado, solo lectura)
- Nombre del activo
- Descripción
- Subcategoría (CPU, Laptop, Monitor, Impresora, etc.)

**Paso 2: Especificaciones Técnicas**
- Procesador
- Memoria RAM
- Almacenamiento
- Sistema Operativo (select)
- MAC Address
- Dirección IP
- AnyDesk ID

**Paso 3: Estado y Valor**
- Condición (Nuevo/Bueno/Regular/Malo)
- Estado de uso (Operativo/Inoperativo/En Reparación/Baja)
- Cantidad
- Valor estimado (S/.)
- Fecha de adquisición

**Paso 4: Ubicación**
- Sede (select)
- Área (select)

**Paso 5: Datos de Acceso** (solo para subcategorías que lo requieran: CPU, Laptop, Router, Switch)
- URL de acceso
- Puerto
- Tipo de acceso (URL/iVMS/Esviz)
- Usuario
- Contraseña
- Código de autenticación

### 2. SeguridadControlForm (Seguridad y Control)

**Paso 1: Identificación**
- Código único
- Nombre / Descripción
- Subcategoría (Cámaras, DVR, NVR, Biométricos, etc.)

**Paso 2: Especificaciones del Equipo**
- Marca
- Modelo
- Número de serie
- Canales (para DVR/NVR, select: 4/8/16/32/64)
- Resolución máxima (select: 720p/1080p/1440p/4K)
- Almacenamiento total

**Paso 3: Conectividad y Acceso**
- Dirección IP
- Puerto
- URL de acceso
- Usuario
- Contraseña
- Tipo de acceso (URL/iVMS/Esviz)
- Código de autenticación
- Velocidad de stream (cámaras)

**Paso 4: Estado y Ubicación**
- Condición
- Estado de uso
- Sede / Área
- Valor estimado

### 3. EquiposOperativosForm (Equipos Operativos)

**Paso 1: Identificación**
- Código único
- Nombre / Descripción
- Subcategoría (Analizador de gases, Opacímetro, Frenómetro, etc.)

**Paso 2: Especificaciones del Equipo**
- Marca
- Modelo
- Número de serie
- Capacidad / Rango de medición
- Norma / Estándar aplicable

**Paso 3: Estado y Mantenimiento**
- Condición
- Estado de uso
- Última calibración (fecha)
- Próxima calibración (fecha)
- Sede / Área
- Valor estimado

### 4. FlotaVehicularForm (Flota Vehicular)

**Paso 1: Identificación del Vehículo**
- Código único
- Subcategoría (Vehículos livianos, Camionetas, Vehículos pesados, etc.)
- Placa
- Marca / Modelo
- Color

**Paso 2: Datos del Vehículo**
- Año de fabricación
- Kilometraje actual
- Capacidad de carga
- Marca del motor
- Número de motor
- VIN / Chasis

**Paso 3: Documentación**
- SOAT (emisión / vencimiento)
- Revisión técnica (emisión / vencimiento)
- Póliza de seguro (emisión / vencimiento)
- Permiso de circulación

**Paso 4: Estado y Ubicación**
- Estado del vehículo (Operativo/En mantenimiento/Inactivo/De baja)
- Sede / Área
- Valor estimado
- Último mantenimiento (fecha)

### 5. InfraestructuraTIForm (Infraestructura TI)

**Paso 1: Identificación**
- Código único
- Nombre / Descripción
- Subcategoría (Servidores, Storage/NAS, Racks, Switches, etc.)

**Paso 2: Especificaciones Técnicas**
- Procesador (servidores)
- Memoria RAM (servidores)
- Almacenamiento / Capacidad
- Número de puertos (switches, racks)

**Paso 3: Configuración de Red**
- Dirección IP
- MAC Address
- Velocidad por puerto
- Tipo de conector (select: UTP Cat5e/Cat6/Cat6a/Fibra/Coaxial)
- Estándar Wi-Fi (puntos de acceso)

**Paso 4: Estado y Ubicación**
- Condición
- Estado de uso
- Sede / Área
- Valor estimado
- Potencia (UPS): VA/W, Voltage, Autonomía

### 6. GenericForm (Mobiliario, Útiles y Suministros, Otros Activos)

**Paso 1: Identificación**
- Código único
- Nombre del activo
- Descripción
- Subcategoría

**Paso 2: Características**
- Marca
- Modelo
- Color
- Capacidad / Tamaño

**Paso 3: Estado y Valor**
- Condición
- Estado de uso
- Cantidad
- Unidad de medida
- Valor estimado
- Fecha de adquisición

**Paso 4: Ubicación**
- Sede
- Área

## Archivos a Modificar

| Archivo | Acción |
|---------|--------|
| `src/modules/inventory/forms/AssetForm.tsx` | Reescribir como dispatcher delgado |
| `src/modules/inventory/hooks/useAssetForm.ts` | **Crear** — hook con lógica compartida |
| `src/modules/inventory/config/categoryFormRegistry.ts` | **Crear** — mapa categoría → componente |
| `src/modules/inventory/forms/categories/TecnologiaForm.tsx` | **Crear** |
| `src/modules/inventory/forms/categories/SeguridadControlForm.tsx` | **Crear** |
| `src/modules/inventory/forms/categories/EquiposOperativosForm.tsx` | **Crear** |
| `src/modules/inventory/forms/categories/FlotaVehicularForm.tsx` | **Crear** |
| `src/modules/inventory/forms/categories/InfraestructuraTIForm.tsx` | **Crear** |
| `src/modules/inventory/forms/categories/GenericForm.tsx` | **Crear** |
| `src/modules/inventory/forms/categories/index.ts` | **Crear** — barrel exports |
| `src/modules/inventory/config/categoryFields.ts` | Eliminar (ya no se necesita) |

## Orden de Implementación

1. Crear `useAssetForm.ts` (hook compartido)
2. Crear `categoryFormRegistry.ts`
3. Crear `GenericForm.tsx` (fallback)
4. Crear `TecnologiaForm.tsx`
5. Crear `SeguridadControlForm.tsx`
6. Crear `EquiposOperativosForm.tsx`
7. Crear `FlotaVehicularForm.tsx`
8. Crear `InfraestructuraTIForm.tsx`
9. Crear `index.ts` (barrel)
10. Reescribir `AssetForm.tsx` como dispatcher
11. Eliminar `categoryFields.ts`
12. Verificar typecheck

## Verificación

- Ejecutar `npx tsc --noEmit` para verificar 0 errores de typecheck
- Cada form se puede abrir desde el botón "Agregar Activo"
- Cada form se puede abrir en modo edición desde la tabla
- La categoría se pre-selecciona correctamente al navegar desde el sidebar
- Todos los campos se guardan correctamente en la tabla `assets`
