"use client";

import { useState } from "react";
import { ArrowRight, Leaf, Loader2 } from "lucide-react";
import VoiceRecorder, { ResultCard, VoiceApiResponse, humaniseError } from "../components/VoiceRecorder";
import { API_URL } from "../lib/api";
import { useLanguage } from "../context/LanguageContext";

function TextQuery({ onResult }: { onResult: (r: VoiceApiResponse) => void }) {
  const { speechLanguage, t } = useLanguage();
  const [text,    setText]    = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    try {
      const res  = await fetch(`${API_URL}/api/voice/text`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text: trimmed, language: speechLanguage }),
      });
      const data = await res.json() as VoiceApiResponse;
      if (!res.ok) throw new Error((data as unknown as { detail?: string }).detail ?? `${res.status}`);
      onResult(data);
      setText("");
    } catch (err) {
      setError(humaniseError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="relative">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("advice_placeholder")}
          disabled={loading}
          className="w-full rounded-xl border border-ink-200/80 bg-sand-50 px-4 py-3 pr-12 text-sm text-ink-900 placeholder-ink-300 focus:outline-none focus:ring-2 focus:ring-forest-900/25 focus:border-transparent transition-all disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          aria-label="Send"
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg bg-forest-900 text-sand-50 hover:bg-forest-800 disabled:opacity-30 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-900/40"
        >
          {loading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
          }
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200/80 rounded-xl px-4 py-2.5">
          {error}
        </p>
      )}
    </form>
  );
}

export default function AdvicePage() {
  const { t } = useLanguage();
  const [textResult, setTextResult] = useState<VoiceApiResponse | null>(null);

  return (
    <div className="px-4 pt-8 pb-8 max-w-lg mx-auto w-full">

      <div className="mb-7 fade-in-up">
        <div className="flex items-center gap-2 mb-1">
          <Leaf className="w-[18px] h-[18px] text-ink-900" strokeWidth={2.2} />
          <h2 className="text-xl font-bold text-ink-900 tracking-tight">{t("advice_title")}</h2>
        </div>
        <p className="text-[11px] text-ink-400 mt-0.5">{t("advice_subtitle")}</p>
      </div>

      {/* Voice */}
      <div className="rounded-[22px] border border-ink-100/60 bg-gradient-to-b from-sage-100 to-sage-100/40 px-5 py-8 flex flex-col items-center mb-6 fade-in-up stagger-1">
        <p className="text-[9px] uppercase tracking-[0.14em] text-ink-400 font-bold mb-6">
          {t("voice_input")}
        </p>
        <VoiceRecorder />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-ink-100/60" />
        <span className="text-[9px] uppercase tracking-[0.14em] text-ink-300 font-bold">
          {t("or_type")}
        </span>
        <div className="flex-1 h-px bg-ink-100/60" />
      </div>

      {/* Text */}
      <div className="fade-in-up stagger-2">
        <TextQuery onResult={setTextResult} />
      </div>

      {textResult && (
        <div className="mt-5 fade-in-up">
          <ResultCard result={textResult} onReset={() => setTextResult(null)} />
        </div>
      )}

    </div>
  );
}
