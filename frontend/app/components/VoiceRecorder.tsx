"use client";

import { useRef, useState } from "react";
import {
  AlertCircle,
  Loader2,
  Mic,
  Play,
  RotateCcw,
  Square,
  Volume2,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { API_URL } from "../lib/api";

export { API_URL };

/* ------------------------------------------------------------------
   Types
------------------------------------------------------------------ */

type RecorderState = "idle" | "recording" | "processing" | "success" | "error";

export interface VoiceApiResponse {
  transcribed_text: string;
  response_text: string;
  response_audio_base64: string | null;
  language: string;
}

/* ------------------------------------------------------------------
   Constants
------------------------------------------------------------------ */

const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/ogg",
];

/* ------------------------------------------------------------------
   Helpers
------------------------------------------------------------------ */

function pickMimeType(): string {
  return (
    PREFERRED_MIME_TYPES.find((type) => {
      try { return MediaRecorder.isTypeSupported(type); }
      catch { return false; }
    }) ?? ""
  );
}

function mimeToExt(mime: string): string {
  return mime.includes("ogg") ? "ogg" : "webm";
}

export function base64ToAudio(b64: string): HTMLAudioElement {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: "audio/wav" });
  return new Audio(URL.createObjectURL(blob));
}

export function humaniseError(err: unknown): string {
  if (!(err instanceof Error)) return "Something went wrong. Please try again.";
  const msg = err.message.toLowerCase();
  if (msg.includes("permission") || msg.includes("denied") || err.name === "NotAllowedError")
    return "Microphone permission denied. Please allow microphone access in your browser settings.";
  if (msg.includes("not found") || err.name === "NotFoundError")
    return "No microphone found. Please connect a microphone and try again.";
  if (msg.includes("fetch") || msg.includes("network") || msg.includes("failed to fetch"))
    return "Could not reach the AGRIVOICE server. Make sure the backend is running on port 8000.";
  return err.message;
}

/* ------------------------------------------------------------------
   Shared result card
------------------------------------------------------------------ */

interface ResultCardProps {
  result: VoiceApiResponse;
  onReset: () => void;
}

