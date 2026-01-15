# Flujo de Generación de Covers - Documentación Completa

## Flujo Completo End-to-End

### 1. Usuario Crea un Job

**Ubicación**: `/app/projects/[projectId]` → Tab "Jobs" → Botón "Create Job"

**Proceso**:
1. Usuario llena formulario:
   - **Prompt**: Descripción del estilo y elementos deseados
   - **Model**: Selecciona "nano" (rápido) o "banana" (alta calidad)
   - **Target Store**: "ios" o "android"
   - **Num Variations**: 1-10 covers a generar
   - **Select Assets**: Opcionalmente selecciona reference_cover y app_screenshot assets

2. Al enviar:
   - Se crea registro en `generation_jobs` con status="queued"
   - Si hay assets seleccionados, se crean registros en `job_assets` con roles (reference/screenshot)
   - Se llama inmediatamente a `processGenerationJob()` en background

### 2. Procesamiento del Job

**Archivo**: `/app/actions/generate-covers.ts`

**Proceso paso a paso**:

#### Paso 1: Actualizar Estado
```typescript
status = "queued" → "running"
started_at = now()
```

#### Paso 2: Obtener Assets
- Si el job tiene `assetIds`, se obtienen de la tabla `assets`
- Se generan URLs firmadas para cada asset (para enviar a la API si es necesario)

#### Paso 3: Construir Prompt Mejorado
El prompt original se mejora agregando:
- **Contexto de store**: Instrucciones específicas de estilo (iOS: minimal/elegante, Android: vibrante/dinámico)
- **Referencias de assets**: Menciona si hay reference covers, screenshots, o logos
- **Especificaciones**: Dimensiones, formato, calidad profesional

**Ejemplo de prompt mejorado**:
```
Prompt original: "Modern fitness app with blue and orange colors"
Prompt mejorado: "Modern fitness app with blue and orange colors. iOS App Store cover style: minimal, clean, modern design with elegant typography. Square format 1024x1024px. Professional, sophisticated aesthetic. Use similar style and color palette as the provided reference covers. Incorporate visual elements and color scheme from the app screenshots. High quality, professional app store cover design. No text overlays, clean background."
```

#### Paso 4: Llamar a Google Imagen API
**Archivo**: `/lib/ai/google-imagen-client.ts`

**Modelos**:
- **nano**: `imagen-3.0-generate-001` (rápido, calidad básica)
- **banana**: `imagen-3.0-generate-002` (lento, alta calidad)

**Endpoints intentados** (en orden):
1. `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateImages`
2. Vertex AI endpoint (si `GOOGLE_CLOUD_PROJECT_ID` está configurado)

**Parámetros enviados**:
```json
{
  "prompt": "enhanced prompt...",
  "number_of_images": 3,
  "aspect_ratio": "1:1" // o "1024:500" para Android
}
```

**Respuesta esperada**:
- Array de imágenes como:
  - URLs externas (`http://...`)
  - Base64 data URLs (`data:image/png;base64,...`)
  - Objetos con `imageUri`, `base64`, o `bytesBase64Encoded`

#### Paso 5: Procesar Cada Imagen Generada

Para cada imagen retornada por la API:

1. **Convertir a Buffer**:
   - Si es base64: decodificar
   - Si es URL: descargar
   - Si ya es Buffer: usar directo

2. **Redimensionar según Store**:
   - **iOS**: 1024x1024px (cuadrado)
   - **Android**: 1024x500px (banner horizontal)
   - Usar `sharp` para resize manteniendo aspect ratio con `fit: "cover"`

3. **Convertir a PNG**:
   - Todas las imágenes se convierten a PNG
   - Se optimiza calidad

4. **Subir a Supabase Storage**:
   - Path: `projects/{projectId}/outputs/{outputId}.png`
   - Bucket: `app-covers` (debe ser PRIVADO)

5. **Insertar en `generated_outputs`**:
   ```typescript
   {
     id: outputId (UUID),
     job_id: jobId,
     project_id: projectId,
     user_id: userId,
     variant_index: 0, 1, 2, ...
     label: "Variant 1",
     mime_type: "image/png",
     size_bytes: tamaño_en_bytes,
     width: 1024,
     height: 1024 o 500,
     storage_key: "projects/.../outputs/....png",
     storage_provider: "supabase",
     created_at: now()
   }
   ```

