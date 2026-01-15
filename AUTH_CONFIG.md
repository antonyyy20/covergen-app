# Configuración de Autenticación

## ⚠️ PROBLEMA COMÚN: Links de redirección usando localhost

Si recibes links de Supabase con `localhost:3000` en producción, verifica:

1. ✅ **Variable de entorno configurada en Vercel**: `NEXT_PUBLIC_APP_URL`
2. ✅ **Site URL en Supabase**: Debe ser tu URL de producción
3. ✅ **Redirect URLs en Supabase**: Debe incluir tu URL de producción

## Variables de Entorno Requeridas

### En Vercel (Producción)
**IMPORTANTE**: Debes configurar esta variable en Vercel:

```
NEXT_PUBLIC_APP_URL=https://covergen-app.vercel.app
```

**Pasos en Vercel:**
1. Ve a tu proyecto en Vercel Dashboard
2. Settings → Environment Variables
3. Agrega:
   - Key: `NEXT_PUBLIC_APP_URL`
   - Value: `https://covergen-app.vercel.app`
   - Environment: Production (y Preview si lo deseas)
4. **Re-deploy tu aplicación** para que la variable tome efecto

### En desarrollo local
Crea un archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Configuración en Supabase

### 1. Site URL
1. Ve a tu proyecto en Supabase Dashboard
2. Navega a **Authentication → URL Configuration**
3. **Site URL**: Debe ser tu URL de producción
   ```
   https://covergen-app.vercel.app
   ```
   ⚠️ **NO uses localhost aquí**, usa tu URL de producción

### 2. Redirect URLs
En la misma sección, agrega todas las siguientes URLs (una por línea):

```
https://covergen-app.vercel.app/auth/callback
https://covergen-app.vercel.app/auth/callback?next=/app
https://covergen-app.vercel.app/auth/callback?next=/reset-password
http://localhost:3000/auth/callback
http://localhost:3000/auth/callback?next=/app
http://localhost:3000/auth/callback?next=/reset-password
```

**Importante**: Incluye tanto las URLs de producción como las de desarrollo local.

## Cómo Funciona

1. **Registro**: Cuando un usuario se registra, se envía un email con un enlace que redirige a:
   - `{NEXT_PUBLIC_APP_URL}/auth/callback?next=/app`

2. **Reset Password**: Cuando se solicita reset de contraseña, se envía un email que redirige a:
   - `{NEXT_PUBLIC_APP_URL}/auth/callback?next=/reset-password`

3. **Callback Route**: La ruta `/auth/callback` intercambia el código por una sesión y redirige al usuario a la ruta especificada en el parámetro `next`.

## Verificación

Para verificar que todo funciona:

1. **En desarrollo**: Asegúrate de que `NEXT_PUBLIC_APP_URL=http://localhost:3000` esté en tu `.env.local`
2. **En producción**: Asegúrate de que `NEXT_PUBLIC_APP_URL=https://covergen-app.vercel.app` esté configurada en Vercel
3. **Prueba el flujo completo**:
   - Registro → Email de confirmación → Click en link → Debe redirigir a `/app`
   - Forgot Password → Email de reset → Click en link → Debe redirigir a `/reset-password`
