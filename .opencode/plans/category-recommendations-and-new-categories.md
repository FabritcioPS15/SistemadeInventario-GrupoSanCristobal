# Plan: Sistema de Recomendación de Categorías + Nuevas Categorías

## Objetivo

1. Agregar un **sistema de recomendación** que sugiera la categoría correcta al usuario cuando escribe el nombre del activo
2. Agregar **nuevas categorías** paraitems que actualmente no tienen categoría clara: herramientas, instalaciones, mantenimiento

## Parte 1: Sistema de Recomendación

### Configuración de Recomendaciones

Crear `src/modules/inventory/config/categoryRecommendations.ts`:

```ts
export type CategoryRecommendation = {
  slug: string;
  keywords: string[];      // palabras clave que activan la recomendación
  examples: string[];       // ejemplos de items para mostrar en el dropdown
  description: string;      // descripción corta de la categoría
};

export const CATEGORY_RECOMMENDATIONS: CategoryRecommendation[] = [
  {
    slug: 'tecnologia',
    keywords: ['computadora', 'laptop', 'monitor', 'teclado', 'mouse', 'impresora', 'servidor', 'celular', 'tablet', 'proyector', 'router', 'switch', 'cable', 'disco', 'memoria', 'usb'],
    examples: ['Computadoras', 'Laptops', 'Monitores', 'Impresoras', 'Celulares'],
    description: 'Equipos de cómputo, electrónicos y redes',
  },
  {
    slug: 'seguridad-control',
    keywords: ['camara', 'dvr', 'nvr', 'biometrico', 'huella', 'alarma', 'extintor', 'seguridad', 'vigilancia', 'camaras'],
    examples: ['Cámaras', 'DVR/NVR', 'Biométricos', 'Alarmas', 'Extintores'],
    description: 'Sistemas de seguridad y control de acceso',
  },
  {
    slug: 'herramientas-equipos',
    keywords: ['alicate', 'talero', 'destornillador', 'llave', 'martillo', 'sierra', 'taladro', 'herramienta', 'pinza', 'cutter', 'cinta', 'medidor', 'nivel', 'clavo', 'tornillo'],
    examples: ['Alicates', 'Taleros', 'Destornilladores', 'Llaves', 'Martillos'],
    description: 'Herramientas manuales, eléctricas y equipos de trabajo',
  },
  {
    slug: 'instalaciones-mantenimiento',
    keywords: ['lampara', 'luz', 'aire', 'acondicionado', 'baño', 'grifo', 'tuberia', 'plomeria', 'electricidad', 'ventilador', 'extractor', 'foco', 'interruptor', 'enchufe', 'base', 'ampolleta'],
    examples: ['Aire acondicionado', 'Lámparas', 'Baños', 'Ventilación', 'Eléctrico'],
    description: 'Instalaciones eléctricas, sanitarias, iluminación y climatización',
  },
  {
    slug: 'mobiliario',
    keywords: ['escritorio', 'silla', 'mesa', 'estante', 'armario', 'mueble', 'banca', 'modulo', 'pizarra', 'biombo'],
    examples: ['Escritorios', 'Sillas', 'Mesas', 'Estantes', 'Archivadores'],
    description: 'Muebles de oficina y equipamiento',
  },
  {
    slug: 'equipos-operativos',
    keywords: ['analizador', 'opacimetro', 'frenometro', 'luxometro', 'diagnostico', 'clinico', 'laboratorio', 'evaluacion', 'revision'],
    examples: ['Analizadores', 'Opacímetros', 'Frenómetros', 'Equipos clínicos'],
    description: 'Equipos de revisión técnica, médicos y evaluación',
  },
  {
    slug: 'utiles-suministros',
    keywords: ['lapicero', 'lapiz', 'papel', 'carpeta', 'grapadora', 'tinta', 'cartucho', 'notas', 'cinta', 'sello', 'tijera', 'botiquin'],
    examples: ['Lapiceros', 'Papel', 'Carpetas', 'Grapadoras', 'Tintas'],
    description: 'Material de oficina y suministros administrativos',
  },
  {
    slug: 'infraestructura-ti',
    keywords: ['rack', 'patch', 'ups', 'estabilizador', 'nas', 'storage', 'torre', 'wifi', 'access point', 'cableado', 'fiber', 'fibra'],
    examples: ['Servidores', 'Racks', 'UPS', 'Switches de red', 'NAS'],
    description: 'Infraestructura de servidores, redes y comunicaciones',
  },
  {
    slug: 'otros-activos',
    keywords: ['compresora', 'aspiradora', 'carretilla', 'estructura', 'instalacion', 'especial'],
    examples: ['Compresoras', 'Aspiradoras', 'Carretillas', 'Herramientas especiales'],
    description: 'Equipos diversos, herramientas especiales y estructuras',
  },
];
```

### Función de Detección

```ts
export function detectCategory(itemName: string): string | null {
  const lower = itemName.toLowerCase().trim();
  if (!lower) return null;

  for (const rec of CATEGORY_RECOMMENDATIONS) {
    if (rec.keywords.some(kw => lower.includes(kw))) {
      return rec.slug;
    }
  }
  return null;
}
```

### Componente de Recomendación

Crear `src/modules/inventory/components/CategoryRecommendation.tsx`:

