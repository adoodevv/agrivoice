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
   Result card
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
    <div className="w-full rounded-2xl border border-ink-100/80 bg-sand-50 overflow-hidden scale-in shadow-sm">
      {/* Transcription */}
      <div className="px-5 pt-5 pb-4">
        <p className="text-[9px] uppercase tracking-[0.14em] text-ink-400 font-bold mb-2">
          {t("you_said")}
        </p>
        <p className="text-[13px] text-ink-600 leading-relaxed italic">
          &ldquo;{result.transcribed_text}&rdquo;
        </p>
      </div>

      <div className="h-px bg-ink-100/60 mx-5" />

      {/* Response */}
      <div className="px-5 pt-4 pb-4">
        <p className="text-[9px] uppercase tracking-[0.14em] text-ink-400 font-bold mb-2">
          {t("response")}
        </p>
        <p className="text-[13px] text-ink-900 leading-[1.65] whitespace-pre-line">
          {result.response_text}
        </p>
      </div>

      {/* Actions bar */}
      <div className="flex items-center gap-2 px-5 pb-5 pt-1">
        {result.response_audio_base64 && (
          <button
            onClick={handlePlay}
            className={[
              "flex items-center gap-1.5 pl-3.5 pr-4 py-2 rounded-xl text-[11px] font-bold transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-800/40",
              isPlaying
                ? "bg-gold-300/15 text-gold-400 ring-1 ring-gold-300/30"
                : "bg-forest-900 text-sand-50 hover:bg-forest-800 shadow-sm",
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
          className="flex items-center gap-1.5 pl-3.5 pr-4 py-2 rounded-xl text-[11px] font-bold border border-ink-200/80 bg-sand-bg text-ink-600 hover:bg-sand-200 hover:text-ink-800 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-800/30"
        >
          <RotateCcw className="w-3 h-3" />
          {t("ask_again")}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Main VoiceRecorder
------------------------------------------------------------------ */

export default function VoiceRecorder() {
  const { speechLanguage, t } = useLanguage();
  const [recState, setRecState] = useState<RecorderState>("idle");
  const [result, setResult] = useState<VoiceApiResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-sm mx-auto select-none">

      {/* Mic button + rings */}
      <div className="relative flex items-center justify-center h-36 w-36">
        {recState === "idle" && (
          <>
            <span className="absolute inset-0 rounded-full bg-forest-900/8  mic-ring" />
            <span className="absolute inset-0 rounded-full bg-forest-900/5  mic-ring-2" />
            <span className="absolute inset-0 rounded-full bg-forest-900/3  mic-ring-3" />
          </>
        )}
        {isRecording && (
          <>
            <span className="absolute inset-0 rounded-full bg-gold-400/20 mic-ring-rec" />
            <span className="absolute inset-0 rounded-full bg-gold-400/10 mic-ring-rec-2" />
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
            "relative z-10 flex items-center justify-center w-[76px] h-[76px] rounded-full",
            "transition-all duration-300 ease-out active:scale-93",
            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-forest-900/25",
            isProcessing
              ? "cursor-not-allowed bg-forest-800 opacity-50"
              : isRecording
              ? "cursor-pointer bg-gold-400 shadow-[0_6px_28px_rgba(197,154,32,0.35)] hover:shadow-[0_8px_32px_rgba(197,154,32,0.45)]"
              : "cursor-pointer bg-forest-900 shadow-[0_6px_28px_rgba(13,38,24,0.25)] hover:shadow-[0_10px_36px_rgba(13,38,24,0.35)] hover:scale-105",
          ].join(" ")}
        >
          {isProcessing ? (
            <Loader2 className="w-8 h-8 text-sand-50 animate-spin" />
          ) : isRecording ? (
            <Square className="w-7 h-7 text-forest-900 fill-forest-900" strokeWidth={0} />
          ) : (
            <Mic className="w-8 h-8 text-sand-50" strokeWidth={1.8} />
          )}
        </button>
      </div>

      {/* Status */}
      <p
        className={[
          "text-[13px] font-semibold tracking-wide transition-all duration-300 text-center -mt-1",
          isRecording  ? "text-gold-400"              :
          isProcessing ? "text-ink-400 animate-pulse"  :
                         "text-ink-400",
        ].join(" ")}
      >
        {recState === "idle"       && t("tap_to_speak")}
        {recState === "recording"  && t("listening")}
        {recState === "processing" && t("processing")}
      </p>

      {/* Result */}
      {recState === "success" && result && (
        <ResultCard result={result} onReset={reset} />
      )}

      {/* Error */}
      {recState === "error" && errorMsg && (
        <div className="w-full rounded-2xl border border-red-200/80 bg-red-50 p-4 flex gap-3 items-start scale-in">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] text-red-700 leading-relaxed">{errorMsg}</p>
            <button
              onClick={reset}
              className="mt-2.5 text-[11px] font-bold text-red-500 hover:text-red-700 underline underline-offset-2 decoration-red-300 transition-colors"
            >
              {t("ask_again")}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
