"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useSpeech() {
  const recognitionRef = useRef<any>(null);
  const [isSTTSupported, setIsSTTSupported] = useState(false);
  const [isTTSSupported, setIsTTSSupported] = useState(false);

  useEffect(() => {
    setIsSTTSupported(
      "SpeechRecognition" in window || "webkitSpeechRecognition" in window
    );
    setIsTTSSupported("speechSynthesis" in window);    
  }, []);

  const startListening = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined") return reject(new Error("No window"));
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) return reject(new Error("STT no soportado"));

      const recognition = new SpeechRecognition();
      recognition.lang = "es-CO";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognitionRef.current = recognition;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        resolve(transcript);
      };
      recognition.onerror = (event: any) => reject(new Error(event.error));
      recognition.onend = () => {
        recognitionRef.current = null;
      };

      recognition.start();
    });
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop?.();
    recognitionRef.current = null;
  }, []);

  const speak = useCallback(
    (
      text: string,
      opts: { lang?: string; rate?: number; pitch?: number; volume?: number } = {}
    ): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) {
          return reject(new Error("TTS no soportado"));
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = opts.lang ?? "es-CO";
        utterance.rate = opts.rate ?? 0.95;
        utterance.pitch = opts.pitch ?? 1;
        utterance.volume = opts.volume ?? 1;
        utterance.onend = () => resolve();
        utterance.onerror = () => reject(new Error("Error de síntesis de voz"));
        window.speechSynthesis.speak(utterance);
      });
    },
    []
  );

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return {
    isSTTSupported,
    isTTSSupported,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}
