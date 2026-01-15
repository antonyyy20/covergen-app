# Instalación - Guía Rápida

## 1. Instalar dependencias

Desde la carpeta del proyecto `generador_de_portadas`, ejecuta:

```bash
npm install
```

Esto instalará todas las dependencias necesarias, incluyendo:
- Next.js 16
- Supabase (cliente SSR)
- shadcn/ui y componentes Radix UI
- TailwindCSS
- Framer Motion (para animaciones Magic UI)
- React Hook Form + Zod
- Sonner (toasts)
- Y más...

## 2. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
```

Puedes obtener estos valores desde tu proyecto de Supabase en:
- Dashboard > Settings > API > Project URL
- Dashboard > Settings > API > Project API keys > anon/public

## 3. Ejecutar el servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 4. Configurar Supabase

Antes de usar la aplicación, necesitas:

1. **Crear el bucket de Storage**:
   - Ve a Storage en Supabase Dashboard
   - Crea un bucket llamado `app-covers`
   - Configúralo como **PRIVADO**

2. **Verificar las tablas de la base de datos**:
   - Asegúrate de que existan: `profiles`, `projects`, `assets`, `generation_jobs`, `job_assets`, `generated_outputs`

3. **Habilitar RLS** (Row Level Security):
   - Todas las tablas deben tener RLS habilitado
   - Crea políticas para que usuarios autenticados solo vean sus propios datos

Ver [SETUP.md](./SETUP.md) para instrucciones detalladas de Supabase.

## Solución de Problemas

### Error: "Cannot find module"
Si ves errores de módulos faltantes:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Error de PostCSS/TailwindCSS
Ya está corregido usando la configuración tradicional de Tailwind v3.

### Error de TypeScript
Ejecuta:
```bash
npm install --save-dev @types/node @types/react @types/react-dom
```

## Comandos Útiles

```bash
# Desarrollo
npm run dev

# Build de producción
npm run build

# Ejecutar producción localmente
npm run start

# Linting
npm run lint
```
