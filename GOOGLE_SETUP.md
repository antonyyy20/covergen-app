# Configuración de Google Imagen API (Nano/Banana)

## Opciones de Integración

Google ofrece varias opciones para generar imágenes con IA. Aquí están las opciones más viables:

### Opción 1: Google Gemini API (Recomendado)

Google Gemini puede generar imágenes. Necesitas:

1. **Obtener API Key**:
   - Ve a https://aistudio.google.com/app/apikey
   - Crea un nuevo API key
   - O usa Google Cloud Console

2. **Variable de entorno**:
   ```env
   GEMINI_API_KEY=tu_api_key_aqui
   ```

3. **Modelos disponibles**:
   - `gemini-2.0-flash-exp` (nano - rápido)
   - `gemini-1.5-pro` (banana - alta calidad)

### Opción 2: Vertex AI Image Generation

Si tienes acceso a Google Cloud:

1. **Habilitar API**:
   ```bash
   gcloud services enable aiplatform.googleapis.com
   ```

2. **Crear Service Account**:
   - Ve a Google Cloud Console > IAM & Admin > Service Accounts
   - Crea un nuevo service account con permisos de Vertex AI

3. **Variables de entorno**:
   ```env
   GOOGLE_CLOUD_PROJECT_ID=tu_project_id
   GOOGLE_CLOUD_LOCATION=us-central1
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
   ```

### Opción 3: Generative AI REST API

Usando directamente la REST API de Google:

1. **API Key desde Google Cloud**:
   - Ve a Google Cloud Console > APIs & Services > Credentials
   - Crea API Key
   - Habilita "Generative Language API"

2. **Variable de entorno**:
   ```env
   GOOGLE_IMAGEN_API_KEY=tu_api_key_aqui
   ```

3. **Endpoints**:
   - Nano: `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateImages`
   - Banana: `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateImages`

## Verificación Actual de Google Imagen

**Nota importante**: Google Imagen puede no estar disponible públicamente aún. Google ha estado desarrollando capacidades de generación de imágenes pero puede estar en preview o acceso limitado.

**Alternativas si Google Imagen no está disponible**:

1. **Replicate API** (Fácil integración)
   ```env
   REPLICATE_API_TOKEN=tu_token
   ```
   Modelos: `stability-ai/sdxl`, `black-forest-labs/flux-pro`

2. **OpenAI DALL-E** (Pago por uso)
   ```env
   OPENAI_API_KEY=tu_key
   ```

3. **Stability AI** (Generación de imágenes)
   ```env
   STABILITY_API_KEY=tu_key
   ```

## Actualizar el Código Según la API Disponible

Si Google Imagen no está disponible, necesitarás actualizar `app/actions/generate-covers.ts` para usar una API alternativa. El código actual incluye intentos de múltiples endpoints de Google, pero puede necesitar ajustes según la API exacta disponible.

## Testing

1. Obtén tu API key
2. Agrega a `.env.local`
3. Crea un job de prueba
4. Verifica los logs en la consola del servidor para ver qué endpoint funciona
5. Ajusta el código según los errores que aparezcan

## Troubleshooting

- **Error "API not found"**: La API de Google Imagen puede no estar disponible en tu región o requiere acceso especial
- **Error "Unauthorized"**: Verifica que tu API key sea válida y tenga los permisos correctos
- **Error "Quota exceeded"**: Has alcanzado el límite de requests. Espera o aumenta el quota
