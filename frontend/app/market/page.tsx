"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, TrendingUp } from "lucide-react";
import { API_URL } from "../lib/api";
import { useLanguage } from "../context/LanguageContext";

interface CityEntry  { price: number; unit: string; }
type CropPrices     = Record<string, CityEntry>;
type PricesPayload  = Record<string, CropPrices>;
type FetchState     = "loading" | "success" | "error";

const CITIES = ["accra", "kumasi", "tamale"] as const;
type City = (typeof CITIES)[number];

const CROP_ACCENT: Record<string, string> = {
  cocoa:          "border-l-amber-800",
  "shea butter":  "border-l-amber-300",
  cashew:         "border-l-orange-400",
  "palm oil":     "border-l-red-500",
  maize:          "border-l-yellow-500",
  yam:            "border-l-amber-500",
  cassava:        "border-l-orange-300",
  groundnut:      "border-l-yellow-700",
  plantain:       "border-l-lime-500",
  rice:           "border-l-stone-400",
};

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-ink-100/60 bg-sand-50 p-5">
      <div className="h-4 w-20 rounded-md skeleton mb-5" />
      {CITIES.map((c) => (
        <div key={c} className="flex justify-between items-center mb-3 last:mb-0">
          <div className="h-3 w-14 rounded skeleton" />
          <div className="h-3 w-28 rounded skeleton" />
        </div>
      ))}
    </div>
  );
}

export default function MarketPage() {
  const { t } = useLanguage();
  const [state, setState]   = useState<FetchState>("loading");
  const [prices, setPrices] = useState<PricesPayload>({});

  const fetchPrices = useCallback(async () => {
    setState("loading");
    try {
      const res  = await fetch(`${API_URL}/api/market/prices`);
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json() as { prices: PricesPayload };
      setPrices(json.prices);
      setState("success");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => { fetchPrices(); }, [fetchPrices]);

  const crops = Object.entries(prices);

  return (
    <div className="px-4 pt-8 pb-8 max-w-2xl mx-auto w-full">

      <div className="flex items-start justify-between mb-7 fade-in-up">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-[18px] h-[18px] text-ink-900" strokeWidth={2.2} />
            <h2 className="text-xl font-bold text-ink-900 tracking-tight">{t("market_title")}</h2>
          </div>
          <p className="text-[11px] text-ink-400 mt-0.5">{t("market_subtitle")}</p>
        </div>

        <button
          onClick={fetchPrices}
          disabled={state === "loading"}
          aria-label={t("retry")}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-ink-200/80 bg-sand-50 text-ink-600 hover:bg-sand-200 text-[11px] font-bold transition-all disabled:opacity-30"
        >
          <RefreshCw className={`w-3 h-3 ${state === "loading" ? "animate-spin" : ""}`} strokeWidth={2.5} />
          {t("retry")}
        </button>
      </div>

      {state === "loading" && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {state === "error" && (
        <div className="rounded-2xl border border-red-200/80 bg-red-50 p-6 text-center scale-in">
          <p className="text-sm text-red-700 mb-3">{t("market_error")}</p>
          <button
            onClick={fetchPrices}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-100 border border-red-200 text-red-700 text-xs font-bold hover:bg-red-200 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> {t("retry")}
          </button>
        </div>
      )}

      {state === "success" && (
        <div className="space-y-3">
          {crops.map(([crop, cityPrices], i) => (
            <div
              key={crop}
              className={[
                `rounded-2xl border border-ink-100/60 border-l-4 bg-sand-50 p-5 card-lift fade-in-up stagger-${Math.min(i + 1, 4)}`,
                CROP_ACCENT[crop] ?? "border-l-forest-400",
              ].join(" ")}
            >
              <p className="text-[13px] font-bold text-ink-900 capitalize tracking-wide mb-4">
                {crop}
              </p>

              <div className="space-y-2.5">
                {CITIES.map((city) => {
                  const entry = cityPrices[city as City];
                  if (!entry) return null;
                  return (
                    <div key={city} className="flex items-center justify-between">
                      <p className="text-[11px] text-ink-400 capitalize w-16 font-semibold">{city}</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-[13px] font-bold text-ink-900 tabular-nums">
                          GHS {entry.price.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-ink-300 font-medium">/ {entry.unit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
