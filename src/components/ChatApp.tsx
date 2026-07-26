"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  checkHealth,
  clearSession,
  getExamples,
  loadChatSession,
  saveChatSession,
  sendMessage,
  startConversation,
  uploadDocument,
} from "@/lib/api";
import { APIError, AvatarState, ChatMessage, ServerStatus } from "@/lib/types";
import { useSpeech } from "@/hooks/useSpeech";
import Avatar from "./Avatar";
import ChatBubble from "./ChatBubble";
import {
  Mic,
  MicOff,
  Paperclip,
  Send,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  X,
  FileText,
} from "lucide-react";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const STATUS_LABEL: Record<ServerStatus, { text: string; color: string }> = {
  checking: { text: "Conectando…", color: "#94a3b8" },
  ready: { text: "En línea", color: "#34d399" },
  loading: { text: "Iniciando…", color: "#fbbf24" },
  offline: { text: "Backend desconectado", color: "#f87171" },
};

export default function ChatApp() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<ServerStatus>("checking");
  const [examples, setExamples] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [avatarState, setAvatarState] = useState<AvatarState>("idle");

  const [voiceMode, setVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const speech = useSpeech();

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  useEffect(() => {
    setMessages(loadChatSession());
    setExamples(getExamples());
    (async () => {
      setServerStatus("checking");
      const status = await checkHealth();
      setServerStatus(status);
    })();
  }, []);

  useEffect(() => {
    saveChatSession(messages);
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return;
    setPendingFiles((prev) => [...prev, ...Array.from(files)]);
  };

  const removeFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const speakMessage = useCallback(
    async (text: string, id?: string) => {
      if (isSpeaking) {
        speech.stopSpeaking();
        setIsSpeaking(false);
        setSpeakingId(null);
        setAvatarState("idle");
        return;
      }
      setIsSpeaking(true);
      setSpeakingId(id ?? null);
      setAvatarState("speaking");
      try {
        await speech.speak(text, { lang: "es-CO", rate: 0.95, pitch: 1, volume: 1 });
      } catch {
        setAvatarState("error");
      } finally {
        setIsSpeaking(false);
        setSpeakingId(null);
        setAvatarState("idle");
      }
    },
    [isSpeaking, speech]
  );

  const handleSubmit = useCallback(
    async (overrideText?: string) => {
      const userMessage = (overrideText ?? input).trim();
      const files = pendingFiles;

      if ((!userMessage && files.length === 0) || loading || serverStatus !== "ready") return;

      setInput("");
      setLoading(true);

      let displayContent = userMessage;
      if (files.length > 0) {
        const fileList = files.map((f) => `📎 ${f.name}`).join("\n");
        displayContent = userMessage ? `${userMessage}\n\n${fileList}` : fileList;
      }

      setMessages((prev) => [
        ...prev,
        { id: uid(), type: "user", content: displayContent, timestamp: Date.now() },
      ]);
      setAvatarState("thinking");

      try {
        if (files.length > 0) {
          for (const file of files) {
            try {
              await uploadDocument(file);
            } catch {
              setMessages((prev) => [
                ...prev,
                {
                  id: uid(),
                  type: "error",
                  content: `Error al subir ${file.name}`,
                  timestamp: Date.now(),
                },
              ]);
            }
          }
          setPendingFiles([]);
        }

        if (!userMessage) {
          setMessages((prev) => [
            ...prev,
            {
              id: uid(),
              type: "assistant",
              content: `Documento${files.length > 1 ? "s" : ""} recibido${files.length > 1 ? "s" : ""}. Dame unos segundos y pregúntame lo que quieras sobre su contenido.`,
              timestamp: Date.now(),
            },
          ]);
          setLoading(false);
          setAvatarState("idle");
          return;
        }
        const response = await sendMessage(userMessage);

        const assistantId = uid();
        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            type: "assistant",
            content: response.answer,
            sources: response.sources,
            timestamp: Date.now(),
          },
        ]);

        if (voiceMode) {
          await speakMessage(response.answer, assistantId);
        }
      } catch (err) {
        const message = err instanceof APIError ? err.message : "Error desconocido. Intenta de nuevo.";
        setMessages((prev) => [...prev, { id: uid(), type: "error", content: message, timestamp: Date.now() }]);
      } finally {
        setLoading(false);
        setAvatarState("idle");
      }
    },
    [input, pendingFiles, loading, serverStatus, voiceMode, speakMessage]
  );

  const toggleVoiceMode = () => {
    if (!speech.isTTSSupported || !speech.isSTTSupported) {
      alert("Tu navegador no soporta las funciones de voz.");
      return;
    }
    setVoiceMode((v) => {
      if (v) {
        speech.stopListening();
        speech.stopSpeaking();
        setIsListening(false);
        setIsSpeaking(false);
      }
      return !v;
    });
  };

  const startVoiceInput = async () => {
    if (loading || isListening) return;
    setAvatarState("listening");
    setIsListening(true);
    try {
      const transcript = await speech.startListening();
      setIsListening(false);
      setAvatarState("idle");
      if (transcript.trim()) {
        await handleSubmit(transcript);
      }
    } catch {
      setIsListening(false);
      setAvatarState("idle");
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          type: "error",
          content: "No se pudo capturar el audio. Verifica el micrófono.",
          timestamp: Date.now(),
        },
      ]);
    }
  };

  const handleClearChat = async () => {
    if (loading) return;
    speech.stopSpeaking();
    setIsSpeaking(false);
    setMessages([]);
    setPendingFiles([]);
    clearSession();
    if (serverStatus === "ready") {
      await startConversation();
    }
  };

  const status = STATUS_LABEL[serverStatus];
  const voiceSupported = speech.isTTSSupported && speech.isSTTSupported;

  return (
    <div className="relative z-10 flex h-dvh flex-col">
      {/* Header */}
      <header
        className="flex items-center justify-between px-5 py-3.5 shrink-0"
        style={{
          borderBottom: "1px solid var(--border)",
          paddingTop: "max(0.875rem, env(safe-area-inset-top))",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{
              border: "1.5px solid var(--accent)",
              background: "radial-gradient(circle at 35% 30%, rgba(79,178,255,0.3), transparent)",
            }}
          >
            <Sparkles size={16} style={{ color: "var(--accent-bright)" }} />
          </div>
          <div>
            <h1 className="font-display text-[15px] font-semibold leading-none">Neo Astrum</h1>
            <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
              Asistente de documentos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className="hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium"
            style={{ border: "1px solid var(--border)", color: status.color }}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${serverStatus === "checking" ? "pulse-dot" : ""}`}
              style={{ background: status.color }}
            />
            {status.text}
          </div>
          {/* Compact status dot for narrow screens — same info, no label eating space */}
          <span
            className={`sm:hidden h-2.5 w-2.5 rounded-full ${serverStatus === "checking" ? "pulse-dot" : ""}`}
            style={{ background: status.color }}
            title={status.text}
          />

          {/* Voice toggle: the sidebar copy of this control is hidden below md,
              so phones need their own way to reach it */}
          <button
            onClick={toggleVoiceMode}
            className="md:hidden flex h-10 w-10 items-center justify-center rounded-full transition-colors cursor-pointer"
            style={
              voiceMode
                ? { background: "var(--accent-soft)", border: "1px solid var(--border-strong)", color: "var(--accent-bright)" }
                : { border: "1px solid var(--border)", color: "var(--text-secondary)" }
            }
            title="Modo voz"
          >
            {voiceMode ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>

          <button
            onClick={handleClearChat}
            disabled={loading}
            title="Limpiar conversación"
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors cursor-pointer disabled:opacity-40"
            style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </header>

      {/* Chat area */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar avatar - hidden on small screens, voice toggle duplicated in header for mobile */}
        <aside
          className="hidden md:flex w-56 shrink-0 flex-col items-center justify-center gap-6 px-4"
          style={{ borderRight: "1px solid var(--border)" }}
        >
          <Avatar state={avatarState} />
          <button
            onClick={toggleVoiceMode}
            className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-colors cursor-pointer"
            style={
              voiceMode
                ? { background: "var(--accent-soft)", border: "1px solid var(--border-strong)", color: "var(--accent-bright)" }
                : { border: "1px solid var(--border)", color: "var(--text-secondary)" }
            }
          >
            {voiceMode ? <Volume2 size={14} /> : <VolumeX size={14} />}
            Modo voz {voiceMode ? "activo" : "inactivo"}
          </button>
          {!voiceSupported && (
            <p className="text-center text-[10.5px]" style={{ color: "var(--text-muted)" }}>
              Tu navegador no soporta funciones de voz.
            </p>
          )}
        </aside>

        {/* Messages + input */}
        <main className="flex flex-1 min-w-0 flex-col">
          <div ref={scrollRef} className="custom-scrollbar flex-1 overflow-y-auto px-3 sm:px-5 py-6">
            <div className="mx-auto flex max-w-2xl flex-col gap-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center gap-5 pt-10 text-center">
                  <div className="md:hidden flex flex-col items-center gap-2">
                    <Avatar state={avatarState} />
                    {voiceSupported && (
                      <button
                        onClick={toggleVoiceMode}
                        className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-colors cursor-pointer"
                        style={
                          voiceMode
                            ? { background: "var(--accent-soft)", border: "1px solid var(--border-strong)", color: "var(--accent-bright)" }
                            : { border: "1px solid var(--border)", color: "var(--text-secondary)" }
                        }
                      >
                        {voiceMode ? <Volume2 size={14} /> : <VolumeX size={14} />}
                        Modo voz {voiceMode ? "activo" : "inactivo"}
                      </button>
                    )}
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-semibold">¿En qué puedo ayudarte?</h2>
                    <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                      Sube un documento o hazme una pregunta para empezar.
                    </p>
                  </div>
                  <div className="grid w-full gap-2 sm:grid-cols-2">
                    {examples.map((ex) => (
                      <button
                        key={ex}
                        onClick={() => setInput(ex)}
                        className="rounded-xl px-3.5 py-2.5 text-left text-[13px] transition-colors cursor-pointer"
                        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m) => (
                <ChatBubble
                  key={m.id}
                  message={m}
                  onSpeak={(text) => speakMessage(text, m.id)}
                  isSpeaking={isSpeaking && speakingId === m.id}
                />
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div
                    className="flex items-center gap-1 rounded-2xl px-4 py-3"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderBottomLeftRadius: 6 }}
                  >
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="think-dot block h-1.5 w-1.5 rounded-full"
                        style={{ background: "var(--accent)", animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input bar */}
          <div
            className="shrink-0 px-3 sm:px-5 pt-2"
            style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
          >
            <div className="mx-auto max-w-2xl">
              {pendingFiles.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {pendingFiles.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs"
                      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                    >
                      <FileText size={12} />
                      <span className="max-w-[140px] truncate">{f.name}</span>
                      <button onClick={() => removeFile(i)} className="cursor-pointer" aria-label={`Quitar ${f.name}`}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div
                className="flex items-end gap-1.5 sm:gap-2 rounded-2xl px-2.5 py-2.5"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-strong)" }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    handleFilesSelected(e.target.files);
                    e.target.value = "";
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={serverStatus !== "ready"}
                  title="Adjuntar documento"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors cursor-pointer disabled:opacity-40"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <Paperclip size={17} />
                </button>

                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder={
                    serverStatus === "ready" ? "Escribe tu pregunta…" : "Esperando conexión con el backend…"
                  }
                  disabled={serverStatus !== "ready"}
                  rows={1}
                  // text-base (16px) on mobile stops iOS Safari's auto-zoom-on-focus;
                  // sm: drops back to the tighter desktop size
                  className="max-h-32 flex-1 resize-none bg-transparent py-2 sm:py-1.5 text-base sm:text-[14.5px] outline-none placeholder:text-[var(--text-muted)] disabled:opacity-50"
                  style={{ color: "var(--text-primary)" }}
                />

                <button
                  onClick={isListening ? speech.stopListening : startVoiceInput}
                  disabled={!voiceSupported || serverStatus !== "ready" || loading}
                  title={isListening ? "Detener grabación" : "Hablar"}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors cursor-pointer disabled:opacity-30"
                  style={
                    isListening
                      ? { background: "rgba(248,113,113,0.15)", color: "#f87171" }
                      : { color: "var(--text-secondary)" }
                  }
                >
                  {isListening ? <MicOff size={17} /> : <Mic size={17} />}
                </button>

                <button
                  onClick={() => handleSubmit()}
                  disabled={(!input.trim() && pendingFiles.length === 0) || loading || serverStatus !== "ready"}
                  title="Enviar"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-opacity cursor-pointer disabled:opacity-30"
                  style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-bright))" }}
                >
                  <Send size={15} style={{ color: "#04101f" }} />
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}