export function ResultCard({ result, onReset }: ResultCardProps) {
  const { t } = useLanguage();
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function getAudio(): HTMLAudioElement | null {
    if (!result.response_audio_base64) return null;
    if (!audioRef.current) {
      const audio = base64ToAudio(result.response_audio_base64);
      audio.onended = () => setIsPlaying(false);
      audioRef.current = audio;
    }
    return audioRef.current;
  }

  function handlePlay() {
    const audio = getAudio();
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      audio.play().catch(() => setIsPlaying(false));
    }
  }

  return (
    <div className="w-full rounded-2xl border border-ink-100 bg-sand-50 p-5 space-y-4 fade-in-up shadow-sm">
      {/* Transcription */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-ink-500 font-semibold mb-1.5">
          {t("you_said")}
        </p>
        <p className="text-sm text-ink-700 leading-relaxed italic">
          &ldquo;{result.transcribed_text}&rdquo;
        </p>
      </div>

      <div className="border-t border-ink-100" />

      {/* Response */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-ink-500 font-semibold mb-1.5">
          {t("response")}
        </p>
        <p className="text-sm text-ink-900 leading-relaxed whitespace-pre-line font-medium">
          {result.response_text}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-1">
        {result.response_audio_base64 && (
          <button
            onClick={handlePlay}
            className={[
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-800/40",
              isPlaying
                ? "bg-gold-400/15 border-gold-400/40 text-gold-400"
                : "bg-forest-900 border-forest-900 text-sand-50 hover:bg-forest-800",
            ].join(" ")}
          >
            {isPlaying
              ? <Volume2 className="w-3.5 h-3.5 animate-pulse" />
              : <Play className="w-3.5 h-3.5 fill-current" />
            }
            {isPlaying ? t("playing") : t("play")}
          </button>
        )}
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-ink-200 bg-sand-bg text-ink-700 hover:bg-sand-200 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-800/30"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {t("ask_again")}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Main VoiceRecorder component
------------------------------------------------------------------ */

export default function VoiceRecorder() {
  const { speechLanguage, t } = useLanguage();
  const [recState, setRecState] = useState<RecorderState>("idle");
  const [result, setResult] = useState<VoiceApiResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  /* ── Recording ──────────────────────────────────────────────────── */

  async function startRecording() {
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error("Audio recording is not supported in this browser.");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const finalMime = recorder.mimeType || mimeType || "audio/webm";
        submitAudio(new Blob(chunksRef.current, { type: finalMime }), finalMime);
      };

      recorder.start();
      setRecState("recording");
    } catch (err) {
      setErrorMsg(humaniseError(err));
      setRecState("error");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === "recording")
      mediaRecorderRef.current.stop();
    setRecState("processing");
  }

  /* ── API submission ─────────────────────────────────────────────── */

  async function submitAudio(blob: Blob, mimeType: string) {
    const form = new FormData();
    form.append("audio", blob, `recording.${mimeToExt(mimeType)}`);
    form.append("language", speechLanguage);

    try {
      const res = await fetch(`${API_URL}/api/voice/process`, {
        method: "POST",
        body: form,
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        const detail =
          typeof data === "object" && data !== null && "detail" in data
            ? String((data as { detail: unknown }).detail)
            : `Server error ${res.status}`;
        throw new Error(detail);
      }
      setResult(data as VoiceApiResponse);
      setRecState("success");
    } catch (err) {
      setErrorMsg(humaniseError(err));
      setRecState("error");
    }
  }

  /* ── Handlers ───────────────────────────────────────────────────── */

  function handleMicClick() {
    if (recState === "recording") {
      stopRecording();
    } else if (recState !== "processing") {
      setResult(null);
      setErrorMsg(null);
      startRecording();
    }
  }

  function reset() {
    setResult(null);
    setErrorMsg(null);
    setRecState("idle");
  }

  const isRecording  = recState === "recording";
  const isProcessing = recState === "processing";

  /* ── Render ─────────────────────────────────────────────────────── */

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto select-none">

      {/* Mic button + pulse rings */}
      <div className="relative flex items-center justify-center">
        {/* Idle pulse rings — dark green, low opacity on cream bg */}
        {recState === "idle" && (
          <>
            <span className="absolute w-36 h-36 rounded-full bg-forest-900/10 mic-ring" />
            <span className="absolute w-36 h-36 rounded-full bg-forest-900/7  mic-ring-2" />
            <span className="absolute w-36 h-36 rounded-full bg-forest-900/5  mic-ring-3" />
          </>
        )}
        {/* Recording rings — amber on cream */}
        {isRecording && (
          <>
            <span className="absolute w-36 h-36 rounded-full bg-gold-400/25 mic-ring-rec" />
            <span className="absolute w-36 h-36 rounded-full bg-gold-400/15 mic-ring-rec-2" />
          </>
        )}

        <button
          onClick={handleMicClick}
          disabled={isProcessing}
          aria-label={
            isRecording  ? t("listening")  :
            isProcessing ? t("processing") :
            t("tap_to_speak")
          }
          className={[
            "relative z-10 flex items-center justify-center w-24 h-24 rounded-full",
            "transition-all duration-300 ease-out active:scale-95",
            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-forest-900/30",
            isProcessing
              ? "cursor-not-allowed bg-forest-800 opacity-60"
              : isRecording
              ? "cursor-pointer hover:scale-105 bg-gold-400 shadow-[0_8px_30px_rgba(197,154,32,0.40)]"
              : "cursor-pointer hover:scale-105 bg-forest-900 shadow-[0_8px_30px_rgba(13,38,24,0.30)]",
          ].join(" ")}
        >
          {isProcessing ? (
            <Loader2 className="w-9 h-9 text-sand-50 animate-spin" />
          ) : isRecording ? (
            <Square className="w-8 h-8 text-forest-900 fill-forest-900" strokeWidth={0} />
          ) : (
            <Mic className="w-9 h-9 text-sand-50" strokeWidth={2} />
          )}
        </button>
      </div>

      {/* Status label */}
      <p
        className={[
          "text-sm font-semibold tracking-wide transition-all duration-300 -mt-2 text-center",
          isRecording  ? "text-gold-400"                  :
          isProcessing ? "text-ink-500 animate-pulse"     :
                         "text-ink-500",
        ].join(" ")}
      >
        {recState === "idle"       && t("tap_to_speak")}
        {recState === "recording"  && t("listening")}
        {recState === "processing" && t("processing")}
      </p>

      {/* Result card */}
      {recState === "success" && result && (
        <ResultCard result={result} onReset={reset} />
      )}

      {/* Error card */}
      {recState === "error" && errorMsg && (
        <div className="w-full rounded-2xl border border-red-200 bg-red-50 p-4 flex gap-3 items-start fade-in-up">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-red-700 leading-relaxed">{errorMsg}</p>
            <button
              onClick={reset}
              className="mt-2 text-[11px] font-semibold text-red-600 hover:text-red-800 underline underline-offset-2 transition-colors"
            >
              {t("ask_again")}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
