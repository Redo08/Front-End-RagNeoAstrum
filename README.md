# Neo Astrum — Asistente de documentos (Frontend)

Next.js 15 + TypeScript + Tailwind. Interfaz de chat para el backend RAG (Flask), con el mismo
set de funcionalidades que la versión anterior en Angular:

- Chat con persistencia de sesión (localStorage)
- Subida de documentos (.pdf / .txt) adjuntos al mensaje
- Modo voz: dictado (STT) + lectura de respuestas (TTS), vía Web Speech API
- Avatar animado con estados: idle / listening / thinking / speaking / error
- Verificación de salud del backend (`/health`) con indicador en vivo
- Preguntas de ejemplo al iniciar
- Reintentos con backoff exponencial en las llamadas al backend

## Correr en local

```bash
npm install
cp .env.example .env.local   # ajusta NEXT_PUBLIC_API_URL si tu backend no está en localhost:5000
npm run dev
```

Abre http://localhost:3000. Asegúrate de que el backend Flask esté corriendo (con CORS habilitado,
como ya lo tienes en `app.py`).

## Variables de entorno

- `NEXT_PUBLIC_API_URL` — URL base del backend Flask (por defecto `http://localhost:5000`).

## Estructura

```
src/
  app/            layout, página raíz, estilos globales
  components/     ChatApp (orquestador), ChatBubble, Avatar
  hooks/          useSpeech (Web Speech API)
  lib/            api.ts (cliente HTTP), types.ts
```

## Endpoints que consume

- `GET  /health`
- `POST /chat/start`
- `POST /chat/message`
- `POST /chat/upload` (multipart, campo `files[]`)
