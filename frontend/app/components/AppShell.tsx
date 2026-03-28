"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useLayoutEffect, useState, useCallback, type ReactNode } from "react";
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

/* ------------------------------------------------------------------
   Sliding nav indicator
------------------------------------------------------------------ */

function NavBar() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const [bar, setBar] = useState({ left: 0, width: 0 });

  const measure = useCallback(() => {
    if (!navRef.current) return;
    const activeEl = navRef.current.querySelector<HTMLElement>("[data-active='true']");
    if (!activeEl) return;
    const navRect = navRef.current.getBoundingClientRect();
    const linkRect = activeEl.getBoundingClientRect();
    setBar({
      left: linkRect.left - navRect.left,
      width: linkRect.width,
    });
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [pathname, measure]);

  return (
    <nav
      ref={navRef}
      className="hidden sm:flex items-center gap-7 relative"
      aria-label="Main navigation"
    >
      {NAV_TABS.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            data-active={active}
            aria-current={active ? "page" : undefined}
            className={[
              "relative text-sm font-medium py-1 transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-800/40 rounded-sm",
              active ? "text-ink-900" : "text-ink-400 hover:text-ink-700",
            ].join(" ")}
          >
            {label}
          </Link>
        );
      })}

      {/* Sliding bar */}
      <span
        className="absolute -bottom-3.5 h-[3px] rounded-full bg-forest-900 transition-all duration-300 ease-[cubic-bezier(.4,0,.2,1)]"
        style={{ left: bar.left, width: bar.width }}
      />
    </nav>
  );
}

/* ------------------------------------------------------------------
   Shell inner (lives inside LanguageProvider)
------------------------------------------------------------------ */

function ShellInner({ children }: { children: ReactNode }) {
  const { uiLanguage, setUiLanguage, speechLanguage, setSpeechLanguage, t } =
    useLanguage();

  return (
    <div className="min-h-screen bg-sand-bg text-ink-900 flex flex-col">

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-sand-bg/95 backdrop-blur-md border-b border-ink-100/70">
        <div className="flex items-center justify-between px-4 py-3 max-w-6xl mx-auto w-full sm:px-6 sm:py-3.5">

          {/* Logo */}
          <Link href="/" className="flex flex-col shrink-0 group">
            <span className="text-lg font-black tracking-[0.16em] text-ink-900 leading-none group-hover:text-forest-700 transition-colors duration-200">
              AGRIVOICE
            </span>
            <span className="text-[7px] font-bold tracking-[0.25em] text-ink-400 uppercase mt-0.5 hidden sm:block">
              SPEAK. SELL. GROW.
            </span>
          </Link>

          {/* Desktop nav with slider */}
          <NavBar />

          {/* Controls */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Speech language dropdown */}
            <select
              value={speechLanguage}
              onChange={(e) => setSpeechLanguage(e.target.value as AsrLang)}
              aria-label={t("speak_language")}
              className="rounded-lg border border-ink-200/80 bg-sand-50 pl-2.5 pr-6 py-1.5 text-[11px] font-semibold text-ink-900 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2210%22%20height%3D%226%22%3E%3Cpath%20d%3D%22M0%200l5%206%205-6z%22%20fill%3D%22%234e7062%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_6px] bg-[right_8px_center] bg-no-repeat focus:outline-none focus:ring-2 focus:ring-forest-900/25 transition-all cursor-pointer"
            >
              {ASR_LANGUAGES.map(({ code, label }) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>

            {/* UI language pill toggle */}
            <div
              role="group"
              aria-label={t("ui_language")}
              className="flex rounded-full border border-ink-200/80 bg-sand-50 p-[3px]"
            >
              {UI_LANGUAGES.map(({ code, label }) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setUiLanguage(code)}
                  aria-pressed={uiLanguage === code}
                  className={[
                    "px-2.5 py-[5px] rounded-full text-[10px] font-bold tracking-wide transition-all duration-250",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-800/40",
                    uiLanguage === code
                      ? "bg-forest-900 text-sand-50 shadow-[0_1px_4px_rgba(0,0,0,0.15)]"
                      : "text-ink-400 hover:text-ink-700",
                  ].join(" ")}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </header>

      {/* ── Page content ──────────────────────────────────────── */}
      <main className="flex-1 pb-20 sm:pb-0">
        {children}
      </main>

      {/* ── Mobile bottom nav ─────────────────────────────────── */}
      <BottomNav tabs={NAV_TABS} />

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="hidden sm:block bg-forest-900 text-sand-50/50 py-5 px-6 text-center text-[10px] tracking-[0.15em] uppercase">
        Built for{" "}
        <span className="text-sand-50/75 font-semibold">Cursor</span>
        {" "}&times;{" "}
        <span className="text-sand-50/75 font-semibold">GhanaNLP</span>
        {" "}Hackathon &mdash; Moving Ghana Forward
      </footer>

    </div>
  );
}

/* ------------------------------------------------------------------
   Exported shell
------------------------------------------------------------------ */

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <ShellInner>{children}</ShellInner>
    </LanguageProvider>
  );
}
