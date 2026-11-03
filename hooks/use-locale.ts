"use client";

import { useEffect, useState } from "react";
import { LOCALE_EVENT, LOCALE_STORAGE_KEY, normalizeLocale, translations, type Locale } from "@/lib/i18n";

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>("az");

  useEffect(() => {
    const onChange = () => {
      const next = normalizeLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
      setLocaleState(next);
      document.documentElement.lang = next;
    };

    queueMicrotask(onChange);
    window.addEventListener(LOCALE_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(LOCALE_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  function setLocale(next: Locale) {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    setLocaleState(next);
    document.documentElement.lang = next;
    window.dispatchEvent(new Event(LOCALE_EVENT));
  }

  return {
    locale,
    setLocale,
    t: translations[locale],
  };
}
