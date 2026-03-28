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

export default function BottomNav({ tabs }: { tabs: readonly Tab[] }) {
  const pathname = usePathname();
  const activeIdx = tabs.findIndex((t) => t.href === pathname);

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 inset-x-0 z-30 sm:hidden bg-sand-bg/95 backdrop-blur-md"
    >
      {/* Top sliding bar */}
      <div className="relative h-[3px] mx-4">
        <span
          className="absolute top-0 h-full rounded-full bg-forest-900 transition-all duration-300 ease-[cubic-bezier(.4,0,.2,1)]"
          style={{
            width: `${100 / tabs.length}%`,
            left: `${(activeIdx >= 0 ? activeIdx : 0) * (100 / tabs.length)}%`,
          }}
        />
      </div>

      <div className="flex items-stretch max-w-md mx-auto">
        {tabs.map(({ href, label }) => {
          const active = pathname === href;
          const Icon = ICON_MAP[href as keyof typeof ICON_MAP] ?? Home;

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={[
                "flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5",
                "text-[9px] font-bold uppercase tracking-[0.08em]",
                "transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-forest-800/40",
                active ? "text-ink-900" : "text-ink-300",
              ].join(" ")}
            >
              <span
                className={[
                  "flex items-center justify-center w-10 h-7 rounded-2xl transition-all duration-250",
                  active ? "bg-sage-100" : "",
                ].join(" ")}
              >
                <Icon
                  className={[
                    "transition-all duration-250",
                    active ? "w-[18px] h-[18px]" : "w-4 h-4",
                  ].join(" ")}
                  strokeWidth={active ? 2.4 : 1.6}
                />
              </span>
              <span className={active ? "opacity-100" : "opacity-60"}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
