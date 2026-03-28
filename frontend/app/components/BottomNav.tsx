"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, Home, Leaf, PackagePlus } from "lucide-react";

const ICON_MAP = {
  "/":       Home,
  "/market": BarChart2,
  "/list":   PackagePlus,
  "/advice": Leaf,
} as const;

interface Tab {
  href: string;
  label: string;
}

interface BottomNavProps {
  tabs: readonly Tab[];
}

export default function BottomNav({ tabs }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 inset-x-0 z-30 sm:hidden bg-sand-bg/97 backdrop-blur-md border-t border-ink-100"
    >
      <div className="flex items-stretch max-w-2xl mx-auto">
        {tabs.map(({ href, label }) => {
          const active = pathname === href;
          const Icon = ICON_MAP[href as keyof typeof ICON_MAP] ?? Home;

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={[
                "flex flex-1 flex-col items-center justify-center gap-1 py-2.5",
                "text-[9px] font-bold uppercase tracking-widest",
                "transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-forest-800/40",
                active ? "text-ink-900" : "text-ink-300 hover:text-ink-500",
              ].join(" ")}
            >
              <span
                className={[
                  "flex items-center justify-center w-9 h-5 rounded-full transition-all duration-200",
                  active ? "bg-ink-900/8" : "",
                ].join(" ")}
              >
                <Icon
                  className={`w-4 h-4 transition-all duration-200 ${active ? "scale-110" : ""}`}
                  strokeWidth={active ? 2.5 : 1.8}
                />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