Un componente pequeño que:
1. Se muestra debajo del dropdown de categoría
2. Aparece cuando el usuario escribe algo en el campo "nombre del activo"
3. Muestra un badge con el icono 💡 y el texto: "¿Es [Nombre Categoría]? Ejemplos: [ejemplos]"
4. Tiene un botón "Aplicar" que selecciona automáticamente la categoría

### Integración en los Formularios

En todos los formularios (TecnologiaForm, GenericForm, etc.), en el Step 1:
1. Agregar el componente `CategoryRecommendation` después del dropdown de categoría
2. Pasarle `formData.item` (el nombre del activo) para detectar la categoría sugerida

### Mejora del Dropdown de Categorías

En el `<option>` del dropdown de categoría, agregar una descripción corta entre paréntesis:
```html
<option value="cat.id">Tecnología — Equipos de cómputo y redes</option>
<option value="cat.id">Herramientas y Equipos — Alicates, taleros, herramientas</option>
```

Esto requiere que el tipo `Category` tenga un campo `description` (ya existe en la tabla DB).

## Parte 2: Nuevas Categorías

### Nueva Categoría: Herramientas y Equipos

**Slug:** `herramientas-equipos`
**Descripción:** Herramientas manuales, eléctricas y equipos de trabajo
**Icono:** `wrench` (reutilizar de Equipos Operativos) o `hammer`
**Subcategorías:**
1. Herramientas manuales (alicales, destornilladores, llaves)
2. Herramientas eléctricas (taladros, sierras, amoladoras)
3. Taleros y organizadores
4. Equipos de medición (cintas métricas, niveles)
5. Consumibles (clavos, tornillos, cinta, pegamento)

### Nueva Categoría: Instalaciones y Mantenimiento

**Slug:** `instalaciones-mantenimiento`
**Descripción:** Instalaciones eléctricas, sanitarias, iluminación y climatización
**Icono:** `zap` (para eléctrico) o `thermometer`
**Subcategorías:**
1. Iluminación (lámparas, focos, parlantes)
2. Climatización (aire acondicionado, ventiladores, extractores)
3. Plomería (grifos, tuberías, baños)
4. Eléctrico (interruptores, enchufes, cables, tableros)
5. Carpintería y acabados

## Archivos a Crear

| Archivo | Descripción |
|---------|-------------|
| `src/modules/inventory/config/categoryRecommendations.ts` | Config de recomendaciones + función detectCategory |
| `src/modules/inventory/components/CategoryRecommendation.tsx` | Componente de UI para mostrar sugerencia |

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/modules/inventory/forms/categories/GenericForm.tsx` | Agregar CategoryRecommendation + opciones descriptivas |
| `src/modules/inventory/forms/categories/TecnologiaForm.tsx` | Agregar CategoryRecommendation + opciones descriptivas |
| `src/modules/inventory/forms/categories/SeguridadControlForm.tsx` | Agregar CategoryRecommendation + opciones descriptivas |
| `src/modules/inventory/forms/categories/EquiposOperativosForm.tsx` | Agregar CategoryRecommendation + opciones descriptivas |
| `src/modules/inventory/forms/categories/FlotaVehicularForm.tsx` | Agregar CategoryRecommendation + opciones descriptivas |
| `src/modules/inventory/forms/categories/InfraestructuraTIForm.tsx` | Agregar CategoryRecommendation + opciones descriptivas |
| `src/modules/inventory/config/categoryFormRegistry.ts` | Agregar 2 nuevas categorías |
| `src/modules/inventory/constants/inventory.constants.ts` | Agregar 2 nuevas categorías a PATH_CATEGORY_MAP |
| `src/modules/inventory/hooks/useAssetForm.ts` | Agregar campos de las nuevas categorías al BASE_FIELDS |
| `src/app/layouts/Sidebar.tsx` | Agregar 2 entradas al submenu de inventario |
| `src/app/providers/AuthContext.tsx` | Agregar permisos para las 2 nuevas categorías |
| `src/modules/users/forms/UserForm.tsx` | Agregar permisos para las 2 nuevas categorías |
| `supabase/migrations/` | Nueva migración para las 2 categorías + subcategorías |

## Archivos a Crear (Formularios)

| Archivo | Descripción |
|---------|-------------|
| `src/modules/inventory/forms/categories/HerramientasEquiposForm.tsx` | Form de 3 pasos: Identificación, Características, Estado |
| `src/modules/inventory/forms/categories/InstalacionesMantenimientoForm.tsx` | Form de 4 pasos: Identificación, Tipo de Instalación, Especificaciones, Estado |

## Orden de Implementación

1. Crear `categoryRecommendations.ts`
2. Crear `CategoryRecommendation.tsx`
3. Actualizar los 6 formularios existentes con el componente de recomendación
4. Crear `HerramientasEquiposForm.tsx`
5. Crear `InstalacionesMantenimientoForm.tsx`
6. Actualizar `categoryFormRegistry.ts`
7. Actualizar `inventory.constants.ts`
8. Actualizar `useAssetForm.ts`
9. Actualizar `Sidebar.tsx`
10. Actualizar `AuthContext.tsx`
11. Actualizar `UserForm.tsx`
12. Crear migración SQL
13. Verificar typecheck

## Verificación

- `npx tsc --noEmit` debe pasar con 0 errores
- El sistema de recomendación sugiere categorías al escribir nombres
- Las nuevas categorías aparecen en el sidebar
- Los formularios de las nuevas categorías funcionan correctamente
- Los permisos de las nuevas categorías están configurados
