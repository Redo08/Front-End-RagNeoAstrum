"use client";

import { AvatarState } from "@/lib/types";

const STATUS_TEXT: Record<AvatarState, string> = {
  idle: "Listo para ayudarte",
  listening: "Te estoy escuchando…",
  thinking: "Pensando…",
  speaking: "Hablando…",
  error: "Algo salió mal",
};

const RING_COLOR: Record<AvatarState, string> = {
  idle: "var(--accent)",
  listening: "var(--accent-bright)",
  thinking: "var(--accent)",
  speaking: "var(--accent-bright)",
  error: "var(--error)",
};

export default function Avatar({ state, compact = false }: { state: AvatarState; compact?: boolean }) {
  const size = compact ? 40 : 96;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative flex items-center justify-center rounded-full"
        style={{
          width: size,
          height: size,
          background: "radial-gradient(circle at 35% 30%, rgba(79,178,255,0.35), rgba(6,11,22,0.9))",
          border: `1.5px solid ${RING_COLOR[state]}`,
          boxShadow: state !== "idle" ? `0 0 22px -2px ${RING_COLOR[state]}` : "none",
          transition: "box-shadow 0.3s ease, border-color 0.3s ease",
        }}
      >
        {/* Listening rings */}
        {state === "listening" && (
          <>
            <span
              className="listen-ring absolute inset-0 rounded-full border"
              style={{ borderColor: "var(--accent-bright)" }}
            />
            <span
              className="listen-ring absolute inset-0 rounded-full border"
              style={{ borderColor: "var(--accent-bright)", animationDelay: "0.5s" }}
            />
          </>
        )}

        {/* Face */}
        <div className="flex flex-col items-center gap-1" style={{ transform: compact ? "scale(0.6)" : "none" }}>
          <div className="flex gap-2.5">
            <span
              className="eye-blink block rounded-full"
              style={{ width: 6, height: 8, background: RING_COLOR[state] }}
            />
            <span
              className="eye-blink block rounded-full"
              style={{ width: 6, height: 8, background: RING_COLOR[state], animationDelay: "0.15s" }}
            />
          </div>

          {state === "thinking" ? (
            <div className="flex gap-1 mt-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="think-dot block rounded-full"
                  style={{
                    width: 4,
                    height: 4,
                    background: "var(--accent)",
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>
          ) : state === "speaking" ? (
            <div className="flex items-end gap-0.5 mt-1.5" style={{ height: 8 }}>
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="wave-bar block rounded-full"
                  style={{
                    width: 2.5,
                    height: 8,
                    background: "var(--accent-bright)",
                    animationDelay: `${i * 0.12}s`,
                  }}
                />
              ))}
            </div>
          ) : (
            <div
              className="mt-1.5 rounded-full"
              style={{
                width: state === "error" ? 10 : 14,
                height: state === "error" ? 3 : 2,
                background: RING_COLOR[state],
                opacity: 0.8,
                borderRadius: state === "error" ? "0 0 8px 8px" : "8px",
              }}
            />
          )}
        </div>
      </div>

      {!compact && (
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {STATUS_TEXT[state]}
        </span>
      )}
    </div>
  );
}
