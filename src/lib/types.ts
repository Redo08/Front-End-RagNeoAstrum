export type MessageRole = "user" | "assistant" | "error";

export interface Source {
  content: string;
  metadata: {
    source?: string;
    source_filename?: string;
    [key: string]: unknown;
  };
  score: number | null;
}

export interface ChatMessage {
  id: string;
  type: MessageRole;
  content: string;
  sources?: Source[];
  timestamp: number;
}

export type ServerStatus = "checking" | "ready" | "loading" | "offline";

export type AvatarState = "idle" | "listening" | "thinking" | "speaking" | "error";

export class APIError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "APIError";
    this.status = status;
  }
}
