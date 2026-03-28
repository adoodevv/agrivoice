"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, TrendingUp } from "lucide-react";
import { API_URL } from "../lib/api";
import { useLanguage } from "../context/LanguageContext";

/* ------------------------------------------------------------------
   Types
------------------------------------------------------------------ */

interface CityEntry  { price: number; unit: string; }
type CropPrices     = Record<string, CityEntry>;
type PricesPayload  = Record<string, CropPrices>;
type FetchState     = "loading" | "success" | "error";

/* ------------------------------------------------------------------
   Constants
------------------------------------------------------------------ */

const CITIES = ["accra", "kumasi", "tamale"] as const;
type City = (typeof CITIES)[number];

const CROP_LEFT_BORDER: Record<string, string> = {
  yam:      "border-l-amber-400",
  maize:    "border-l-yellow-500",
  tomato:   "border-l-red-400",
  cassava:  "border-l-orange-400",
  plantain: "border-l-lime-500",
};

/* ------------------------------------------------------------------
   Skeleton
------------------------------------------------------------------ */

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-ink-100 bg-sand-50 p-5">
      <div className="h-4 w-24 rounded skeleton mb-4" />
      {CITIES.map((c) => (
        <div key={c} className="flex justify-between items-center mb-2.5">
          <div className="h-3 w-16 rounded skeleton" />
          <div className="h-3 w-24 rounded skeleton" />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------
   Page
------------------------------------------------------------------ */

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
    <div className="px-4 pt-7 pb-6 max-w-2xl mx-auto w-full">

      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4.5 h-4.5 text-ink-900" strokeWidth={2} />
            <h2 className="text-xl font-bold text-ink-900">{t("market_title")}</h2>
          </div>
          <p className="text-xs text-ink-500">{t("market_subtitle")}</p>
        </div>

        <button
          onClick={fetchPrices}
          disabled={state === "loading"}
          aria-label={t("retry")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-ink-200 bg-sand-50 text-ink-700 hover:bg-sand-200 text-[11px] font-semibold transition-all disabled:opacity-40"
        >
          <RefreshCw className={`w-3 h-3 ${state === "loading" ? "animate-spin" : ""}`} strokeWidth={2.5} />
          {t("retry")}
        </button>
      </div>

      {/* City header row (desktop) */}
      {state === "success" && crops.length > 0 && (
        <div className="hidden sm:grid grid-cols-4 gap-2 mb-3 px-5">
          <div />
          {CITIES.map((city) => (
            <p key={city} className="text-[10px] uppercase tracking-widest text-ink-400 font-bold text-right">
              {city.charAt(0).toUpperCase() + city.slice(1)}
            </p>
          ))}
        </div>
      )}

      {/* Loading */}
      {state === "loading" && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Error */}
      {state === "error" && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center fade-in-up">
          <p className="text-sm text-red-700 mb-3">{t("market_error")}</p>
          <button
            onClick={fetchPrices}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-100 border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-200 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> {t("retry")}
          </button>
        </div>
      )}

      {/* Price cards */}
      {state === "success" && (
        <div className="space-y-3 fade-in-up">
          {crops.map(([crop, cityPrices]) => (
            <div
              key={crop}
              className={[
                "rounded-2xl border border-ink-100 border-l-4 bg-sand-50 p-5 shadow-sm",
                CROP_LEFT_BORDER[crop] ?? "border-l-forest-400",
              ].join(" ")}
            >
              <p className="text-sm font-bold text-ink-900 capitalize tracking-wide mb-4">
                {crop}
              </p>

              {/* Mobile: stacked rows */}
              <div className="space-y-2">
                {CITIES.map((city) => {
                  const entry = cityPrices[city as City];
                  if (!entry) return null;
                  return (
                    <div key={city} className="flex items-center justify-between">
                      <p className="text-xs text-ink-500 capitalize w-16 font-medium">{city}</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-bold text-ink-900">
                          GHS {entry.price.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-ink-400">/ {entry.unit}</span>
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
