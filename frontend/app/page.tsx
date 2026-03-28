"use client";

import Link from "next/link";
import { BarChart2, ArrowUpRight, PackagePlus, HelpCircle } from "lucide-react";
import VoiceRecorder from "./components/VoiceRecorder";
import { useLanguage } from "./context/LanguageContext";

/* ------------------------------------------------------------------
   Action cards data
------------------------------------------------------------------ */

const ACTIONS = [
  {
    href:  "/market",
    icon:  BarChart2,
    title: "Check Market Prices",
    desc:  "Instantly hear current prices for maize, cocoa, and more in local markets.",
  },
  {
    href:  "/list",
    icon:  PackagePlus,
    title: "List My Produce",
    desc:  "Speak to list your harvest for sale. We'll connect you with top buyers.",
  },
  {
    href:  "/advice",
    icon:  HelpCircle,
    title: "Get Farming Advice",
    desc:  "Ask questions about soil health, pest control, or weather forecasts.",
  },
] as const;

/* ------------------------------------------------------------------
   Feature tags
------------------------------------------------------------------ */

const TAGS = ["VOICE FIRST", "GHANANLP CORE", "TWI & GA SUPPORT"] as const;

/* ------------------------------------------------------------------
   Page
------------------------------------------------------------------ */

export default function Home() {
  const { t } = useLanguage();

  return (
    <div className="bg-sand-bg min-h-screen">

      {/* ── Mic hero ─────────────────────────────────────────────── */}
      <section className="flex flex-col items-center px-5 pt-10 pb-6">
        {/* Sage container card */}
        <div className="w-full max-w-lg rounded-3xl bg-sage-100 px-6 pt-10 pb-8 flex flex-col items-center gap-5 shadow-sm">
          <VoiceRecorder />

          {/* Sub-text below the recorder */}
          <div className="text-center space-y-1 mt-1">
            <p className="text-sm font-semibold text-ink-900">
              {t("speak_now")}
            </p>
            <p className="text-xs text-ink-500 max-w-xs leading-relaxed">
              Tell AgriVoice what you need in your local language —
              prices, listing, or advice.
            </p>
          </div>
        </div>
      </section>

      {/* ── Action cards ─────────────────────────────────────────── */}
      <section className="px-4 pb-8 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {ACTIONS.map(({ href, icon: Icon, title, desc }) => (
            <Link
              key={href}
              href={href}
              className="group flex flex-col rounded-2xl border border-ink-200 bg-sand-50 p-5 hover:border-ink-900/40 hover:shadow-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-900/40"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-ink-900 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-sand-50" strokeWidth={1.8} />
                </div>
                <ArrowUpRight
                  className="w-4 h-4 text-ink-300 group-hover:text-ink-700 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200"
                  strokeWidth={2}
                />
              </div>
              <p className="text-sm font-bold text-ink-900 leading-tight mb-1.5">{title}</p>
              <p className="text-xs text-ink-500 leading-relaxed">{desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Feature strip ────────────────────────────────────────── */}
      <section className="mx-4 mb-6 max-w-5xl sm:mx-auto rounded-3xl border border-ink-100 bg-sand-50 overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center gap-0">

          {/* Image placeholder */}
          <div className="w-full sm:w-64 h-48 sm:h-auto shrink-0 bg-forest-800 flex items-center justify-center rounded-t-3xl sm:rounded-l-3xl sm:rounded-tr-none overflow-hidden">
            <div className="text-center px-6">
              <p className="text-4xl mb-2">🌾</p>
              <p className="text-sand-50/70 text-xs font-medium tracking-wide">
                Ghanaian Farmer
              </p>
            </div>
          </div>

          {/* Text content */}
          <div className="flex-1 p-7">
            <h2 className="text-xl font-bold text-ink-900 leading-snug mb-3">
              The Future of Ghanaian Agriculture is Vocal
            </h2>
            <p className="text-sm text-ink-500 leading-relaxed mb-5">
              AgriVoice uses advanced AI to understand local languages and dialects,
              ensuring that every farmer in Ghana has access to the digital economy,
              regardless of tech literacy or literacy levels.
            </p>
            <div className="flex flex-wrap gap-2">
              {TAGS.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full border border-ink-200 bg-sage-100 text-ink-700 text-[10px] font-bold tracking-widest uppercase"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
