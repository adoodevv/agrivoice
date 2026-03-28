"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import {
  LanguageProvider,
  UI_LANGUAGES,
  ASR_LANGUAGES,
  useLanguage,
  type AsrLang,
} from "../context/LanguageContext";
import BottomNav from "./BottomNav";

const NAV_TABS = [
  { href: "/",       label: "Home"   },
  { href: "/market", label: "Prices" },
  { href: "/list",   label: "Sell"   },
  { href: "/advice", label: "Advice" },
] as const;

function ShellInner({ children }: { children: ReactNode }) {
  const { uiLanguage, setUiLanguage, speechLanguage, setSpeechLanguage, t } =
    useLanguage();
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-sand-bg text-ink-900 flex flex-col">

      <header className="sticky top-0 z-20 bg-sand-bg/95 backdrop-blur-md border-b border-ink-100">
        <div className="flex flex-col gap-3 px-4 py-3 max-w-5xl mx-auto w-full sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-3.5">

          <Link href="/" className="flex flex-col shrink-0 group">
            <span className="text-lg font-black tracking-[0.18em] text-ink-900 leading-none group-hover:text-forest-800 transition-colors">
              AGRIVOICE
            </span>
            <span className="text-[8px] font-semibold tracking-[0.22em] text-ink-500 uppercase mt-0.5 hidden sm:block">
              SPEAK. SELL. GROW.
            </span>
          </Link>

          <nav className="hidden sm:flex items-center gap-7" aria-label="Main navigation">
            {NAV_TABS.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "text-sm font-medium pb-0.5 transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-800/40 rounded-sm",
                    active
                      ? "text-ink-900 border-b-2 border-ink-900"
                      : "text-ink-500 hover:text-ink-700",
                  ].join(" ")}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-end shrink-0">
            <span className="hidden lg:block text-[10px] font-semibold tracking-[0.2em] text-ink-400 uppercase mr-1">
              SPEAK. SELL. GROW.
            </span>

            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-600">
              <span className="hidden sm:inline whitespace-nowrap">{t("speak_language")}</span>
              <select
                value={speechLanguage}
                onChange={(e) => setSpeechLanguage(e.target.value as AsrLang)}
                aria-label={t("speak_language")}
                className="rounded-lg border border-ink-200 bg-sand-50 px-2 py-1.5 text-[11px] font-semibold text-ink-900 max-w-[9.5rem] sm:max-w-none focus:outline-none focus:ring-2 focus:ring-forest-900/30"
              >
                {ASR_LANGUAGES.map(({ code, label }) => (
                  <option key={code} value={code}>
                    {label} ({code})
                  </option>
                ))}
              </select>
            </label>

            <div
              role="group"
              aria-label={t("ui_language")}
              className="flex rounded-full border border-ink-200 bg-sand-50 p-0.5"
            >
              {UI_LANGUAGES.map(({ code, label }) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setUiLanguage(code)}
                  aria-pressed={uiLanguage === code}
                  className={[
                    "px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold transition-all duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-800/40",
                    uiLanguage === code
                      ? "bg-forest-900 text-sand-50 shadow-sm"
                      : "text-ink-500 hover:text-ink-700",
                  ].join(" ")}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </header>

      <main className="flex-1 pb-20 sm:pb-0">
        {children}
      </main>

      <BottomNav tabs={NAV_TABS} />

      <footer className="hidden sm:block bg-forest-900 text-sand-50/60 py-5 px-6 text-center text-[11px] tracking-wide">
        Built for{" "}
        <span className="text-sand-50/80 font-semibold">Cursor</span>
        {" "}×{" "}
        <span className="text-sand-50/80 font-semibold">GhanaNLP</span>
        {" "}Hackathon — Moving Ghana Forward
      </footer>

    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <ShellInner>{children}</ShellInner>
    </LanguageProvider>
  );
}
