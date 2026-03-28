"use client";

import { useState } from "react";
import { Mic, Square } from "lucide-react";

type Status = "idle" | "recording" | "processing";

export default function MicButton() {
  const [status, setStatus] = useState<Status>("idle");

  function handleClick() {
    if (status === "idle") {
      setStatus("recording");
    } else if (status === "recording") {
      setStatus("processing");
      // Simulate processing delay — replace with real API call
      setTimeout(() => setStatus("idle"), 2000);
    }
  }

  const isRecording = status === "recording";
  const isProcessing = status === "processing";

  return (
    <div className="flex flex-col items-center gap-5 select-none">
      {/* Pulse rings + button wrapper */}
      <div className="relative flex items-center justify-center">

        {/* Idle rings */}
        {status === "idle" && (
          <>
            <span className="absolute w-36 h-36 rounded-full bg-forest-500/20 mic-ring" />
            <span className="absolute w-36 h-36 rounded-full bg-forest-500/15 mic-ring-2" />
            <span className="absolute w-36 h-36 rounded-full bg-forest-500/10 mic-ring-3" />
          </>
        )}

        {/* Recording rings — faster, amber-tinted */}
        {isRecording && (
          <>
            <span className="absolute w-36 h-36 rounded-full bg-gold-400/30 mic-ring-rec" />
            <span className="absolute w-36 h-36 rounded-full bg-gold-400/20 mic-ring-rec-2" />
          </>
        )}

        {/* Main button */}
        <button
          onClick={handleClick}
          disabled={isProcessing}
          aria-label={
            status === "idle"
              ? "Tap to start speaking"
              : status === "recording"
              ? "Tap to stop recording"
              : "Processing your voice…"
          }
          className={[
            "relative z-10 flex items-center justify-center",
            "w-24 h-24 rounded-full",
            "transition-all duration-300 ease-out",
            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-400/60",
            "active:scale-95 hover:scale-105",
            isProcessing
              ? "cursor-not-allowed opacity-70"
              : "cursor-pointer",
            isRecording
              ? "bg-gradient-to-br from-gold-400 to-gold-600 shadow-[0_0_40px_rgba(251,191,36,0.45)]"
              : isProcessing
              ? "bg-gradient-to-br from-forest-600 to-forest-800 shadow-[0_0_30px_rgba(82,183,136,0.3)]"
              : "bg-gradient-to-br from-forest-500 to-forest-800 shadow-[0_0_50px_rgba(82,183,136,0.4)]",
          ].join(" ")}
        >
          {isRecording ? (
            <Square className="w-9 h-9 text-forest-950 fill-forest-950" strokeWidth={0} />
          ) : (
            <Mic
              className={`w-9 h-9 ${isProcessing ? "text-forest-300" : "text-cream-50"}`}
              strokeWidth={2}
            />
          )}
        </button>
      </div>

      {/* Status label */}
      <p
        className={[
          "text-sm font-medium tracking-wide transition-colors duration-300",
          isRecording
            ? "text-gold-400"
            : isProcessing
            ? "text-forest-400 animate-pulse"
            : "text-cream-100/60",
        ].join(" ")}
      >
        {status === "idle"
          ? "Tap to speak"
          : status === "recording"
          ? "Listening… tap to stop"
          : "Processing…"}
      </p>
    </div>
  );
}
