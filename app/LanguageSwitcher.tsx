"use client";

import { useEffect, useState } from "react";

const SUPPORTED_LOCALES = ["en", "ru", "ukr"] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function getInitialLocale(): SupportedLocale {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(
    "locale"
  ) as SupportedLocale | null;
  if (stored && SUPPORTED_LOCALES.includes(stored)) return stored;
  return "en";
}

export default function LanguageSwitcher() {
  const [locale, setLocale] = useState<SupportedLocale>("en");

  useEffect(() => {
    const initial = getInitialLocale();
    setLocale(initial);
    if (typeof document !== "undefined") {
      document.documentElement.lang = initial;
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("locale", locale);
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-black/[.08] dark:border-white/[.14] p-1 text-xs">
      {SUPPORTED_LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={`px-2 py-1 rounded-full transition-colors ${
            locale === code
              ? "bg-foreground text-background"
              : "hover:bg-black/[.05] dark:hover:bg-white/[.08]"
          }`}
          aria-pressed={locale === code}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
