"use client";

import Link from "next/link";
import { BarChart2, ArrowUpRight, PackagePlus, HelpCircle } from "lucide-react";
import VoiceRecorder from "./components/VoiceRecorder";
import { useLanguage } from "./context/LanguageContext";

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

const TAGS = ["VOICE FIRST", "GHANANLP CORE", "TWI & GA SUPPORT"] as const;

export default function Home() {
  const { t } = useLanguage();

  return (
    <div className="bg-sand-bg">

      {/* ── Hero mic section ─────────────────────────────────── */}
      <section className="flex flex-col items-center px-5 pt-8 sm:pt-12 pb-8">
        <div className="w-full max-w-lg rounded-[28px] bg-gradient-to-b from-sage-100 to-sage-100/50 px-6 pt-10 pb-9 flex flex-col items-center gap-5 shadow-[0_2px_16px_rgba(13,38,24,0.05)] scale-in">
          <VoiceRecorder />

          <div className="text-center space-y-1.5 mt-1">
            <p className="text-[15px] font-bold text-ink-900 tracking-tight">
              {t("speak_now")}
            </p>
            <p className="text-xs text-ink-500 max-w-[280px] mx-auto leading-relaxed">
              Tell AgriVoice what you need in your local language —
              prices, listing, or advice.
            </p>
          </div>
        </div>
      </section>

      {/* ── Action cards ─────────────────────────────────────── */}
      <section className="px-4 pb-8 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {ACTIONS.map(({ href, icon: Icon, title, desc }, i) => (
            <Link
              key={href}
              href={href}
              className={`group card-lift flex flex-col rounded-2xl border border-ink-100/80 bg-sand-50 p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-900/40 fade-in-up stagger-${i + 1}`}
            >
              <div className="flex items-start justify-between mb-5">
                <div className="w-11 h-11 rounded-xl bg-forest-900 flex items-center justify-center shrink-0 shadow-sm group-hover:bg-forest-800 transition-colors duration-200">
                  <Icon className="w-5 h-5 text-sand-50" strokeWidth={1.6} />
                </div>
                <ArrowUpRight
                  className="w-4 h-4 text-ink-200 group-hover:text-ink-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200"
                  strokeWidth={2}
                />
              </div>
              <p className="text-[13px] font-bold text-ink-900 leading-tight mb-1">{title}</p>
              <p className="text-[11px] text-ink-400 leading-relaxed">{desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Feature strip ────────────────────────────────────── */}
      <section className="mx-4 mb-8 max-w-5xl sm:mx-auto rounded-[28px] border border-ink-100/60 bg-sand-50 overflow-hidden fade-in-up stagger-4">
        <div className="flex flex-col sm:flex-row items-stretch">

          <div className="w-full sm:w-72 shrink-0 bg-gradient-to-br from-forest-900 to-forest-800 flex items-center justify-center py-14 sm:py-0 sm:rounded-l-[28px]">
            <div className="text-center px-6">
              <p className="text-5xl mb-3">🌾</p>
              <p className="text-sand-50/60 text-[11px] font-medium tracking-widest uppercase">
                Ghanaian Farmer
              </p>
            </div>
          </div>

          <div className="flex-1 p-7 sm:p-9 flex flex-col justify-center">
            <h2 className="text-xl sm:text-[22px] font-bold text-ink-900 leading-snug mb-3 tracking-tight">
              The Future of Ghanaian Agriculture is Vocal
            </h2>
            <p className="text-[13px] text-ink-500 leading-relaxed mb-6">
              AgriVoice uses advanced AI to understand local languages and dialects,
              ensuring that every farmer in Ghana has access to the digital economy,
              regardless of tech literacy or literacy levels.
            </p>
            <div className="flex flex-wrap gap-2">
              {TAGS.map((tag) => (
                <span
                  key={tag}
                  className="px-3.5 py-1.5 rounded-full border border-ink-100 bg-sage-100/60 text-ink-600 text-[9px] font-bold tracking-[0.12em] uppercase"
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
