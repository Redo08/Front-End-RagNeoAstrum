"use client";

import { useState } from "react";
import { ChatMessage } from "@/lib/types";
import { Volume2, VolumeX, FileText, ChevronDown } from "lucide-react";

export default function ChatBubble({
  message,
  onSpeak,
  isSpeaking,
}: {
  message: ChatMessage;
  onSpeak?: (text: string) => void;
  isSpeaking?: boolean;
}) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const isUser = message.type === "user";
  const isError = message.type === "error";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} animate-fade-in-up`}>
      <div className={`max-w-[80%] flex flex-col gap-1.5 ${isUser ? "items-end" : "items-start"}`}>
        <div
          className="rounded-2xl px-4 py-3 text-[14.5px] leading-relaxed whitespace-pre-wrap"
          style={
            isUser
              ? {
                  background: "linear-gradient(135deg, var(--accent), var(--accent-bright))",
                  color: "#04101f",
                  fontWeight: 500,
                  borderBottomRightRadius: 6,
                }
              : isError
              ? {
                  background: "rgba(248,113,113,0.08)",
                  border: "1px solid rgba(248,113,113,0.3)",
                  color: "#fca5a5",
                  borderBottomLeftRadius: 6,
                }
              : {
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  borderBottomLeftRadius: 6,
                }
          }
        >
          {message.content}
        </div>

        {!isUser && !isError && onSpeak && (
          <button
            onClick={() => onSpeak(message.content)}
            className="flex items-center gap-1 text-xs px-1 transition-colors cursor-pointer"
            style={{ color: "var(--text-muted)" }}
            aria-label={isSpeaking ? "Detener lectura en voz alta" : "Leer en voz alta"}
          >
            {isSpeaking ? <VolumeX size={13} /> : <Volume2 size={13} />}
            {isSpeaking ? "Detener" : "Escuchar"}
          </button>
        )}

        {message.sources && message.sources.length > 0 && (
          <div className="w-full">
            <button
              onClick={() => setSourcesOpen((v) => !v)}
              className="flex items-center gap-1.5 text-xs px-1 py-0.5 rounded-md transition-colors cursor-pointer"
              style={{ color: "var(--accent-bright)" }}
            >
              <FileText size={12} />
              {message.sources.length} fuente{message.sources.length > 1 ? "s" : ""}
              <ChevronDown
                size={12}
                style={{ transform: sourcesOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
              />
            </button>
            {sourcesOpen && (
              <div className="mt-1.5 flex flex-col gap-1.5">
                {message.sources.map((s, i) => (
                  <div
                    key={i}
                    className="rounded-lg px-3 py-2 text-xs"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ color: "var(--accent-bright)" }} className="font-medium">
                        {s.metadata?.source_filename || s.metadata?.source || "Documento"}
                      </span>
                      {s.score !== null && <span style={{ color: "var(--text-muted)" }}>score {s.score.toFixed(2)}</span>}
                    </div>
                    <p className="line-clamp-3">{s.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
