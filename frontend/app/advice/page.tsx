"use client";

import { useState } from "react";
import { ArrowRight, Leaf, Loader2 } from "lucide-react";
import VoiceRecorder, { ResultCard, VoiceApiResponse, humaniseError } from "../components/VoiceRecorder";
import { API_URL } from "../lib/api";
import { useLanguage } from "../context/LanguageContext";

/* ------------------------------------------------------------------
   Text query sub-component
------------------------------------------------------------------ */

interface TextQueryProps {
  onResult: (r: VoiceApiResponse) => void;
}

function TextQuery({ onResult }: TextQueryProps) {
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
          className="w-full rounded-xl border border-ink-200 bg-sand-50 px-4 py-3 pr-12 text-sm text-ink-900 placeholder-ink-300 focus:outline-none focus:ring-2 focus:ring-forest-900/30 focus:border-transparent transition-all disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          aria-label="Send"
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg bg-forest-900 text-sand-50 hover:bg-forest-800 disabled:opacity-40 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-900/40"
        >
          {loading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
          }
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
          {error}
        </p>
      )}
    </form>
  );
}

/* ------------------------------------------------------------------
   Page
------------------------------------------------------------------ */

export default function AdvicePage() {
  const { t } = useLanguage();
  const [textResult, setTextResult] = useState<VoiceApiResponse | null>(null);

  return (
    <div className="px-4 pt-7 pb-6 max-w-lg mx-auto w-full">

      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Leaf className="w-4.5 h-4.5 text-ink-900" strokeWidth={2} />
          <h2 className="text-xl font-bold text-ink-900">{t("advice_title")}</h2>
        </div>
        <p className="text-xs text-ink-500">{t("advice_subtitle")}</p>
      </div>

      {/* Voice section */}
      <div className="rounded-2xl border border-ink-100 bg-sage-100 px-5 py-8 flex flex-col items-center mb-5">
        <p className="text-[10px] uppercase tracking-widest text-ink-500 font-bold mb-6">
          {t("voice_input")}
        </p>
        <VoiceRecorder />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-ink-100" />
        <span className="text-[10px] uppercase tracking-widest text-ink-400 font-semibold">
          {t("or_type")}
        </span>
        <div className="flex-1 h-px bg-ink-100" />
      </div>

      {/* Text query */}
      <TextQuery onResult={(r) => { setTextResult(r); }} />

      {/* Text result */}
      {textResult && (
        <div className="mt-5">
          <ResultCard result={textResult} onReset={() => setTextResult(null)} />
        </div>
      )}

    </div>
  );
}
