"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Mic, PackagePlus } from "lucide-react";
import VoiceRecorder, { ResultCard, VoiceApiResponse, humaniseError } from "../components/VoiceRecorder";
import { API_URL } from "../lib/api";
import { useLanguage } from "../context/LanguageContext";

/* ------------------------------------------------------------------
   Types
------------------------------------------------------------------ */

type Tab    = "voice" | "form";
type FormStatus = "idle" | "submitting" | "success" | "error";

const CROPS   = ["Maize", "Yam", "Tomatoes", "Cassava", "Plantain", "Cocoa", "Rice"] as const;
const REGIONS = ["Accra", "Kumasi", "Tamale", "Takoradi", "Cape Coast", "Koforidua"] as const;

const UNITS_BY_CROP: Record<string, string[]> = {
  Maize:    ["bags", "kg", "tonnes"],
  Yam:      ["tubers", "bags", "tonnes"],
  Tomatoes: ["crates", "kg", "boxes"],
  Cassava:  ["bags", "kg", "tonnes"],
  Plantain: ["bunches", "boxes", "kg"],
  Cocoa:    ["bags", "kg", "tonnes"],
  Rice:     ["bags", "kg", "tonnes"],
};

/* ------------------------------------------------------------------
   Component
------------------------------------------------------------------ */

export default function ListPage() {
  const { t, speechLanguage } = useLanguage();
  const [tab,        setTab]        = useState<Tab>("voice");
  const [crop,       setCrop]       = useState(CROPS[0] as string);
  const [quantity,   setQuantity]   = useState("");
  const [unit,       setUnit]       = useState(UNITS_BY_CROP[CROPS[0]][0]);
  const [region,     setRegion]     = useState(REGIONS[0] as string);
  const [phone,      setPhone]      = useState("");
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");
  const [formResult, setFormResult] = useState<VoiceApiResponse | null>(null);
  const [formError,  setFormError]  = useState<string | null>(null);

  function handleCropChange(c: string) {
    setCrop(c);
    const units = UNITS_BY_CROP[c] ?? ["kg"];
    setUnit(units[0]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!quantity || Number(quantity) <= 0) return;

    const query = `I want to sell ${quantity} ${unit} of ${crop.toLowerCase()} in ${region}.`;
    setFormStatus("submitting");
    setFormError(null);

    try {
      const res  = await fetch(`${API_URL}/api/voice/text`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text: query, language: speechLanguage }),
      });
      const data = await res.json() as VoiceApiResponse;
      if (!res.ok) throw new Error((data as unknown as { detail?: string }).detail ?? `${res.status}`);
      setFormResult(data);
      setFormStatus("success");
    } catch (err) {
      setFormError(humaniseError(err));
      setFormStatus("error");
    }
  }

  function resetForm() {
    setFormStatus("idle");
    setFormResult(null);
    setFormError(null);
  }

  return (
    <div className="px-4 pt-7 pb-6 max-w-lg mx-auto w-full">

      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <PackagePlus className="w-4.5 h-4.5 text-ink-900" strokeWidth={2} />
          <h2 className="text-xl font-bold text-ink-900">{t("list_title")}</h2>
        </div>
        <p className="text-xs text-ink-500">{t("list_subtitle")}</p>
      </div>

      {/* Tab switcher */}
      <div className="flex rounded-xl border border-ink-200 bg-sand-50 p-1 mb-6">
        {(["voice", "form"] as Tab[]).map((id) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={[
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-900/30",
              tab === id
                ? "bg-forest-900 text-sand-50 shadow"
                : "text-ink-500 hover:text-ink-700",
            ].join(" ")}
          >
            {id === "voice" ? <Mic className="w-3.5 h-3.5" /> : <PackagePlus className="w-3.5 h-3.5" />}
            {id === "voice" ? t("voice_input") : t("form_input")}
          </button>
        ))}
      </div>

      {/* Voice tab */}
      {tab === "voice" && (
        <div className="rounded-2xl border border-ink-100 bg-sage-100 px-5 py-8 flex flex-col items-center">
          <p className="text-xs text-ink-500 text-center mb-6">
            {t("list_voice_hint")}
          </p>
          <VoiceRecorder />
        </div>
      )}

      {/* Form tab */}
      {tab === "form" && (
        <div>
          {formStatus === "success" && formResult ? (
            <div className="rounded-2xl border border-forest-200 bg-forest-100/30 p-5 mb-4 text-center fade-in-up">
              <CheckCircle2 className="w-8 h-8 text-forest-700 mx-auto mb-2" />
              <p className="text-sm font-semibold text-ink-900 mb-4">{t("list_success")}</p>
              <ResultCard result={formResult} onReset={resetForm} />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Crop picker */}
              <div>
                <label className="block text-[11px] uppercase tracking-widest font-bold text-ink-500 mb-2">
                  {t("crop")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {CROPS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleCropChange(c)}
                      className={[
                        "px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-900/30",
                        crop === c
                          ? "bg-forest-900 text-sand-50 border-forest-900"
                          : "border-ink-200 bg-sand-50 text-ink-700 hover:border-ink-400",
                      ].join(" ")}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity + Unit */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-[11px] uppercase tracking-widest font-bold text-ink-500 mb-2">
                    {t("quantity")}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g. 50"
                    required
                    className="w-full rounded-xl border border-ink-200 bg-sand-50 px-4 py-2.5 text-sm text-ink-900 placeholder-ink-300 focus:outline-none focus:ring-2 focus:ring-forest-900/30 focus:border-transparent transition-all"
                  />
                </div>
                <div className="w-32">
                  <label className="block text-[11px] uppercase tracking-widest font-bold text-ink-500 mb-2">
                    {t("unit")}
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full rounded-xl border border-ink-200 bg-sand-50 px-3 py-2.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-forest-900/30 focus:border-transparent transition-all"
                  >
                    {(UNITS_BY_CROP[crop] ?? ["kg"]).map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Region */}
              <div>
                <label className="block text-[11px] uppercase tracking-widest font-bold text-ink-500 mb-2">
                  {t("region")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {REGIONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRegion(r)}
                      className={[
                        "px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-900/30",
                        region === r
                          ? "bg-forest-900 text-sand-50 border-forest-900"
                          : "border-ink-200 bg-sand-50 text-ink-700 hover:border-ink-400",
                      ].join(" ")}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-[11px] uppercase tracking-widest font-bold text-ink-500 mb-2">
                  {t("phone")}{" "}
                  <span className="text-ink-300 normal-case">{t("phone_optional")}</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+233 24 000 0000"
                  className="w-full rounded-xl border border-ink-200 bg-sand-50 px-4 py-2.5 text-sm text-ink-900 placeholder-ink-300 focus:outline-none focus:ring-2 focus:ring-forest-900/30 focus:border-transparent transition-all"
                />
              </div>

              {/* Error */}
              {formStatus === "error" && formError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={formStatus === "submitting" || !quantity}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-forest-900 text-sand-50 text-sm font-bold transition-all hover:bg-forest-800 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-900/40 shadow-sm"
              >
                {formStatus === "submitting" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <PackagePlus className="w-4 h-4" />
                )}
                {formStatus === "submitting" ? t("processing") : t("list_submit")}
              </button>
            </form>
          )}
        </div>
      )}

    </div>
  );
}
