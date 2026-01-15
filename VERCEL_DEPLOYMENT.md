# 🚀 Guía de Despliegue en Vercel

## ❌ Problema Actual

Estás viendo estos errores en Vercel:
- `404 Failed to load resource`
- `NotFoundError: Failed to execute 'insertBefore' on 'Node'`

**Causa**: Las variables de entorno de Supabase no están configuradas en Vercel.

---

## ✅ Solución Paso a Paso

### 1️⃣ Configurar Variables de Entorno en Vercel

1. Ve a tu proyecto en Vercel: https://vercel.com/dashboard
2. Selecciona tu proyecto **SistemadeInventario-GrupoSanCristobal**
3. Ve a **Settings** → **Environment Variables**
4. Agrega las siguientes variables:

| Variable Name | Value |
|--------------|-------|
| `VITE_SUPABASE_URL` | `https://mpoatstpbgecyvwyqryv.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wb2F0c3RwYmdlY3l2d3lxcnl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwOTkyNTksImV4cCI6MjA3NTY3NTI1OX0.qiUbBLS5rZfDI-_y4F8OpM_Qm7wsd91K_rc-UO7WSvs` |

> **Importante**: Asegúrate de seleccionar **Production**, **Preview**, y **Development** para cada variable.

---

### 2️⃣ Verificar Configuración de Build

Asegúrate de que tu proyecto tenga esta configuración en Vercel:

- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

---

### 3️⃣ Re-desplegar el Proyecto

Después de agregar las variables de entorno:

1. Ve a la pestaña **Deployments**
2. Haz clic en los **tres puntos** (⋯) del último deployment
3. Selecciona **Redeploy**
4. Marca la opción **"Use existing Build Cache"** como **NO**
5. Haz clic en **Redeploy**

---

### 4️⃣ Verificar el Despliegue

Una vez que termine el deployment:

1. Abre la URL de tu aplicación
2. Abre la **Consola del Navegador** (F12)
3. Deberías ver en la consola:
   ```
   Supabase URL: https://mpoatstpbgecyvwyqryv.supabase.co
   Supabase Key: Presente
   ```

Si ves esto, ¡tu aplicación está funcionando correctamente! ✅

---

## 🔍 Troubleshooting

### Si sigues viendo errores 404:

1. **Verifica que `vercel.json` existe** en la raíz del proyecto
2. **Asegúrate de que las rutas están configuradas correctamente**:
   ```json
   {
     "rewrites": [
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```

### Si las variables de entorno no se cargan:

1. Verifica que los nombres sean **exactamente**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2. Asegúrate de que estén marcadas para **Production**
3. Haz un **Redeploy** completo (sin cache)

### Si el build falla:

1. Verifica que `package.json` tenga:
   ```json
   "scripts": {
     "build": "vite build"
   }
   ```
2. Asegúrate de que todas las dependencias estén en `dependencies` (no en `devDependencies`)

---

## 📝 Checklist Final

- [ ] Variables de entorno agregadas en Vercel
- [ ] Variables marcadas para Production, Preview, y Development
- [ ] `vercel.json` existe en la raíz del proyecto
- [ ] Build command es `npm run build`
- [ ] Output directory es `dist`
- [ ] Redeploy realizado sin cache
- [ ] Consola del navegador muestra "Supabase Key: Presente"

---

## 🎯 Resultado Esperado

Después de seguir estos pasos, tu aplicación debería:
- ✅ Cargar sin errores 404
- ✅ Conectarse correctamente a Supabase
- ✅ Mostrar la página de login
- ✅ Permitir navegación entre rutas

---

## 📞 Soporte Adicional

Si después de seguir estos pasos sigues teniendo problemas:

1. Revisa los **logs de build** en Vercel
2. Verifica la **consola del navegador** para errores específicos
3. Comprueba que Supabase esté funcionando correctamente

---

**Última actualización**: 2026-01-15
