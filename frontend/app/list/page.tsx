"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Mic, PackagePlus } from "lucide-react";
import VoiceRecorder, { ResultCard, VoiceApiResponse, humaniseError } from "../components/VoiceRecorder";
import { API_URL } from "../lib/api";
import { useLanguage } from "../context/LanguageContext";

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
    setUnit((UNITS_BY_CROP[c] ?? ["kg"])[0]);
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
    <div className="px-4 pt-8 pb-8 max-w-lg mx-auto w-full">

      <div className="mb-7 fade-in-up">
        <div className="flex items-center gap-2 mb-1">
          <PackagePlus className="w-[18px] h-[18px] text-ink-900" strokeWidth={2.2} />
          <h2 className="text-xl font-bold text-ink-900 tracking-tight">{t("list_title")}</h2>
        </div>
        <p className="text-[11px] text-ink-400 mt-0.5">{t("list_subtitle")}</p>
      </div>

      {/* Tab switcher */}
      <div className="relative flex rounded-xl border border-ink-200/80 bg-sand-50 p-1 mb-6 fade-in-up stagger-1">
        <span
          className="absolute top-1 bottom-1 rounded-lg bg-forest-900 shadow transition-all duration-300 ease-[cubic-bezier(.4,0,.2,1)]"
          style={{
            width: "calc(50% - 4px)",
            left: tab === "voice" ? "4px" : "calc(50% + 0px)",
          }}
        />
        {(["voice", "form"] as Tab[]).map((id) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={[
              "relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-900/30",
              tab === id ? "text-sand-50" : "text-ink-400 hover:text-ink-700",
            ].join(" ")}
          >
            {id === "voice" ? <Mic className="w-3.5 h-3.5" /> : <PackagePlus className="w-3.5 h-3.5" />}
            {id === "voice" ? t("voice_input") : t("form_input")}
          </button>
        ))}
      </div>

      {/* Voice tab */}
      {tab === "voice" && (
        <div className="rounded-[22px] border border-ink-100/60 bg-gradient-to-b from-sage-100 to-sage-100/40 px-5 py-8 flex flex-col items-center scale-in">
          <p className="text-xs text-ink-400 text-center mb-6 font-medium">
            {t("list_voice_hint")}
          </p>
          <VoiceRecorder />
        </div>
      )}

      {/* Form tab */}
      {tab === "form" && (
        <div className="scale-in">
          {formStatus === "success" && formResult ? (
            <div className="rounded-2xl border border-forest-200/60 bg-forest-100/20 p-5 mb-4 text-center scale-in">
              <CheckCircle2 className="w-8 h-8 text-forest-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-ink-900 mb-4">{t("list_success")}</p>
              <ResultCard result={formResult} onReset={resetForm} />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Crop */}
              <div>
                <label className="block text-[10px] uppercase tracking-[0.12em] font-bold text-ink-400 mb-2.5">
                  {t("crop")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {CROPS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleCropChange(c)}
                      className={[
                        "px-3.5 py-1.5 rounded-full text-[11px] font-bold border transition-all duration-150",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-900/30",
                        crop === c
                          ? "bg-forest-900 text-sand-50 border-forest-900 shadow-sm"
                          : "border-ink-200/80 bg-sand-50 text-ink-600 hover:border-ink-400 hover:text-ink-800",
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
                  <label className="block text-[10px] uppercase tracking-[0.12em] font-bold text-ink-400 mb-2">
                    {t("quantity")}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g. 50"
                    required
                    className="w-full rounded-xl border border-ink-200/80 bg-sand-50 px-4 py-2.5 text-sm text-ink-900 placeholder-ink-300 focus:outline-none focus:ring-2 focus:ring-forest-900/25 focus:border-transparent transition-all"
                  />
                </div>
                <div className="w-32">
                  <label className="block text-[10px] uppercase tracking-[0.12em] font-bold text-ink-400 mb-2">
                    {t("unit")}
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full rounded-xl border border-ink-200/80 bg-sand-50 px-3 py-2.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-forest-900/25 focus:border-transparent transition-all"
                  >
                    {(UNITS_BY_CROP[crop] ?? ["kg"]).map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Region */}
              <div>
                <label className="block text-[10px] uppercase tracking-[0.12em] font-bold text-ink-400 mb-2.5">
                  {t("region")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {REGIONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRegion(r)}
                      className={[
                        "px-3.5 py-1.5 rounded-full text-[11px] font-bold border transition-all duration-150",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-900/30",
                        region === r
                          ? "bg-forest-900 text-sand-50 border-forest-900 shadow-sm"
                          : "border-ink-200/80 bg-sand-50 text-ink-600 hover:border-ink-400 hover:text-ink-800",
                      ].join(" ")}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-[10px] uppercase tracking-[0.12em] font-bold text-ink-400 mb-2">
                  {t("phone")}{" "}
                  <span className="text-ink-300 normal-case font-semibold">{t("phone_optional")}</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+233 24 000 0000"
                  className="w-full rounded-xl border border-ink-200/80 bg-sand-50 px-4 py-2.5 text-sm text-ink-900 placeholder-ink-300 focus:outline-none focus:ring-2 focus:ring-forest-900/25 focus:border-transparent transition-all"
                />
              </div>

              {formStatus === "error" && formError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200/80 rounded-xl px-4 py-3">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={formStatus === "submitting" || !quantity}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-forest-900 text-sand-50 text-sm font-bold transition-all hover:bg-forest-800 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-900/40 shadow-sm"
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