#### Paso 6: Actualizar Job
- Si todas las imágenes se procesaron exitosamente:
  ```typescript
  status = "succeeded"
  finished_at = now()
  ```
- Si hubo error:
  ```typescript
  status = "failed"
  finished_at = now()
  error_message = "descripción del error"
  error_code = "GENERATION_ERROR"
  ```

### 3. Visualización de Resultados

**Tab "Jobs"**:
- Muestra lista de jobs con badges de status
- Jobs "running" tienen badge azul con animación pulse
- Auto-refresh cada 3 segundos cuando hay jobs activos
- Click en botón "Eye" abre diálogo con detalles del job

**Tab "Outputs"**:
- Grid de imágenes generadas con previews
- Usa signed URLs de Supabase Storage para mostrar imágenes
- Auto-refresh cada 5 segundos cuando hay pocos outputs (posible que aún se estén generando)
- Muestra metadata: dimensiones, tamaño de archivo

## Manejo de Errores

### Errores de API
- Si Google Imagen API falla: job se marca como "failed" con error_message
- Se intentan múltiples endpoints antes de fallar
- Errores se muestran en toast al usuario

### Errores de Storage
- Si falla upload: error se registra en job
- Se intenta continuar con siguiente variant si hay múltiples

### Errores de Procesamiento
- Si falla procesamiento de una imagen: continúa con siguiente
- Solo falla todo el job si es el único variant y falla

## Configuración Requerida

### Variables de Entorno
```env
# Supabase (requerido)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Google Imagen (requerido para generación)
GOOGLE_IMAGEN_API_KEY=...
# O alternativamente
GEMINI_API_KEY=...

# Opcional: Vertex AI
GOOGLE_CLOUD_PROJECT_ID=...
GOOGLE_CLOUD_LOCATION=us-central1
```

### Supabase Storage Bucket
1. Crear bucket `app-covers`
2. Configurar como **PRIVADO**
3. Políticas RLS:
   - Usuarios autenticados pueden subir a sus propias carpetas de proyectos
   - Usuarios autenticados pueden leer de sus propias carpetas de proyectos

### Base de Datos
- Asegurar que todas las tablas tienen RLS habilitado
- Políticas que permiten a usuarios autenticados acceder solo a sus propios datos

## Testing del Flujo

### Test Manual

1. **Crear Proyecto**:
   ```
   POST /app/projects
   - Title: "Test App"
   - Platform: "ios"
   ```

2. **Subir Assets**:
   - Subir un screenshot de app
   - Subir un reference cover

3. **Crear Job**:
   - Prompt: "Modern app with blue colors"
   - Model: "nano" (más rápido para testing)
   - Target Store: "ios"
   - Num Variations: 2
   - Seleccionar los assets subidos

4. **Verificar Procesamiento**:
   - Job debe cambiar a "running" inmediatamente
   - Esperar 10-30 segundos (según modelo)
   - Job debe cambiar a "succeeded"
   - Tab "Outputs" debe mostrar 2 imágenes generadas

5. **Verificar Outputs**:
   - Click en preview de imagen
   - Verificar que imagen carga correctamente
   - Verificar dimensiones: 1024x1024 para iOS

### Test de Errores

1. **Sin API Key**:
   - Job debe fallar con mensaje claro sobre API key faltante

2. **API Key Inválida**:
   - Job debe fallar con error de autenticación

3. **Bucket No Existe**:
   - Error en upload debe ser capturado y job marcado como failed

## Notas Importantes

1. **Google Imagen API**: Puede no estar disponible públicamente aún. Si falla, considera usar alternativas:
   - Replicate API
   - Stability AI
   - OpenAI DALL-E

2. **Rate Limiting**: Implementar límites de jobs simultáneos por usuario si es necesario

3. **Costos**: Trackear uso de API para evitar sorpresas en facturación

4. **Timeout**: Los jobs pueden tardar varios minutos. El polling en JobsTab maneja esto.

5. **Procesamiento Asíncrono**: El procesamiento se ejecuta en background sin bloquear la UI
