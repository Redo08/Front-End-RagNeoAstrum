import { APIError, ChatMessage, ServerStatus, Source } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const MAX_RETRIES = 3;
const SESSION_KEY = "neoAstrumChatSession";

let sessionId: string | null = null;

interface SessionData {
  sessionId: string | null;
  messages: ChatMessage[];
}

/** Carga la sesión guardada en localStorage (mensajes + sessionId). */
export function loadChatSession(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return [];
  try {
    const data: SessionData = JSON.parse(raw);
    sessionId = data.sessionId;
    return (data.messages || []).filter((m) => m.type !== "error");
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return [];
  }
}

/** Guarda el estado actual de los mensajes + sessionId en localStorage. */
export function saveChatSession(messages: ChatMessage[]): void {
  if (typeof window === "undefined") return;
  const data: SessionData = { sessionId, messages };
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

export function clearSession(): void {
  sessionId = null;
  if (typeof window !== "undefined") localStorage.removeItem(SESSION_KEY);
}

async function fetchAPI(endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = `${API_URL}${endpoint}`;
  const isFormData = options.body instanceof FormData;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...(isFormData ? {} : { "Content-Type": "application/json" }),
          ...options.headers,
        },
      });

      if (!response.ok) {
        if (response.status < 500) {
          const errorData = await response.json().catch(() => ({}));
          throw new APIError(
            errorData.error || errorData.detail || `Error HTTP: ${response.status}`,
            response.status
          );
        }
        throw new Error(`Error temporal del servidor: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof APIError) throw error;

      if (attempt < MAX_RETRIES - 1) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw new APIError(
          "Error de conexión con el servidor. Verifica que el backend esté ejecutándose.",
          0
        );
      }
    }
  }
}

export async function checkHealth(): Promise<ServerStatus> {
  try {
    const health = await fetchAPI("/health", { method: "GET" });
    return health.status === "ok" ? "ready" : "loading";
  } catch {
    return "offline";
  }
}

export async function startConversation(): Promise<void> {
  try {
    const response = await fetchAPI("/chat/start", {
      method: "POST",
      body: JSON.stringify({ user_id: "anonymous" }),
    });
    sessionId = response.session_id ?? sessionId;
  } catch {
    // Silencioso: la conversación igual funciona sin sessionId explícito
  }
}

export async function sendMessage(
  question: string
): Promise<{ answer: string; sources: Source[] }> {
  const body: Record<string, unknown> = { message: question, user_id: "anonymous" };
  if (sessionId) body.session_id = sessionId;

  const response = await fetchAPI("/chat/message", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (response.session_id) sessionId = response.session_id;

  return {
    answer: response.response || response.answer || "No se encontró respuesta.",
    sources: response.sources || [],
  };
}

export async function uploadDocument(file: File): Promise<any> {
  const formData = new FormData();
  formData.append("files[]", file);
  return fetchAPI("/chat/upload", { method: "POST", body: formData });
}

export function getExamples(): string[] {
  return [
    "Resume el contenido de los documentos que subí",
    "¿Cuáles son los puntos clave del documento?",
    "Explícame esto como si tuviera 5 años",
    "¿Qué información falta o no está clara en el texto?",
  ];
}
